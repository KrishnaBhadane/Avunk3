import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { verifyCompanyDomain, extractDomain, type DomainVerificationResult } from '../../lib/domainVerifier';
import type { StudentProfile } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Briefcase,
  Search,
  Users,
  Building,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Globe,
  Sparkles,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';

export const CompanyDashboard: React.FC = () => {
  const { companyProfile } = useAuth();
  const [requirementCount, setRequirementCount] = useState(0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [discoverableStudentCount, setDiscoverableStudentCount] = useState(0);
  const [topCandidates, setTopCandidates] = useState<StudentProfile[]>([]);
  const [domainAudit, setDomainAudit] = useState<DomainVerificationResult | null>(null);
  const [auditingDomain, setAuditingDomain] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const isVerified = companyProfile?.verification_status === 'verified' || domainAudit?.isVerified;
  const companyDomain = extractDomain(companyProfile?.website || '') || extractDomain(companyProfile?.company_email || '');

  // Perform automated domain & entity verification audit on load
  useEffect(() => {
    const runDomainAudit = async () => {
      if (!companyProfile) return;

      setAuditingDomain(true);
      const result = await verifyCompanyDomain(
        companyProfile.id,
        companyProfile.company_email,
        companyProfile.website,
        companyProfile.company_name
      );
      setDomainAudit(result);
      setAuditingDomain(false);
    };

    runDomainAudit();
  }, [companyProfile]);

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

      // Count job applications received
      const { count: appCount } = await supabase
        .from('internship_applications')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyProfile.id);

      setApplicantCount(appCount || 0);

      // Count discoverable students
      const { count: stuCount, data: studentSample } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('discoverable', true)
        .limit(3);

      setDiscoverableStudentCount(stuCount || 0);
      if (studentSample) {
        setTopCandidates(studentSample as StudentProfile[]);
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Building className="w-7 h-7 text-white" />
              {companyProfile?.company_name || 'Enterprise Employer Portal'}
            </h1>
            {isVerified ? (
              <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Verified Enterprise
              </Badge>
            ) : (
              <Badge variant="warning" icon={<Globe className="w-3.5 h-3.5" />}>
                Domain Verification Pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Talent Intelligence • Web Domain Verification • Skill-Based Candidate Discovery
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/company/find-students">
            <Button variant="primary" size="md" icon={<Search className="w-4 h-4 text-black" />}>
              Find Skilled Students
            </Button>
          </Link>
          <Link to="/company/requirements">
            <Button variant="outline" size="md" icon={<Briefcase className="w-4 h-4" />}>
              Post Requirement
            </Button>
          </Link>
        </div>
      </div>

      {/* Automated Web Domain Verification Card */}
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl transition-all ${
          isVerified
            ? 'bg-gradient-to-r from-emerald-950/70 via-emerald-900/30 to-surface border-emerald-800/80 text-emerald-200'
            : 'bg-gradient-to-r from-amber-950/70 via-amber-900/30 to-surface border-amber-800/80 text-amber-200'
        }`}
      >
        <div className="flex items-start md:items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isVerified
                ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                : 'bg-amber-950 border-amber-700 text-amber-400'
            }`}
          >
            {auditingDomain ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : isVerified ? (
              <ShieldCheck className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                Automated Web Domain Authentication
              </span>
              {companyDomain && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white">
                  @{companyDomain}
                </span>
              )}
            </div>

            <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
              {isVerified
                ? 'Corporate Domain Authenticated on Web'
                : 'Corporate Domain Verification Required'}
            </h3>

            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              {domainAudit?.message ||
                (isVerified
                  ? `Active web domain footprint verified for ${companyProfile?.company_name || 'Enterprise'}. Your recruiting credentials are active.`
                  : 'We check your corporate email and website domain on the web to prevent fraudulent recruiting.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link to="/company/profile">
            <Button variant="outline" size="sm" icon={<Globe className="w-3.5 h-3.5" />}>
              Manage Domain Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Applications Received</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{applicantCount}</span>
            <Link to="/company/applicants" className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1">
              View Applicants <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Candidates</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{discoverableStudentCount}</span>
            <span className="text-xs text-emerald-400 font-semibold">Active & Searchable</span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Job Postings</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{requirementCount}</span>
            <Link to="/company/requirements" className="text-xs text-slate-400 hover:text-white underline">
              View All
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Corporate Domain</span>
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-base font-bold text-white truncate max-w-[120px]">
              {companyDomain || 'Not Set'}
            </span>
            <Badge variant={isVerified ? 'success' : 'warning'}>
              {isVerified ? 'Verified' : 'Pending'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Quick Search Banner */}
      <Card className="p-6 space-y-4 bg-gradient-to-r from-surface via-sidebar to-surface border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Search Candidates by Tech Stack
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Type any technology (e.g. React, Python, Node.js, AI, SQL) to find skilled student profiles with verified colleges and emails.
            </p>
          </div>

          <Link to="/company/find-students">
            <Button variant="primary" size="sm" icon={<Search className="w-3.5 h-3.5 text-black" />}>
              Open Full Search Engine
            </Button>
          </Link>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tech stack: React, TypeScript, Python, Node.js, PostgreSQL..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          <Link to={`/company/find-students${searchQuery ? `?skill=${encodeURIComponent(searchQuery)}` : ''}`}>
            <Button variant="outline" size="md">
              Search
            </Button>
          </Link>
        </div>

        {/* Quick Skill Tags */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-slate-400 font-semibold text-[11px]">Popular Tech:</span>
          {['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'AI/ML'].map((skill) => (
            <Link key={skill} to={`/company/find-students?skill=${encodeURIComponent(skill)}`}>
              <span className="px-2.5 py-1 rounded-lg bg-surface-border hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer border border-slate-700">
                + {skill}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Featured Discoverable Candidates */}
      {topCandidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Featured Verified Candidates
            </h2>
            <Link to="/company/find-students" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              Browse All ({discoverableStudentCount}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topCandidates.map((stu) => (
              <Card key={stu.id} className="p-5 space-y-3 hover:border-slate-600 transition-all bg-surface">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-white">{stu.full_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {stu.institute_name || 'Verified Institution'}
                    </p>
                  </div>
                  <Badge variant="success">Verified</Badge>
                </div>

                <p className="text-[11px] text-slate-400">
                  {stu.department} • Class of {stu.graduation_year}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {stu.skills?.slice(0, 4).map((s, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 bg-surface-border rounded text-slate-300 font-medium">
                      {s}
                    </span>
                  ))}
                  {(stu.skills?.length || 0) > 4 && (
                    <span className="text-[10px] text-slate-500 font-bold self-center">
                      +{stu.skills!.length - 4} more
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-surface-border flex justify-between items-center">
                  <Link to={`/company/find-students?student=${stu.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Profile & Contact
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
