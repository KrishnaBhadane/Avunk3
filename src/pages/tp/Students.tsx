import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Search, Users, FileText, ChevronRight, Loader2 } from 'lucide-react';

interface DBStudent {
  id: string;
  full_name: string;
  department: string;
  graduation_year: number;
  skills: string[];
  verification_status: string;
  institute_name?: string;
  latest_resume_score?: number;
  has_resume: boolean;
}

export const TPStudents: React.FC = () => {
  const { tpProfile } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  useEffect(() => {
    const fetchStudents = async () => {
      if (!tpProfile) {
        setLoading(false);
        return;
      }

      // Query real student_profiles from Supabase
      // RLS will enforce institution-level access
      const { data, error } = await supabase
        .from('student_profiles')
        .select('id, full_name, department, graduation_year, skills, verification_status, institute_name');

      if (error) {
        console.error('Error fetching students:', error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // For each student, check if they have a resume and get latest score
      const enrichedStudents: DBStudent[] = await Promise.all(
        data.map(async (stu: any) => {
          const { data: resumeData } = await supabase
            .from('resume_analyses')
            .select('score')
            .eq('student_id', stu.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('resumes')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', stu.id);

          return {
            ...stu,
            latest_resume_score: resumeData?.[0]?.score || 0,
            has_resume: (count || 0) > 0,
          };
        })
      );

      setStudents(enrichedStudents);
      setLoading(false);
    };

    fetchStudents();
  }, [tpProfile]);

  // Get unique departments and years for filters
  const departments = [...new Set(students.map(s => s.department).filter(Boolean))];
  const years = [...new Set(students.map(s => s.graduation_year).filter(Boolean))].sort();

  const filteredStudents = students.filter((stu) => {
    const matchesSearch =
      stu.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stu.skills?.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDept = departmentFilter === 'ALL' || stu.department === departmentFilter;
    const matchesYear = yearFilter === 'ALL' || stu.graduation_year?.toString() === yearFilter;

    return matchesSearch && matchesDept && matchesYear;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      <div className="border-b border-surface-border pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-white" />
            Institutional Student Roster
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View registered students from your institution.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student by name or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="bg-background border border-surface-border text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none">
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="bg-background border border-surface-border text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none">
              <option value="ALL">All Grad Years</option>
              {years.map((y) => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">No students found.</p>
          <p className="text-xs text-slate-500 mt-1">
            {students.length === 0
              ? 'No students have registered from your institution yet.'
              : 'No students match your current search and filter criteria.'}
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-surface-hover/50 text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department & Year</th>
                  <th className="py-3 px-4">Skill Stack</th>
                  <th className="py-3 px-4">Resume</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-surface-hover/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{stu.full_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {stu.department || '—'} ({stu.graduation_year || '—'})
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(stu.skills || []).slice(0, 3).map((s, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-surface-border text-slate-300 rounded">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {stu.has_resume ? (
                        <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {(stu.latest_resume_score ?? 0) > 0 ? `Score ${stu.latest_resume_score}` : 'Uploaded'}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not uploaded</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {stu.verification_status === 'verified' ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/tp/students/${stu.id}`}>
                        <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
