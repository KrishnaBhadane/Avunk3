import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditContext';
import { supabase } from '../../lib/supabase';
import type { OfferAnalysis, ResumeAnalysis } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  FileCheck,
  FileText,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { studentProfile } = useAuth();
  const { totalCredits } = useCredits();

  const [latestOffer, setLatestOffer] = useState<OfferAnalysis | null>(null);
  const [latestResume, setLatestResume] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate profile completion from real data
  const calculateProfileCompletion = (): number => {
    if (!studentProfile) return 0;
    let filled = 0;
    const fields = [
      studentProfile.full_name,
      studentProfile.department,
      studentProfile.graduation_year,
      studentProfile.institute_name,
      studentProfile.skills?.length > 0 ? 'has_skills' : '',
      studentProfile.phone,
      studentProfile.address,
    ];
    fields.forEach((f) => { if (f) filled++; });
    return Math.round((filled / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!studentProfile) {
        setLoading(false);
        return;
      }

      // Fetch latest offer analysis
      const { data: offerData } = await supabase
        .from('offer_analyses')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (offerData && offerData.length > 0) {
        setLatestOffer(offerData[0] as OfferAnalysis);
      }

      // Fetch latest resume analysis
      const { data: resumeData } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (resumeData && resumeData.length > 0) {
        setLatestResume(resumeData[0] as ResumeAnalysis);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [studentProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {studentProfile?.full_name || 'Student'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {studentProfile?.institute_name || 'Institution not set'} • {studentProfile?.department || 'Department not set'} ({studentProfile?.graduation_year || '—'})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/student/offer-check">
            <Button variant="primary" size="md" icon={<FileCheck className="w-4 h-4" />}>
              Verify Internship Offer
            </Button>
          </Link>
          <Link to="/student/resume">
            <Button variant="outline" size="md" icon={<FileText className="w-4 h-4" />}>
              Analyze Resume
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile Completion</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              {profileCompletion}%
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden mb-2">
              <div className="bg-white h-full rounded-full" style={{ width: `${profileCompletion}%` }} />
            </div>
            <Link to="/student/profile" className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium">
              Update Profile <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Verification Credits</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white">{totalCredits}</span>
              <span className="text-xs text-slate-400">Remaining</span>
            </div>
            <Link to="/student/plus" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium mt-1">
              Unlock AVUNK Plus <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resume Score</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            {latestResume ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-white">{latestResume.score}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <Link to="/student/resume" className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium mt-1">
                  View ATS Feedback <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">No analysis yet</p>
                <Link to="/student/resume" className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium mt-1">
                  Upload Resume <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Market Readiness</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            {latestResume && latestResume.score >= 70 ? (
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                Strong Industry Fit
              </div>
            ) : latestResume ? (
              <div className="text-sm font-bold text-amber-400">
                Room for Improvement
              </div>
            ) : (
              <p className="text-sm text-slate-500">Upload resume to assess</p>
            )}
            <Link to="/student/insights" className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-medium mt-1">
              Explore Skill Gaps <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Latest Offer Verification
            </h2>
            <Link to="/student/offer-check" className="text-xs text-slate-400 hover:text-white font-medium">
              New Offer Verification →
            </Link>
          </div>

          {latestOffer ? (
            <Card className="p-6 border-slate-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{latestOffer.internship_role}</span>
                    <Badge variant={latestOffer.risk_level === 'High' ? 'danger' : latestOffer.risk_level === 'Medium' ? 'warning' : 'success'}>
                      {latestOffer.risk_score}/100 Risk
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {latestOffer.company_name} • Verified on {new Date(latestOffer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link to="/student/offer-check">
                  <Button variant="secondary" size="sm">View Full Report</Button>
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-rose-950/30 border border-rose-900/40 p-3 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-rose-400 block mb-1">Key Warnings:</span>
                  {latestOffer.warning_signals.slice(0, 2).map((w, idx) => (
                    <p key={idx} className="text-slate-300">• {w}</p>
                  ))}
                  {latestOffer.warning_signals.length === 0 && (
                    <p className="text-slate-500 italic">No warnings detected</p>
                  )}
                </div>
                <div className="bg-emerald-950/30 border border-emerald-900/40 p-3 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-emerald-400 block mb-1">Positive Signals:</span>
                  {latestOffer.positive_signals.slice(0, 2).map((p, idx) => (
                    <p key={idx} className="text-slate-300">• {p}</p>
                  ))}
                  {latestOffer.positive_signals.length === 0 && (
                    <p className="text-slate-500 italic">No positive signals found</p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-slate-400">No offer verified yet.</p>
              <Link to="/student/offer-check" className="text-xs text-white font-medium mt-2 inline-block hover:underline">
                Upload your first offer letter →
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
          <Card className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-surface-border flex items-center justify-center shrink-0 text-white font-bold text-xs">1</div>
              <div>
                <p className="text-xs font-bold text-white">Upload Your Resume</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Get AI-powered ATS feedback and skill recommendations.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-3 border-t border-surface-border">
              <div className="w-7 h-7 rounded-lg bg-surface-border flex items-center justify-center shrink-0 text-white font-bold text-xs">2</div>
              <div>
                <p className="text-xs font-bold text-white">Verify Offer Letters</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Check internship offers for risk signals before accepting.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-3 border-t border-surface-border">
              <div className="w-7 h-7 rounded-lg bg-surface-border flex items-center justify-center shrink-0 text-white font-bold text-xs">3</div>
              <div>
                <p className="text-xs font-bold text-white">Complete Your Profile</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Keep your skills and graduation year up-to-date.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
