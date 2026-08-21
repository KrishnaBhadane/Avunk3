// Supabase Edge Function: analyze-offer
// Full pipeline: Auth → Credit check → File download → Gemini AI → Save result → Return
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request body
    const { offer_id } = await req.json();
    if (!offer_id) {
      return new Response(JSON.stringify({ error: "offer_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Service role client for DB operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile || profile.role !== "student") {
      return new Response(JSON.stringify({ error: "Only students can analyze offers" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get the offer record
    const { data: offer } = await adminClient
      .from("internship_offers")
      .select("*, student_profiles!inner(profile_id)")
      .eq("id", offer_id)
      .single();

    if (!offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (offer.student_profiles.profile_id !== profile.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Consume 1 credit
    const { data: creditConsumed } = await adminClient.rpc("consume_credit", {
      p_user_profile_id: profile.id,
      p_feature: "offer_analysis",
    });

    if (!creditConsumed) {
      return new Response(JSON.stringify({ error: "Insufficient credits. You have 0 AI credits remaining." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Update status
    await adminClient.from("internship_offers").update({ analysis_status: "analyzing" }).eq("id", offer_id);

    // 8. Download file
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("offer-letters")
      .download(offer.file_path);

    if (downloadError || !fileData) {
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "offer_analysis" });
      await adminClient.from("internship_offers").update({ analysis_status: "failed" }).eq("id", offer_id);
      return new Response(JSON.stringify({ error: "Failed to download offer file. Credit refunded." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const offerText = await fileData.text();

    // 9. Call Gemini AI
    if (!GEMINI_API_KEY) {
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "offer_analysis" });
      await adminClient.from("internship_offers").update({ analysis_status: "failed" }).eq("id", offer_id);
      return new Response(JSON.stringify({ error: "AI service not configured. Credit refunded." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `
You are an expert internship verification intelligence engine for the platform AVUNK.
Analyze the following internship offer letter content extracted from file "${offer.file_name}":

"${offerText.slice(0, 4000)}"

CRITICAL RULES:
1. NEVER output binary labels like "FAKE" or "REAL".
2. Calculate a Risk Score from 0 (Safe) to 100 (Extremely High Risk).
3. Assign Risk Level: "Low" (0-35), "Medium" (36-69), or "High" (70-100).
4. Assign a Confidence Percentage (e.g. 75%).
5. List specific positive signals (e.g., clear scope, official domain, standard stipend).
6. List warning signals (e.g., fee requests, vague company address, personal email host).
7. List missing information (e.g., missing registration number, missing mentor name).
8. List inconsistencies (e.g., stipend unit mismatch, title/responsibility conflict).
9. Provide an objective action recommendation.
10. For sources checked, list public records or lookups. If unavailable, set status to "unavailable" and note "Source unavailable". NEVER invent fake evidence.

Respond strictly in valid JSON matching this schema:
{
  "company_name": "Extracted company name",
  "internship_role": "Role title",
  "risk_score": 45,
  "risk_level": "Medium",
  "confidence": 80,
  "positive_signals": ["Signal 1"],
  "warning_signals": ["Warning 1"],
  "missing_information": ["Missing 1"],
  "inconsistencies": [],
  "recommendation": "Recommendation text.",
  "sources": [
    { "name": "Domain Verification", "status": "verified", "date": "${new Date().toISOString().split("T")[0]}", "notes": "Domain found active." },
    { "name": "Business Registry", "status": "unavailable", "date": "${new Date().toISOString().split("T")[0]}", "notes": "Source unavailable" }
  ]
}
`;

    let analysis: any;
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      const geminiData = await geminiResponse.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      analysis = JSON.parse(cleanJson);
    } catch (aiErr) {
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "offer_analysis" });
      await adminClient.from("internship_offers").update({ analysis_status: "failed" }).eq("id", offer_id);
      return new Response(JSON.stringify({ error: "AI analysis failed. Your credit was not consumed." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Save analysis to DB
    const { data: savedAnalysis, error: saveError } = await adminClient
      .from("offer_analyses")
      .insert({
        offer_id: offer_id,
        student_id: offer.student_id,
        company_name: analysis.company_name || "Unknown Company",
        internship_role: analysis.internship_role || "Unknown Role",
        risk_score: Math.min(Math.max(analysis.risk_score || 50, 0), 100),
        risk_level: ["Low", "Medium", "High"].includes(analysis.risk_level) ? analysis.risk_level : "Medium",
        confidence: Math.min(Math.max(analysis.confidence || 50, 0), 100),
        positive_signals: analysis.positive_signals || [],
        warning_signals: analysis.warning_signals || [],
        missing_information: analysis.missing_information || [],
        inconsistencies: analysis.inconsistencies || [],
        recommendation: analysis.recommendation || "Exercise standard due diligence.",
        sources: analysis.sources || [],
        raw_ai_response: analysis,
      })
      .select()
      .single();

    if (saveError) {
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "offer_analysis" });
      await adminClient.from("internship_offers").update({ analysis_status: "failed" }).eq("id", offer_id);
      return new Response(JSON.stringify({ error: "Failed to save analysis. Credit refunded." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11. Mark offer as completed
    await adminClient.from("internship_offers").update({ analysis_status: "completed" }).eq("id", offer_id);

    // 12. Return saved analysis
    return new Response(JSON.stringify({
      analysis: {
        company_name: savedAnalysis.company_name,
        internship_role: savedAnalysis.internship_role,
        risk_score: savedAnalysis.risk_score,
        risk_level: savedAnalysis.risk_level,
        confidence: savedAnalysis.confidence,
        positive_signals: savedAnalysis.positive_signals,
        warning_signals: savedAnalysis.warning_signals,
        missing_information: savedAnalysis.missing_information,
        inconsistencies: savedAnalysis.inconsistencies,
        recommendation: savedAnalysis.recommendation,
        sources: savedAnalysis.sources,
      },
      analysis_id: savedAnalysis.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
