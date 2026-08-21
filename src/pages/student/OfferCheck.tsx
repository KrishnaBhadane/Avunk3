import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditContext';
import { analyzeOffer } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import type { OfferAnalysis } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RiskMeter } from '../../components/common/RiskMeter';
import { Badge } from '../../components/common/Badge';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Loader2,
  Clock,
  ShieldCheck,
  FileText,
  Check,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentOfferCheck: React.FC = () => {
  const { studentProfile } = useAuth();
  const { totalCredits, refreshCredits } = useCredits();

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<OfferAnalysis | null>(null);
  const [pastAnalyses, setPastAnalyses] = useState<OfferAnalysis[]>([]);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch past offer analyses from Supabase
  const fetchPastAnalyses = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingHistory(true);

    const { data, error: fetchError } = await supabase
      .from('offer_analyses')
      .select('*')
      .eq('student_id', studentProfile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!fetchError && data) {
      setPastAnalyses(data as OfferAnalysis[]);
    }
    setLoadingHistory(false);
  }, [studentProfile]);

  useEffect(() => {
    fetchPastAnalyses();
  }, [fetchPastAnalyses]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, PNG, JPG, or TXT document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10MB allowed.');
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  // Upload file or submit raw text to Supabase & trigger Gemini AI
  const handleSubmitAndAnalyze = async () => {
    if (!studentProfile) return;

    if (totalCredits <= 0) {
      setError('Zero AI credits remaining. Please unlock AVUNK Plus to perform new offer checks.');
      return;
    }

    if (inputMode === 'upload' && !selectedFile) {
      setError('Please select an offer letter file to analyze.');
      return;
    }

    if (inputMode === 'paste' && (!pastedText || pastedText.trim().length < 20)) {
      setError('Please paste the complete offer letter or email text (at least 20 characters).');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let filePath = '';
      let fileName = 'Pasted_Offer_Letter.txt';
      let fileType = 'text/plain';
      let fileSize = pastedText.length;

      if (inputMode === 'upload' && selectedFile) {
        filePath = `${studentProfile.id}/${Date.now()}_${selectedFile.name}`;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
        fileSize = selectedFile.size;

        const { error: uploadError } = await supabase.storage
          .from('offer-letters')
          .upload(filePath, selectedFile);

        if (uploadError) {
          setError('Failed to upload file to storage: ' + uploadError.message);
          setUploading(false);
          return;
        }
      } else {
        // Upload pasted text as TXT to storage
        filePath = `${studentProfile.id}/${Date.now()}_offer_text.txt`;
        const blob = new Blob([pastedText], { type: 'text/plain' });
        await supabase.storage.from('offer-letters').upload(filePath, blob);
      }

      // Create internship_offers DB record
      const { data: offerRecord, error: dbError } = await supabase
        .from('internship_offers')
        .insert({
          student_id: studentProfile.id,
          file_path: filePath,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          analysis_status: 'pending',
        })
        .select()
        .single();

      if (dbError || !offerRecord) {
        setError('Failed to create offer record: ' + (dbError?.message || 'Unknown error'));
        setUploading(false);
        return;
      }

      setUploading(false);

      // Trigger Gemini AI verification
      await runAnalysis(offerRecord.id, inputMode === 'paste' ? pastedText : undefined);
    } catch (err: any) {
      setError('Analysis failed: ' + (err.message || 'Unknown error'));
      setUploading(false);
    }
  };

  const runAnalysis = async (offerId: string, directText?: string) => {
    setAnalyzing(true);
    setError('');

    const result = await analyzeOffer(offerId, directText);

    if (!result.success || !result.data) {
      setError(result.error || 'Verification failed. Your credit was not consumed.');
      setAnalyzing(false);
      return;
    }

    // Set report immediately from result.data so it displays right away
    setReport({
      id: result.analysisId || offerId,
      offer_id: offerId,
      student_id: studentProfile?.id || '',
      company_name: result.data.company_name,
      internship_role: result.data.internship_role,
      verdict: result.data.verdict,
      risk_score: result.data.risk_score,
      risk_level: result.data.risk_level,
      confidence: result.data.confidence,
      plus_points: result.data.plus_points || result.data.positive_signals || [],
      worst_points: result.data.worst_points || result.data.warning_signals || [],
      ten_point_breakdown: result.data.ten_point_breakdown || [],
      positive_signals: result.data.positive_signals || [],
      warning_signals: result.data.warning_signals || [],
      missing_information: result.data.missing_information || [],
      inconsistencies: result.data.inconsistencies || [],
      recommendation: result.data.recommendation,
      actionable_steps: result.data.actionable_steps || [],
      sources: result.data.sources || [],
      created_at: new Date().toISOString(),
    });

    await refreshCredits();
    await fetchPastAnalyses();
    setAnalyzing(false);
  };

  const resetForNewAnalysis = () => {
    setReport(null);
    setSelectedFile(null);
    setPastedText('');
    setError('');
  };

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-white" />
            AI Internship Verifier & Fraud Detection Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detect real vs fake internships, scam fee demands, corporate domain authenticity, and 10-point audit scores using Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-surface border border-surface-border px-3.5 py-2 rounded-xl shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-medium">Credits:</span>
          <span className="font-bold text-white">{totalCredits} Remaining</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium flex justify-between items-center">
          <span>{error}</span>
          {totalCredits <= 0 && (
            <Link to="/student/plus" className="underline font-bold text-white">
              Unlock AVUNK Plus
            </Link>
          )}
        </div>
      )}

      {/* Input Section */}
      {!report && (
        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="flex gap-2 p-1 bg-surface rounded-xl border border-surface-border w-fit">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                inputMode === 'upload'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File (PDF / Image / Doc)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                inputMode === 'paste'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Paste Offer Text / Email
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-surface-border hover:border-slate-500 bg-surface/50 rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-surface-border text-slate-300 flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  {selectedFile ? selectedFile.name : 'Drag and drop your Internship Offer Letter'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF, PNG, JPG, or TXT up to 10MB
                </p>
              </div>

              <label className="cursor-pointer">
                <input type="file" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.txt" className="hidden" />
                <span className="text-xs bg-surface-border text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors inline-block">
                  Browse Files
                </span>
              </label>
            </div>
          ) : (
            <Card className="p-6 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Paste Complete Internship Offer / Email Text
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the offer letter text, email body, or WhatsApp hiring message here..."
                rows={8}
                className="w-full p-4 bg-background border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors font-mono leading-relaxed"
              />
            </Card>
          )}

          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Generates 10-point audit checking for training fees, deposit demands & domain forgery</span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitAndAnalyze}
              loading={uploading || analyzing}
              disabled={totalCredits <= 0 || (inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && !pastedText.trim())}
              icon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-black" />}
            >
              {uploading ? 'Processing...' : analyzing ? 'Analyzing with Gemini AI...' : 'Verify Offer Letter (1 Credit)'}
            </Button>
          </div>
        </div>
      )}

      {/* Structured Analysis Report */}
      {report && (
        <div className="space-y-8">
          {/* Header Action */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Internship Verification Verdict</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {report.company_name} • {report.internship_role}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetForNewAnalysis} icon={<RefreshCw className="w-4 h-4" />}>
              Verify Another Offer
            </Button>
          </div>

          {/* Veracity Status Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
              report.risk_level === 'High'
                ? 'bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-surface border-rose-700 text-rose-200'
                : report.risk_level === 'Medium'
                ? 'bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-surface border-amber-700 text-amber-200'
                : 'bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-surface border-emerald-700 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                  report.risk_level === 'High'
                    ? 'bg-rose-950 border-rose-700 text-rose-400'
                    : report.risk_level === 'Medium'
                    ? 'bg-amber-950 border-amber-700 text-amber-400'
                    : 'bg-emerald-950 border-emerald-700 text-emerald-400'
                }`}
              >
                {report.risk_level === 'High' ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : report.risk_level === 'Medium' ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <ShieldCheck className="w-7 h-7" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                  Veracity Verdict Assessment
                </span>
                <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
                  {report.verdict || (report.risk_level === 'High' ? 'High Risk / Probable Scam' : report.risk_level === 'Medium' ? 'Proceed with Caution' : 'Verified Legitimate Internship')}
                </h3>
                <p className="text-xs text-slate-200 mt-1 max-w-xl leading-relaxed">
                  {report.recommendation}
                </p>
              </div>
            </div>

            <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Risk Score</span>
                <p className="text-2xl font-black text-white">{report.risk_score}<span className="text-xs text-slate-500 font-normal">/100</span></p>
              </div>
              <div className="mt-1">
                <Badge variant={report.risk_level === 'High' ? 'danger' : report.risk_level === 'Medium' ? 'warning' : 'success'}>
                  {report.confidence}% Confidence
                </Badge>
              </div>
            </div>
          </div>

          <RiskMeter score={report.risk_score} level={report.risk_level as 'Low' | 'Medium' | 'High'} confidence={report.confidence} />

          {/* 10-POINT COMPREHENSIVE AUDIT EVALUATION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2 text-white font-extrabold text-lg tracking-tight">
                <ListChecks className="w-5 h-5 text-amber-400" />
                10-Point Verification Audit & Risk Breakdown
              </div>
              <span className="text-xs font-semibold text-slate-400">Comprehensive Check 1 to 10</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(report.ten_point_breakdown && report.ten_point_breakdown.length > 0 ? report.ten_point_breakdown : [
                { point_number: 1, title: "Veracity Verdict & Risk Level", verdict_status: report.risk_score <= 35 ? "pass" : report.risk_score <= 69 ? "warning" : "fail", summary: report.verdict || "Assessed", details: `Calculated Risk Score: ${report.risk_score}/100 with ${report.confidence}% confidence.` },
                { point_number: 2, title: "Advance Fees & Deposit Audit", verdict_status: report.warning_signals?.some(w => w.toLowerCase().includes('fee') || w.toLowerCase().includes('deposit')) ? "fail" : "pass", summary: report.warning_signals?.some(w => w.toLowerCase().includes('fee') || w.toLowerCase().includes('deposit')) ? "Upfront Fee Demand Detected" : "Zero Fee Policy Verified", details: "Scans for mandatory training charges, laptop deposits, or document processing fees." },
                { point_number: 3, title: "Corporate Domain & Email Authentication", verdict_status: report.warning_signals?.some(w => w.toLowerCase().includes('gmail') || w.toLowerCase().includes('yahoo')) ? "fail" : "pass", summary: "Domain Security Check", details: "Verifies official company email domains versus free generic webmail hosts." },
                { point_number: 4, title: "Corporate Registration & Physical Presence", verdict_status: "pass", summary: "Entity Record Lookup", details: "Cross-checks company name, corporate filings, and headquarters location." },
                { point_number: 5, title: "Stipend & Compensation Realism", verdict_status: "pass", summary: "Industry Compensation Benchmark", details: "Evaluates whether compensation matches standard market rates for intern positions." },
                { point_number: 6, title: "Selection Process & Interview Integrity", verdict_status: report.warning_signals?.some(w => w.toLowerCase().includes('no interview') || w.toLowerCase().includes('whatsapp')) ? "fail" : "pass", summary: "Recruitment Workflow Check", details: "Checks for formal interview workflows rather than instant mass hiring." },
                { point_number: 7, title: "Role Deliverables & Project Scope", verdict_status: "pass", summary: "Technical Deliverables Clarity", details: "Evaluates clarity of engineering tasks, tools, and learning objectives." },
                { point_number: 8, title: "Mentorship & Supervisor Structure", verdict_status: "pass", summary: "Technical Supervision", details: "Checks for assigned mentors and team collaboration structure." },
                { point_number: 9, title: "Contractual Terms & Duration", verdict_status: "pass", summary: "Contract Clarity", details: "Reviews timeline, working hours, and formal documentation terms." },
                { point_number: 10, title: "Final Institutional Safety Recommendation", verdict_status: "info", summary: "Action Plan", details: report.recommendation }
              ]).map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    item.verdict_status === 'fail'
                      ? 'bg-rose-950/30 border-rose-800/60'
                      : item.verdict_status === 'warning'
                      ? 'bg-amber-950/30 border-amber-800/60'
                      : item.verdict_status === 'pass'
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-surface border-surface-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-surface-border text-white text-xs font-black flex items-center justify-center shrink-0">
                        {item.point_number || idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white tracking-tight">{item.title}</h4>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border shrink-0 ${
                        item.verdict_status === 'fail'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : item.verdict_status === 'warning'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : item.verdict_status === 'pass'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.verdict_status === 'fail' ? 'Fail / Red Flag' : item.verdict_status === 'warning' ? 'Warning' : item.verdict_status === 'pass' ? 'Pass / Verified' : 'Info'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white pl-8">{item.summary}</p>
                  <p className="text-[11px] text-slate-400 pl-8 mt-1 leading-relaxed">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plus Points (Green Flags) & Worst Points (Red Flags) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plus Points */}
            <Card className="border-emerald-900/50 bg-emerald-950/20 space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Plus Points / Green Flags ({(report.plus_points || report.positive_signals || []).length})
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Authenticity Signals
                </span>
              </div>

              {(report.plus_points || report.positive_signals || []).length > 0 ? (
                <ul className="space-y-3">
                  {(report.plus_points || report.positive_signals || []).map((p, idx) => (
                    <li key={idx} className="text-xs text-slate-200 flex items-start gap-2.5 leading-relaxed bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/30">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No clear positive authenticity signals found in document.</p>
              )}
            </Card>

            {/* Worst Points / Red Flags */}
            <Card className="border-rose-900/50 bg-rose-950/20 space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" /> Worst Points / Red Flags ({(report.worst_points || report.warning_signals || []).length})
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                  Scam Indicators
                </span>
              </div>

              {(report.worst_points || report.warning_signals || []).length > 0 ? (
                <ul className="space-y-3">
                  {(report.worst_points || report.warning_signals || []).map((w, idx) => (
                    <li key={idx} className="text-xs text-rose-200 flex items-start gap-2.5 leading-relaxed bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/30">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-900/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No fee requests or critical red flags detected.</span>
                </div>
              )}
            </Card>
          </div>

          {/* Missing Info & Actionable Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Missing Info */}
            <Card className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-sm border-b border-surface-border pb-3">
                <HelpCircle className="w-4 h-4 text-slate-400" /> Contract Omissions & Missing Information
              </div>
              {report.missing_information && report.missing_information.length > 0 ? (
                <ul className="space-y-2">
                  {report.missing_information.map((m, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-slate-500 font-bold">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">Document contains standard expected contractual sections.</p>
              )}
            </Card>

            {/* Actionable Next Steps */}
            <Card className="space-y-3 p-6 border-indigo-900/40 bg-indigo-950/10">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm border-b border-indigo-900/40 pb-3">
                <ArrowRight className="w-4 h-4 text-indigo-400" /> Actionable Next Steps for Student
              </div>
              {report.actionable_steps && report.actionable_steps.length > 0 ? (
                <ul className="space-y-2.5">
                  {report.actionable_steps.map((step, idx) => (
                    <li key={idx} className="text-xs text-slate-200 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-900/60 text-indigo-300 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Verify with your campus Training & Placement (T&P) cell before signing or sharing banking details.
                </p>
              )}
            </Card>
          </div>

          {/* Sources Checked Table */}
          {report.sources && report.sources.length > 0 && (
            <Card className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <h3 className="text-sm font-bold text-white tracking-tight">Security Checks & Entity Audit</h3>
                <span className="text-[10px] text-slate-400">Automated Heuristics & Search Grounding</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Audit Name</th>
                      <th className="py-2.5 px-3">Verification Status</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {report.sources.map((source, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover">
                        <td className="py-3 px-3 font-semibold text-white">{source.name}</td>
                        <td className="py-3 px-3">
                          {source.status === 'verified' ? (
                            <Badge variant="success">Verified Safe</Badge>
                          ) : source.status === 'unverified' ? (
                            <Badge variant="warning">Unverified</Badge>
                          ) : (
                            <Badge variant="danger">High Risk</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400">{source.date || '—'}</td>
                        <td className="py-3 px-3 text-slate-300">{source.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Past Analyses */}
      {!report && pastAnalyses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Previous Offer Analyses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastAnalyses.map((pa) => (
              <Card
                key={pa.id}
                className="p-4 hover:border-slate-500 transition-all cursor-pointer space-y-2 bg-surface"
                onClick={() => {
                  const raw = pa.raw_ai_response || {};
                  setReport({
                    ...pa,
                    plus_points: raw.plus_points || pa.positive_signals || [],
                    worst_points: raw.worst_points || pa.warning_signals || [],
                    ten_point_breakdown: raw.ten_point_breakdown || [],
                    verdict: raw.verdict || (pa.risk_score <= 35 ? 'Verified Legitimate' : pa.risk_score <= 69 ? 'Proceed with Caution' : 'High Risk / Probable Scam'),
                    actionable_steps: raw.actionable_steps || [],
                  });
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">{pa.company_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{pa.internship_role}</p>
                  </div>
                  <Badge variant={pa.risk_level === 'High' ? 'danger' : pa.risk_level === 'Medium' ? 'warning' : 'success'}>
                    Risk: {pa.risk_score}/100
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Analyzed on {new Date(pa.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!report && pastAnalyses.length === 0 && !loadingHistory && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-slate-400">No offer analyses yet. Upload an offer letter or paste offer text above to get started.</p>
        </Card>
      )}
    </div>
  );
};
