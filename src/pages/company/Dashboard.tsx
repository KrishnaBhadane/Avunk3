import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { InternshipRequirement } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Briefcase, Search, Users, AlertTriangle, Building, ArrowRight, Loader2 } from 'lucide-react';

export const CompanyDashboard: React.FC = () => {
  const { companyProfile } = useAuth();
  const isVerified = companyProfile?.verification_status === 'verified';

  const [requirementCount, setRequirementCount] = useState(0);
  const [discoverableStudentCount, setDiscoverableStudentCount] = useState(0);
  const [recentRequirements, setRecentRequirements] = useState<InternshipRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!companyProfile) {
        setLoading(false);
        return;
      }

      // Count active requirements
      const { count: reqCount } = await supabase
        .from('internship_requirements')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyProfile.id)
        .eq('is_active', true);

      setRequirementCount(reqCount || 0);

      // Count discoverable students (RLS enforced)
      const { count: stuCount } = await supabase
        .from('student_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('discoverable', true);

      setDiscoverableStudentCount(stuCount || 0);

      // Fetch 3 most recent requirements
      const { data: reqs } = await supabase
        .from('internship_requirements')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (reqs) {
        setRecentRequirements(reqs as InternshipRequirement[]);
      }

      setLoading(false);
    };

    fetchStats();
  }, [companyProfile]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building className="w-7 h-7 text-white" />
            {companyProfile?.company_name || 'Employer Talent Portal'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Internship Talent Intelligence • Deterministic Skill Matching
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/company/requirements">
            <Button variant="primary" size="md" icon={<Briefcase className="w-4 h-4 text-black" />}>
              Post Requirement
            </Button>
          </Link>
          <Link to="/company/find-students">
            <Button variant="outline" size="md" icon={<Search className="w-4 h-4" />}>
              Match Candidates
            </Button>
          </Link>
        </div>
      </div>

      {/* Verification Status Banner */}
      {!isVerified && (
        <Card className="border-amber-900/50 bg-amber-950/30 p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Company Verification Status: Pending
          </div>
          <p className="text-xs text-slate-300">
            Unverified companies have preview access to candidate searching. Verification badge will activate after business document audit.
          </p>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Requirements</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{requirementCount}</span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Discoverable Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{discoverableStudentCount}</span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Postings</span>
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{recentRequirements.length}</span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verification Status</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">{isVerified ? 'Verified' : 'Pending'}</span>
          </div>
        </Card>
      </div>

      {/* Recent Requirements */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white tracking-tight">Recent Requirement Postings</h2>
          <Link to="/company/requirements" className="text-xs text-slate-400 hover:text-white">
            Manage Requirements →
          </Link>
        </div>

        {recentRequirements.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No requirements posted yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Create your first internship requirement to start finding candidates.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentRequirements.map((req) => (
              <Card key={req.id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-white text-sm">{req.title}</span>
                  <Badge variant={req.is_active ? 'success' : 'warning'}>
                    {req.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {req.mode} • {req.location || '—'} {req.stipend ? `• ${req.stipend}` : ''}
                </p>
                <div className="pt-2 border-t border-surface-border flex justify-end items-center text-xs">
                  <Link to="/company/find-students" className="text-white hover:underline flex items-center gap-1 font-semibold">
                    Match <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
