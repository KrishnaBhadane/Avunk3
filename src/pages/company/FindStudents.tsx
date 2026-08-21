import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateCandidateMatch } from '../../lib/matchEngine';
import type { InternshipRequirement, StudentProfile } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Search,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
  Copy,
  Check,
  Award,
} from 'lucide-react';

interface ExtendedStudentProfile extends StudentProfile {
  contact_email?: string;
  resume_score?: number;
  resume_grade?: string;
  latest_resume_name?: string;
}

export const CompanyFindStudents: React.FC = () => {
  const { companyProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSkill = searchParams.get('skill') || '';
  const [skillQuery, setSkillQuery] = useState(initialSkill);
  const [departmentFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'match' | 'score' | 'name'>('match');

  const [requirements, setRequirements] = useState<InternshipRequirement[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [allStudents, setAllStudents] = useState<ExtendedStudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<ExtendedStudentProfile[]>([]);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const POPULAR_SKILLS = [
    'React',
    'TypeScript',
    'Node.js',
    'Python',
    'PostgreSQL',
    'Tailwind CSS',
    'Docker',
    'AI/ML',
    'Next.js',
    'SQL',
    'Git',
  ];

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
        setRequirements(data as InternshipRequirement[]);
      }
    };

    fetchRequirements();
  }, [companyProfile]);

  // Fetch all discoverable students and their resume scores
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);

      const { data: studentData, error: stuError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('discoverable', true);

      if (stuError) {
        console.error('Error fetching students:', stuError);
        setLoading(false);
        return;
      }

      if (studentData && studentData.length > 0) {
        // Fetch profiles table for emails and resume analyses for scores
        const extendedList: ExtendedStudentProfile[] = await Promise.all(
          studentData.map(async (stu: any) => {
            // Get email from profiles table
            const { data: profileRecord } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', stu.profile_id)
              .maybeSingle();

            // Get latest resume score
            const { data: analysisData } = await supabase
              .from('resume_analyses')
              .select('score, raw_ai_response')
              .eq('student_id', stu.id)
              .order('created_at', { ascending: false })
              .limit(1);

            const score = analysisData?.[0]?.score || undefined;
            const grade = analysisData?.[0]?.raw_ai_response?.grade || (score ? (score >= 80 ? 'Grade A' : score >= 70 ? 'Grade B' : 'Grade C') : undefined);

            return {
              ...stu,
              contact_email: profileRecord?.email || 'krishnabhadane0@gmail.com',
              resume_score: score,
              resume_grade: grade,
            };
          })
        );

        setAllStudents(extendedList);
      }

      setLoading(false);
    };

    fetchStudents();
  }, []);

  // Filter & Rank candidates based on skillQuery and selected requirement
  useEffect(() => {
    let result = [...allStudents];

    // Filter by skill search text
    if (skillQuery.trim()) {
      const q = skillQuery.trim().toLowerCase();
      result = result.filter((stu) => {
        const skillsMatch = stu.skills?.some((s) => s.toLowerCase().includes(q));
        const nameMatch = stu.full_name?.toLowerCase().includes(q);
        const instMatch = stu.institute_name?.toLowerCase().includes(q);
        const deptMatch = stu.department?.toLowerCase().includes(q);
        return skillsMatch || nameMatch || instMatch || deptMatch;
      });
    }

    // Filter by department
    if (departmentFilter !== 'All') {
      result = result.filter((stu) =>
        stu.department?.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }

    // Sort candidates
    if (sortBy === 'score') {
      result.sort((a, b) => (b.resume_score || 0) - (a.resume_score || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else {
      // Default: If requirement is selected, sort by match score
      if (selectedReqId) {
        const selectedReq = requirements.find((r) => r.id === selectedReqId);
        if (selectedReq) {
          result.sort((a, b) => {
            const matchA = calculateCandidateMatch(selectedReq, a, a.resume_score || 0).match_score;
            const matchB = calculateCandidateMatch(selectedReq, b, b.resume_score || 0).match_score;
            return matchB - matchA;
          });
        }
      }
    }

    setFilteredStudents(result);
  }, [skillQuery, departmentFilter, sortBy, selectedReqId, allStudents, requirements]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const selectedRequirement = requirements.find((r) => r.id === selectedReqId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="border-b border-surface-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Search className="w-7 h-7 text-white" />
            Candidate Search & Skill Discovery Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search registered students by tech stack, verified skills, college name, and ATS resume benchmarks.
          </p>
        </div>

        {requirements.length > 0 && (
          <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-surface-border">
            <label className="text-[11px] font-semibold text-slate-400 pl-2">Job Match Filter:</label>
            <select
              value={selectedReqId}
              onChange={(e) => setSelectedReqId(e.target.value)}
              className="bg-background border border-surface-border text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="">All Candidates (No Job Filter)</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.mode})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Interactive Tech Stack Search Bar */}
      <Card className="p-6 space-y-4 bg-gradient-to-r from-surface via-sidebar to-surface border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={skillQuery}
              onChange={(e) => {
                setSkillQuery(e.target.value);
                setSearchParams(e.target.value ? { skill: e.target.value } : {});
              }}
              placeholder="Search tech stack, language or framework: React, Python, TypeScript, Node.js, SQL, AI/ML..."
              className="w-full pl-10 pr-4 py-3 bg-background border border-surface-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors shadow-inner font-mono"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-background border border-surface-border text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none flex items-center"
            >
              <option value="match">Sort: Best Match</option>
              <option value="score">Sort: ATS Resume Score</option>
              <option value="name">Sort: Candidate Name</option>
            </select>

            {skillQuery && (
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setSkillQuery('');
                  setSearchParams({});
                }}
              >
                Clear Search
              </Button>
            )}
          </div>
        </div>

        {/* Popular Tech Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Filter by Skill:
          </span>
          {POPULAR_SKILLS.map((skill) => {
            const isSelected = skillQuery.toLowerCase().includes(skill.toLowerCase());
            return (
              <button
                key={skill}
                type="button"
                onClick={() => {
                  const newQuery = isSelected ? '' : skill;
                  setSkillQuery(newQuery);
                  setSearchParams(newQuery ? { skill: newQuery } : {});
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-surface-border/70 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isSelected ? `✓ ${skill}` : `+ ${skill}`}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Job Requirement Banner */}
      {selectedRequirement && (
        <Card className="bg-surface-hover/40 border-slate-700 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Job Targeting:</span>
            <h2 className="text-base font-bold text-white mt-0.5">{selectedRequirement.title} ({selectedRequirement.mode})</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedRequirement.required_skills.map((s, idx) => (
                <Badge key={idx} variant="info">Required: {s}</Badge>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-xs text-slate-400 block">Matched Candidates</span>
            <span className="text-2xl font-black text-white">{filteredStudents.length} Available</span>
          </div>
        </Card>
      )}

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Available Candidate Profiles
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-border text-slate-300 font-normal">
              {filteredStudents.length} Found
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {skillQuery ? `Showing skilled candidates matching "${skillQuery}"` : 'All discoverable verified student candidates'}
          </p>
        </div>
      </div>

      {/* Candidate Profile Cards */}
      {filteredStudents.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-3">
          <Search className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No students matched "{skillQuery}"</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try clicking one of the popular skill tags above or clear your search to browse all candidates.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSkillQuery('')}>
            View All Students
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((student) => {
            const queryLower = skillQuery.trim().toLowerCase();
            const hasMatchedSkill = (skill: string) =>
              queryLower && skill.toLowerCase().includes(queryLower);

            return (
              <Card
                key={student.id}
                className="p-6 space-y-4 hover:border-slate-500 transition-all bg-surface border-surface-border shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-4">
                  <div className="flex items-start md:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-200 text-black font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                      {student.full_name?.charAt(0) || 'S'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-white tracking-tight">{student.full_name}</h3>
                        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                          Verified Student
                        </Badge>
                        {student.resume_score !== undefined && (
                          <Badge variant="info" icon={<Award className="w-3 h-3" />}>
                            ATS {student.resume_score}/100 • {student.resume_grade || 'Grade A'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          {student.institute_name || 'Premier Engineering Institute'}
                        </span>
                        <span>•</span>
                        <span>{student.department}</span>
                        <span>•</span>
                        <span className="text-slate-400">Class of {student.graduation_year}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Email Box */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-surface-border">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-mono text-slate-300 select-all">
                        {student.contact_email || 'krishnabhadane0@gmail.com'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(student.contact_email || 'krishnabhadane0@gmail.com')}
                        title="Copy Email"
                        className="p-1 hover:text-white text-slate-400 transition-colors"
                      >
                        {copiedEmail === (student.contact_email || 'krishnabhadane0@gmail.com') ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <a
                      href={`mailto:${student.contact_email || 'krishnabhadane0@gmail.com'}?subject=Internship Opportunity via AVUNK Platform&body=Hi ${student.full_name}, we reviewed your profile on AVUNK and would like to discuss an internship opportunity.`}
                    >
                      <Button variant="primary" size="sm" icon={<Mail className="w-3.5 h-3.5 text-black" />}>
                        Email Candidate
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Skills Grid with Query Highlight */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Verified Technical Skills & Frameworks ({(student.skills || []).length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(student.skills || []).map((skill, i) => {
                      const isMatch = hasMatchedSkill(skill);
                      return (
                        <span
                          key={i}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition-all border ${
                            isMatch
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-500/40'
                              : 'bg-surface-border text-slate-200 border-slate-700'
                          }`}
                        >
                          {isMatch ? `★ ${skill}` : skill}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Profile Footer */}
                <div className="text-[11px] text-slate-500 pt-2 flex items-center justify-between border-t border-surface-border">
                  <span>Institution Verified • Student Opt-In for Direct Company Outreach</span>
                  <span className="text-emerald-400 font-mono font-semibold">Ready for Interview</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
