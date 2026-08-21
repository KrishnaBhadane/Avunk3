import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateCandidateMatch } from '../../lib/matchEngine';
import type { InternshipRequirement, CandidateMatch, StudentProfile } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Search, Sparkles, FileText, CheckCircle2, AlertCircle, GraduationCap, Loader2 } from 'lucide-react';

export const CompanyFindStudents: React.FC = () => {
  const { companyProfile } = useAuth();
  const [requirements, setRequirements] = useState<InternshipRequirement[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentScores, setStudentScores] = useState<Map<string, number>>(new Map());
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch company requirements from DB
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!companyProfile) return;

      const { data } = await supabase
        .from('internship_requirements')
        .select('*')
        .eq('company_id', companyProfile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const reqs = data as InternshipRequirement[];
        setRequirements(reqs);
        setSelectedReqId(reqs[0].id);
      }
    };

    fetchRequirements();
  }, [companyProfile]);

  // Fetch discoverable students from DB (RLS enforces discoverable=true for company)
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);

      const { data: studentData } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('discoverable', true);

      if (studentData && studentData.length > 0) {
        setStudents(studentData as StudentProfile[]);

        // Fetch resume scores
        const scores = new Map<string, number>();
        await Promise.all(
          studentData.map(async (stu: any) => {
            const { data: analysisData } = await supabase
              .from('resume_analyses')
              .select('score')
              .eq('student_id', stu.id)
              .order('created_at', { ascending: false })
              .limit(1);

            scores.set(stu.id, analysisData?.[0]?.score || 0);
          })
        );
        setStudentScores(scores);
      }

      setLoading(false);
    };

    fetchStudents();
  }, []);

  // Calculate matches when requirement or students change
  useEffect(() => {
    if (!selectedReqId || requirements.length === 0 || students.length === 0) {
      setCandidateMatches([]);
      return;
    }

    const selectedRequirement = requirements.find(r => r.id === selectedReqId);
    if (!selectedRequirement) return;

    const matches: CandidateMatch[] = students.map((student) => {
      const resumeScore = studentScores.get(student.id) || 0;
      return calculateCandidateMatch(selectedRequirement, student, resumeScore);
    }).sort((a, b) => b.match_score - a.match_score);

    setCandidateMatches(matches);
  }, [selectedReqId, requirements, students, studentScores]);

  const selectedRequirement = requirements.find(r => r.id === selectedReqId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      <div className="border-b border-surface-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Search className="w-7 h-7 text-white" />
            Candidate Matching & Intelligence Ranker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic candidate ranking based on verified skill overlaps and resume score benchmarks.
          </p>
        </div>

        {requirements.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-400">Select Requirement:</label>
            <select
              value={selectedReqId}
              onChange={(e) => setSelectedReqId(e.target.value)}
              className="bg-surface border border-surface-border text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
            >
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.mode})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {requirements.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No requirements posted yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Create internship requirements first to start matching candidates.
          </p>
        </Card>
      ) : (
        <>
          {selectedRequirement && (
            <Card className="bg-surface-hover/30 border-slate-700 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Search Target:</span>
                <h2 className="text-lg font-bold text-white mt-0.5">{selectedRequirement.title}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedRequirement.required_skills.map((s, idx) => (
                    <Badge key={idx} variant="info">Req: {s}</Badge>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs text-slate-400 block">Ranked Candidates</span>
                <span className="text-2xl font-extrabold text-white">{candidateMatches.length} Found</span>
              </div>
            </Card>
          )}

          {candidateMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-slate-400">No suitable students found.</p>
              <p className="text-xs text-slate-500 mt-1">
                Students need to register and set their profile to discoverable to appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Candidate Recommendations (Ordered by Match Score)
              </h2>

              {candidateMatches.map((candidate, idx) => (
                <Card key={candidate.id} className="p-6 space-y-4 hover:border-slate-600 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white text-black font-black text-lg flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{candidate.student_name}</h3>
                          <Badge variant="success">Discoverable</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {candidate.institute_name || '—'} • {candidate.department} ({candidate.graduation_year})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Match Score</span>
                        <span className="text-2xl font-extrabold text-emerald-400 font-mono">{candidate.match_score}%</span>
                      </div>
                      {candidate.resume_score !== undefined && candidate.resume_score > 0 && (
                        <Button variant="outline" size="sm" icon={<FileText className="w-3.5 h-3.5" />}>
                          Resume (Score {candidate.resume_score})
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-surface-border text-xs text-slate-300">
                    <strong className="text-white">AI Match Explanation:</strong> "{candidate.ai_explanation}"
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-emerald-400 block mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matching Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.matching_skills.map((s, i) => (
                          <Badge key={i} variant="success">{s}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-amber-400 block mb-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Skill Gaps
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.missing_skills.length > 0 ? (
                          candidate.missing_skills.map((s, i) => (
                            <Badge key={i} variant="warning">{s}</Badge>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">No critical gaps</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-surface-border">
                    <span>Privacy Encrypted: Address and phone hidden per AVUNK data policy.</span>
                    <span>Consent Verified</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
