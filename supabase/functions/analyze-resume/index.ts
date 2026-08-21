// Supabase Edge Function: analyze-resume
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

    // Create an anon client to verify the user's JWT
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
    const { resume_id } = await req.json();
    if (!resume_id) {
      return new Response(JSON.stringify({ error: "resume_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Use service role client for DB operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Get the user's profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile || profile.role !== "student") {
      return new Response(JSON.stringify({ error: "Only students can analyze resumes" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get the resume record
    const { data: resume } = await adminClient
      .from("resumes")
      .select("*, student_profiles!inner(profile_id)")
      .eq("id", resume_id)
      .single();

    if (!resume) {
      return new Response(JSON.stringify({ error: "Resume not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (resume.student_profiles.profile_id !== profile.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Consume 1 credit (atomic)
    const { data: creditConsumed } = await adminClient.rpc("consume_credit", {
      p_user_profile_id: profile.id,
      p_feature: "resume_analysis",
    });

    if (!creditConsumed) {
      return new Response(JSON.stringify({ error: "Insufficient credits. You have 0 AI credits remaining." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Update analysis status
    await adminClient
      .from("resumes")
      .update({ analysis_status: "analyzing" })
      .eq("id", resume_id);

    // 8. Download the file from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("resumes")
      .download(resume.file_path);

    let resumeText = "";
    if (downloadError || !fileData) {
      // Refund credit on file download failure
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "resume_analysis" });
      await adminClient.from("resumes").update({ analysis_status: "failed" }).eq("id", resume_id);
      return new Response(JSON.stringify({ error: "Failed to download resume file. Credit refunded." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text from the file
    resumeText = await fileData.text();

    // Get student skills for context
    const { data: studentData } = await adminClient
      .from("student_profiles")
      .select("skills")
      .eq("id", resume.student_id)
      .single();
    const studentSkills = studentData?.skills || [];

    // 9. Call Gemini AI
    if (!GEMINI_API_KEY) {
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "resume_analysis" });
      await adminClient.from("resumes").update({ analysis_status: "failed" }).eq("id", resume_id);
      return new Response(JSON.stringify({ error: "AI service not configured. Credit refunded." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `
You are an expert ATS (Applicant Tracking System) and software engineering resume analyst for the platform AVUNK.
Analyze the following student resume text:

"${resumeText.slice(0, 4000)}"

Declared Student Skills: ${studentSkills.join(", ")}

Evaluate the resume and return STRICT JSON matching this exact schema:
{
  "score": 84,
  "skills_detected": ["React", "TypeScript", "Node.js"],
  "strengths": ["Clear project section", "Modern tech stack"],
  "weaknesses": ["Lack of quantifiable metrics"],
  "missing_skills": ["Docker", "SQL", "Testing"],
  "ats_feedback": "Resume text is readable by standard ATS parsers.",
  "role_recommendations": ["Frontend Engineer Intern", "Fullstack Intern"],
  "market_feedback": "Strong demand for React & TypeScript developers."
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
      // Refund credit on AI failure
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "resume_analysis" });
      await adminClient.from("resumes").update({ analysis_status: "failed" }).eq("id", resume_id);
      return new Response(JSON.stringify({ error: "AI analysis failed. Your credit was not consumed." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Save analysis to DB
    const { data: savedAnalysis, error: saveError } = await adminClient
      .from("resume_analyses")
      .insert({
        resume_id: resume_id,
        student_id: resume.student_id,
        score: analysis.score || 0,
        skills_detected: analysis.skills_detected || [],
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        missing_skills: analysis.missing_skills || [],
        ats_feedback: analysis.ats_feedback || "",
        role_recommendations: analysis.role_recommendations || [],
        market_feedback: analysis.market_feedback || "",
        ai_model: "gemini-1.5-flash",
        raw_ai_response: analysis,
      })
      .select()
      .single();

    if (saveError) {
      await adminClient.rpc("refund_credit", { p_user_profile_id: profile.id, p_feature: "resume_analysis" });
      await adminClient.from("resumes").update({ analysis_status: "failed" }).eq("id", resume_id);
      return new Response(JSON.stringify({ error: "Failed to save analysis. Credit refunded." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11. Mark resume as completed
    await adminClient.from("resumes").update({ analysis_status: "completed" }).eq("id", resume_id);

    // 12. Return the saved analysis
    return new Response(JSON.stringify({
      analysis: {
        score: savedAnalysis.score,
        skills_detected: savedAnalysis.skills_detected,
        strengths: savedAnalysis.strengths,
        weaknesses: savedAnalysis.weaknesses,
        missing_skills: savedAnalysis.missing_skills,
        ats_feedback: savedAnalysis.ats_feedback,
        role_recommendations: savedAnalysis.role_recommendations,
        market_feedback: savedAnalysis.market_feedback,
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
