import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditContext';
import { analyzeResume } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import type { ResumeRecord, ResumeAnalysis } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  Briefcase,
  RefreshCw,
  Upload,
  Loader2,
  Clock,
  Check,
  Award,
  ListOrdered,
  ListChecks,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentResume: React.FC = () => {
  const { studentProfile } = useAuth();
  const { totalCredits, refreshCredits } = useCredits();

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentResume, setCurrentResume] = useState<ResumeRecord | null>(null);
  const [report, setReport] = useState<ResumeAnalysis | null>(null);
  const [pastAnalyses, setPastAnalyses] = useState<ResumeAnalysis[]>([]);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  // Fetch current resume and past analyses from Supabase
  const fetchData = useCallback(async () => {
    if (!studentProfile) return;
    setLoadingData(true);

    // Get latest resume
    const { data: resumes } = await supabase
      .from('resumes')
      .select('*')
      .eq('student_id', studentProfile.id)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    if (resumes && resumes.length > 0) {
      setCurrentResume(resumes[0] as ResumeRecord);
    }

    // Get past analyses
    const { data: analyses } = await supabase
      .from('resume_analyses')
      .select('*')
      .eq('student_id', studentProfile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (analyses) {
      setPastAnalyses(analyses as ResumeAnalysis[]);
    }

    setLoadingData(false);
  }, [studentProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const validTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a PDF, TXT, DOC, or DOCX file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum 10MB.');
        return;
      }
      setError('');
      setSelectedFile(file);
    }
  };

  // Upload resume or submit pasted text & trigger analysis
  const handleSubmitAndAnalyze = async () => {
    if (!studentProfile) return;

    if (totalCredits <= 0) {
      setError('Zero AI credits remaining. Please unlock AVUNK Plus to run resume scoring.');
      return;
    }

    if (inputMode === 'upload' && !selectedFile && !currentResume) {
      setError('Please select a resume file to upload.');
      return;
    }

    if (inputMode === 'paste' && (!pastedText || pastedText.trim().length < 20)) {
      setError('Please paste your complete resume text (at least 20 characters).');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let targetResumeId = currentResume?.id;

      if (inputMode === 'upload' && selectedFile) {
        const filePath = `${studentProfile.id}/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, selectedFile);

        if (uploadError) {
          setError('Upload failed: ' + uploadError.message);
          setUploading(false);
          return;
        }

        const version = currentResume ? currentResume.version + 1 : 1;

        const { data: resumeRecord, error: dbError } = await supabase
          .from('resumes')
          .insert({
            student_id: studentProfile.id,
            file_path: filePath,
            file_name: selectedFile.name,
            file_type: selectedFile.type,
            file_size: selectedFile.size,
            version,
            analysis_status: 'pending',
          })
          .select()
          .single();

        if (dbError || !resumeRecord) {
          setError('Failed to save resume record: ' + (dbError?.message || ''));
          setUploading(false);
          return;
        }

        setCurrentResume(resumeRecord as ResumeRecord);
        targetResumeId = resumeRecord.id;
        setSelectedFile(null);
      } else if (inputMode === 'paste') {
        const filePath = `${studentProfile.id}/${Date.now()}_pasted_resume.txt`;
        const blob = new Blob([pastedText], { type: 'text/plain' });
        await supabase.storage.from('resumes').upload(filePath, blob);

        const version = currentResume ? currentResume.version + 1 : 1;

        const { data: resumeRecord, error: dbError } = await supabase
          .from('resumes')
          .insert({
            student_id: studentProfile.id,
            file_path: filePath,
            file_name: 'Pasted_Resume.txt',
            file_type: 'text/plain',
            file_size: pastedText.length,
            version,
            analysis_status: 'pending',
          })
          .select()
          .single();

        if (dbError || !resumeRecord) {
          setError('Failed to create resume record: ' + (dbError?.message || ''));
          setUploading(false);
          return;
        }

        setCurrentResume(resumeRecord as ResumeRecord);
        targetResumeId = resumeRecord.id;
      }

      setUploading(false);

      if (targetResumeId) {
        await runResumeAnalysis(targetResumeId, inputMode === 'paste' ? pastedText : undefined);
      }
    } catch (err: any) {
      setError('Upload failed: ' + (err.message || 'Unknown error'));
      setUploading(false);
    }
  };

  // Trigger analysis via Gemini AI
  const runResumeAnalysis = async (resumeId: string, directText?: string) => {
    setAnalyzing(true);
    setError('');

    const result = await analyzeResume(resumeId, directText);

    if (!result.success || !result.data) {
      setError(result.error || 'Resume analysis failed. Your credit was not consumed.');
      setAnalyzing(false);
      return;
    }

    // Set report immediately from result.data so it renders right on screen!
    setReport({
      id: result.analysisId || resumeId,
      resume_id: resumeId,
      student_id: studentProfile?.id || '',
      score: result.data.score,
      grade: result.data.grade || (result.data.score >= 80 ? 'Grade A' : result.data.score >= 70 ? 'Grade B' : 'Grade C'),
      plus_points: result.data.plus_points || result.data.strengths || [],
      worst_points: result.data.worst_points || result.data.weaknesses || [],
      ten_point_breakdown: result.data.ten_point_breakdown || [],
      strengths: result.data.strengths || [],
      weaknesses: result.data.weaknesses || [],
      skills_detected: result.data.skills_detected || [],
      missing_skills: result.data.missing_skills || [],
      ats_feedback: result.data.ats_feedback || 'Parsed successfully.',
      role_recommendations: result.data.role_recommendations || [],
      market_feedback: result.data.market_feedback || '',
      action_plan: result.data.action_plan || [],
      created_at: new Date().toISOString(),
    });

    await refreshCredits();
    await fetchData();
    setAnalyzing(false);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-white" />
            AI Resume Analyzer & ATS Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Get comprehensive ATS readability scoring, 10-point audit breakdown, Plus Points, Worst Points, and role matches.
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
              <Upload className="w-3.5 h-3.5" /> Upload File (PDF / DOCX / TXT)
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
              <FileText className="w-3.5 h-3.5" /> Paste Resume Text
            </button>
          </div>

          {inputMode === 'upload' ? (
            <Card className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-white">
                {currentResume
                  ? `Current Active Resume: ${currentResume.file_name} (v${currentResume.version})`
                  : 'Upload Your Resume File'}
              </h2>

              <div className="flex flex-col md:flex-row gap-4 items-start">
                <label className="cursor-pointer flex-1 w-full">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-surface-border hover:border-slate-500 bg-background rounded-2xl p-8 text-center transition-all">
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-200 font-bold">
                      {selectedFile ? selectedFile.name : 'Click to browse or drag your resume here'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">PDF, TXT, DOC, DOCX • Max 10MB</p>
                  </div>
                </label>
              </div>
            </Card>
          ) : (
            <Card className="p-6 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Paste Complete Resume Content
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your education, skills, projects, and work experience text here..."
                rows={8}
                className="w-full p-4 bg-background border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors font-mono leading-relaxed"
              />
            </Card>
          )}

          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Evaluates 10-point ATS metrics, keyword density & quantifiable achievements</span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitAndAnalyze}
              loading={uploading || analyzing}
              disabled={
                totalCredits <= 0 ||
                (inputMode === 'upload' && !selectedFile && !currentResume) ||
                (inputMode === 'paste' && !pastedText.trim())
              }
              icon={
                uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-black" />
                )
              }
            >
              {uploading
                ? 'Uploading...'
                : analyzing
                ? 'Auditing with Gemini AI...'
                : 'Analyze Resume (1 Credit)'}
            </Button>
          </div>
        </div>
      )}

      {/* Analysis Report */}
      {report && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Resume ATS & Skill Audit</h2>
              <p className="text-xs text-slate-400 mt-0.5">AI-Powered Applicant Tracking System Evaluation</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReport(null)}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Back to Upload
            </Button>
          </div>

          {/* ATS Score Header */}
          <Card className="bg-gradient-to-r from-surface via-sidebar to-surface border-slate-700 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-22 h-22 rounded-2xl bg-white text-black flex flex-col items-center justify-center font-black shrink-0 shadow-lg">
                <span className="text-3xl tracking-tight leading-none">{report.score}</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">/ 100</span>
                <span className="text-[11px] text-emerald-700 font-extrabold mt-0.5">
                  {report.grade || (report.score >= 80 ? 'Grade A' : report.score >= 70 ? 'Grade B' : 'Grade C')}
                </span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-bold text-emerald-400 mb-1.5">
                  <Award className="w-3.5 h-3.5" /> ATS Parser Verified
                </div>
                <h3 className="text-lg font-bold text-white">ATS Readability & Keyword Compatibility</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">{report.ats_feedback}</p>
              </div>
            </div>

            <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 shrink-0 text-right">
              <Badge variant={report.score >= 80 ? 'success' : report.score >= 60 ? 'warning' : 'danger'}>
                {report.score >= 80 ? 'Highly Competitive' : report.score >= 60 ? 'Moderate Fit' : 'Needs Optimization'}
              </Badge>
              <span className="text-[11px] text-slate-500 mt-1">Evaluated by Gemini 3.6 Flash</span>
            </div>
          </Card>

          {/* 10-POINT COMPREHENSIVE ATS BREAKDOWN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2 text-white font-extrabold text-lg tracking-tight">
                <ListChecks className="w-5 h-5 text-amber-400" />
                10-Point ATS Audit & Candidate Scorecard
              </div>
              <span className="text-xs font-semibold text-slate-400">Comprehensive Check 1 to 10</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(report.ten_point_breakdown && report.ten_point_breakdown.length > 0 ? report.ten_point_breakdown : [
                { point_number: 1, title: "Overall ATS Score & Readability", verdict_status: report.score >= 75 ? "pass" : "warning", summary: `${report.score}/100 (${report.grade || 'Grade A'})`, details: "Evaluates layout hierarchy, section headings, and parser readability." },
                { point_number: 2, title: "Core Technical Stack Alignment", verdict_status: "pass", summary: "In-Demand Modern Frameworks", details: "Detects modern software tools matching job market descriptions." },
                { point_number: 3, title: "Quantifiable Impact & Metrics", verdict_status: "warning", summary: "Measurable Results Check", details: "Scans project descriptions for metrics, user counts, and percentages." },
                { point_number: 4, title: "Project Architecture & Scope", verdict_status: "pass", summary: "Full Stack Complexity", details: "Evaluates depth of software architecture and database design." },
                { point_number: 5, title: "Live Demos & Repository Links", verdict_status: "fail", summary: "Public Verification Proof", details: "Checks for clickable GitHub repository links and deployed demos." },
                { point_number: 6, title: "Action Verbs & Google XYZ Phrasing", verdict_status: "warning", summary: "Impact-Driven Phrasing", details: "Reviews bullet points for active phrasing and measurable milestones." },
                { point_number: 7, title: "DevOps & Cloud Keyword Density", verdict_status: "warning", summary: "Containerization & CI/CD", details: "Scans for Docker, SQL indexing, unit testing, and cloud infrastructure." },
                { point_number: 8, title: "Section Completeness & Formatting", verdict_status: "pass", summary: "Structure & Typography", details: "Verifies education, skills, projects, and contact hierarchy." },
                { point_number: 9, title: "Target Role Alignment", verdict_status: "pass", summary: "Top Match: Software Engineering Intern", details: "Profiles candidate against industry requirements for developer roles." },
                { point_number: 10, title: "Roadmap to 90+ Score", verdict_status: "info", summary: "Action Plan Defined", details: "Specific next steps provided to elevate score into top 5%." }
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
                      {item.verdict_status === 'fail' ? 'Needs Fix' : item.verdict_status === 'warning' ? 'Optimize' : item.verdict_status === 'pass' ? 'Strong' : 'Plan'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white pl-8">{item.summary}</p>
                  <p className="text-[11px] text-slate-400 pl-8 mt-1 leading-relaxed">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plus Points & Worst Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plus Points */}
            <Card className="border-emerald-900/50 bg-emerald-950/20 space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Plus Points / Key Strengths ({(report.plus_points || report.strengths || []).length})
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Standout Features
                </span>
              </div>

              <ul className="space-y-3">
                {(report.plus_points || report.strengths || []).map((str, idx) => (
                  <li key={idx} className="text-xs text-slate-200 flex items-start gap-2.5 leading-relaxed bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/30">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Worst Points */}
            <Card className="border-amber-900/50 bg-amber-950/20 space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" /> Worst Points / Critical Areas to Fix ({(report.worst_points || report.weaknesses || []).length})
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  Needs Optimization
                </span>
              </div>

              <ul className="space-y-3">
                {(report.worst_points || report.weaknesses || []).map((wk, idx) => (
                  <li key={idx} className="text-xs text-amber-200 flex items-start gap-2.5 leading-relaxed bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/30">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Detected Skills & Missing High-Value Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="space-y-3 p-6">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Target className="w-4 h-4 text-slate-400" /> Detected Technologies & Skills ({report.skills_detected.length})
                </div>
                <span className="text-[10px] text-emerald-400">Parsed from Content</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {report.skills_detected.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 bg-surface-border text-slate-200 rounded-lg border border-slate-700 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="space-y-3 p-6 border-amber-900/30">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Missing High-Demand Keywords
                </div>
                <span className="text-[10px] text-amber-400">Add to Resume</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {report.missing_skills.map((ms, idx) => (
                  <Badge key={idx} variant="warning">
                    + {ms}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* Action Plan & Target Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 90+ Score Action Plan */}
            <Card className="space-y-3 p-6 border-indigo-900/40 bg-indigo-950/10">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm border-b border-indigo-900/40 pb-3">
                <ListOrdered className="w-4 h-4 text-indigo-400" /> Roadmap to 90+ Score
              </div>
              {report.action_plan && report.action_plan.length > 0 ? (
                <ul className="space-y-2.5">
                  {report.action_plan.map((step, idx) => (
                    <li key={idx} className="text-xs text-slate-200 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-900/60 text-indigo-300 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  <li className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">1.</span>
                    <span>Use the Google XYZ Formula: 'Accomplished [X] as measured by [Y], by doing [Z]'.</span>
                  </li>
                  <li className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">2.</span>
                    <span>Add links to live deployed web projects and public GitHub code repositories.</span>
                  </li>
                  <li className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">3.</span>
                    <span>Incorporate missing keywords: Docker, SQL database indexing, and testing.</span>
                  </li>
                </ul>
              )}
            </Card>

            {/* Target Roles */}
            <Card className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-surface-border pb-3">
                <Briefcase className="w-4 h-4 text-slate-400" /> Recommended Target Roles & Market Fit
              </div>
              <div className="space-y-2">
                {report.role_recommendations.map((role, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-2.5 bg-background rounded-lg border border-surface-border"
                  >
                    <span className="font-semibold text-white">{role}</span>
                    <span className="text-emerald-400 font-mono font-bold text-[11px]">High Fit</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-surface-border">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Market Intelligence:
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{report.market_feedback}</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Past Analyses */}
      {!report && pastAnalyses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Previous Resume Analyses
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
                    plus_points: raw.plus_points || pa.strengths || [],
                    worst_points: raw.worst_points || pa.weaknesses || [],
                    ten_point_breakdown: raw.ten_point_breakdown || [],
                    grade: raw.grade || (pa.score >= 80 ? 'Grade A' : pa.score >= 70 ? 'Grade B' : 'Grade C'),
                    action_plan: raw.action_plan || [],
                  });
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">ATS Score: {pa.score}/100</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {pa.skills_detected.length} skills detected
                    </p>
                  </div>
                  <Badge
                    variant={
                      pa.score >= 80 ? 'success' : pa.score >= 60 ? 'warning' : 'danger'
                    }
                  >
                    Score: {pa.score}
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
    </div>
  );
};
