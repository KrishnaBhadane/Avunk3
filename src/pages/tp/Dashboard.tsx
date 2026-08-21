import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Users, FileText, Briefcase, AlertTriangle, Building, Loader2 } from 'lucide-react';

interface TPStats {
  totalStudents: number;
  studentsWithResumes: number;
  averageResumeScore: number;
  pendingVerification: number;
}

export const TPDashboard: React.FC = () => {
  const { tpProfile } = useAuth();
  const isVerified = tpProfile?.verification_status === 'verified';
  const [stats, setStats] = useState<TPStats>({ totalStudents: 0, studentsWithResumes: 0, averageResumeScore: 0, pendingVerification: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!tpProfile) {
        setLoading(false);
        return;
      }

      // Fetch real student counts (RLS enforces institution access)
      const { data: students, count: totalCount } = await supabase
        .from('student_profiles')
        .select('id, verification_status', { count: 'exact' });

      const totalStudents = totalCount || 0;

      // Students with resumes
      let studentsWithResumes = 0;
      let totalScore = 0;
      let scoredCount = 0;

      if (students && students.length > 0) {
        const pendingVerification = students.filter(s => s.verification_status === 'pending').length;

        await Promise.all(
          students.map(async (stu: any) => {
            const { count } = await supabase
              .from('resumes')
              .select('id', { count: 'exact', head: true })
              .eq('student_id', stu.id);

            if ((count || 0) > 0) {
              studentsWithResumes++;
            }

            const { data: analyses } = await supabase
              .from('resume_analyses')
              .select('score')
              .eq('student_id', stu.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (analyses && analyses.length > 0) {
              totalScore += analyses[0].score;
              scoredCount++;
            }
          })
        );

        setStats({
          totalStudents,
          studentsWithResumes,
          averageResumeScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
          pendingVerification,
        });
      }

      setLoading(false);
    };

    fetchStats();
  }, [tpProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const resumeCompletionRate = stats.totalStudents > 0
    ? Math.round((stats.studentsWithResumes / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-8 antialiased">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building className="w-7 h-7 text-white" />
            {tpProfile?.institution_name || 'T&P Department Intelligence'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Training & Placement Control Center • Institutional Analytics & Verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/tp/students">
            <Button variant="primary" size="md" icon={<Users className="w-4 h-4 text-black" />}>
              Search Student Roster
            </Button>
          </Link>
        </div>
      </div>

      {!isVerified && (
        <Card className="border-amber-900/50 bg-amber-950/30 p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Institutional Verification Status: Pending
          </div>
          <p className="text-xs text-slate-300">
            Your institutional credentials are currently undergoing verification by AVUNK administrators. You have preview access to institutional tools.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{stats.totalStudents}</span>
            <p className="text-[11px] mt-1 text-slate-400">Registered from your institution</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Students with Resumes</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{stats.studentsWithResumes}</span>
            <p className="text-[11px] mt-1 text-slate-400">{resumeCompletionRate}% completion</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Resume Score</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            {stats.averageResumeScore > 0 ? (
              <span className="text-3xl font-extrabold text-white">{stats.averageResumeScore}<span className="text-lg text-slate-400">/100</span></span>
            ) : (
              <span className="text-sm text-slate-500">No analyses yet</span>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Verification</span>
            <AlertTriangle className={`w-4 h-4 ${stats.pendingVerification > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{stats.pendingVerification}</span>
            <p className={`text-[11px] mt-1 ${stats.pendingVerification > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
              {stats.pendingVerification > 0 ? 'Students awaiting verification' : 'All verified'}
            </p>
          </div>
        </Card>
      </div>

      {stats.totalStudents === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No students registered from your institution yet.</p>
          <p className="text-xs text-slate-500 mt-1">Students will appear here once they sign up and set their institution.</p>
        </Card>
      )}
    </div>
  );
};
