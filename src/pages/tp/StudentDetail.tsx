import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { StudentProfile, ResumeAnalysis } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ArrowLeft, FileText, Target, GraduationCap, Loader2 } from 'lucide-react';

export const TPStudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;

      // Fetch student profile (RLS enforces institution access)
      const { data: studentData, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !studentData) {
        console.error('Student not found:', error);
        setLoading(false);
        return;
      }

      setStudent(studentData as StudentProfile);

      // Fetch latest resume analysis
      const { data: analysisData } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (analysisData && analysisData.length > 0) {
        setLatestAnalysis(analysisData[0] as ResumeAnalysis);
      }

      setLoading(false);
    };

    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <Link to="/tp/students" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Roster
        </Link>
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">Student not found or access denied.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      <Link to="/tp/students" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Roster
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white text-black font-extrabold text-xl flex items-center justify-center">
            {student.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{student.full_name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {student.department || '—'} • Class of {student.graduation_year || '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {student.verification_status === 'verified' ? (
            <Badge variant="success">Verified Student</Badge>
          ) : (
            <Badge variant="warning">Verification Pending</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <GraduationCap className="w-4 h-4 text-slate-400" /> Academic Profile
          </div>
          <p className="text-xs text-slate-300"><strong className="text-slate-400">Institution:</strong> {student.institute_name || '—'}</p>
          <p className="text-xs text-slate-300"><strong className="text-slate-400">Department:</strong> {student.department || '—'}</p>
          <p className="text-xs text-slate-300"><strong className="text-slate-400">Graduation Year:</strong> {student.graduation_year || '—'}</p>
          {/* Privacy: address and phone are intentionally NOT shown to T&P */}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Target className="w-4 h-4 text-slate-400" /> Skill Tags
          </div>
          {student.skills && student.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {student.skills.map((sk, idx) => (
                <span key={idx} className="text-xs px-2.5 py-1 bg-surface-border text-slate-200 rounded font-medium">{sk}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No skills listed yet.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileText className="w-4 h-4 text-slate-400" /> Resume & ATS Score
          </div>
          {latestAnalysis ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{latestAnalysis.score}</span>
                <span className="text-xs text-slate-400">/ 100 ATS Score</span>
              </div>
              <p className="text-xs text-slate-400">
                {latestAnalysis.skills_detected.length} skills detected •
                Analyzed {new Date(latestAnalysis.created_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No resume analysis available.</p>
          )}
        </Card>
      </div>

      {latestAnalysis && (
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-white tracking-tight">
            AI-Detected Role Recommendations
          </h2>
          {latestAnalysis.role_recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {latestAnalysis.role_recommendations.map((role, idx) => (
                <div key={idx} className="p-3 bg-background rounded-lg border border-surface-border text-xs space-y-1">
                  <p className="font-bold text-white">{role}</p>
                  <p className="text-emerald-400 font-mono">AI Recommended</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No role recommendations yet.</p>
          )}
        </Card>
      )}
    </div>
  );
};
