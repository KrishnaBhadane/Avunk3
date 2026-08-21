import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompanyApplications,
  updateApplicationStatus,
  acceptApplicationAsIntern,
  type CompanyApplicantItem,
} from '../../lib/internshipTracker';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  Briefcase,
  Award,
  Clock,
  XCircle,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export const CompanyApplicants: React.FC = () => {
  const { companyProfile } = useAuth();
  const [applications, setApplications] = useState<CompanyApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionNotice, setActionNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (!companyProfile) return;
    setLoading(true);

    try {
      const list = await fetchCompanyApplications(companyProfile.id);
      setApplications(list);
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  }, [companyProfile]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Handle status update
  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setProcessingId(appId);
    setErrorNotice('');

    const res = await updateApplicationStatus(appId, newStatus);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to update application status');
      setProcessingId(null);
      return;
    }

    setActionNotice(`Candidate status updated to ${newStatus.replace('_', ' ')}!`);
    setTimeout(() => setActionNotice(''), 4000);
    setProcessingId(null);
    await loadApplications();
  };

  // Handle accepting candidate as verified intern
  const handleAcceptAsIntern = async (app: CompanyApplicantItem) => {
    if (!companyProfile) return;
    setProcessingId(app.id);
    setErrorNotice('');

    const res = await acceptApplicationAsIntern(app, companyProfile.company_name);
    if (!res.success) {
      setErrorNotice(res.error || 'Failed to accept candidate');
      setProcessingId(null);
      return;
    }

    setActionNotice(`🎉 ${app.student_name} has been accepted and activated in your Intern Tracker!`);
    setTimeout(() => setActionNotice(''), 5000);
    setProcessingId(null);
    await loadApplications();
  };

  // Filtered applications
  const filtered = applications.filter((app) => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      app.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.student_email && app.student_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      app.student_institute.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.requirement_title && app.requirement_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      app.student_skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Metrics
  const totalCount = applications.length;
  const appliedCount = applications.filter((a) => a.status === 'applied').length;
  const shortlistedCount = applications.filter((a) => a.status === 'shortlisted').length;
  const underReviewCount = applications.filter((a) => a.status === 'under_review').length;
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length;

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
      <div className="border-b border-surface-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Users className="w-7 h-7 text-white" />
          Job & Internship Applicants
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, shortlist, and hire students who have applied for your company's internship requirements.
        </p>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Applications</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-amber-400 uppercase font-bold block">New Applied</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{appliedCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-indigo-400 uppercase font-bold block">Under Review</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">{underReviewCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Shortlisted</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{shortlistedCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-emerald-300 uppercase font-bold block">Hired as Intern</span>
          <span className="text-2xl font-black text-emerald-300 mt-1 block">{acceptedCount}</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search applicant name, email, skills, college..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'applied', label: 'New Applied' },
            { id: 'shortlisted', label: 'Shortlisted' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'accepted', label: 'Hired / Accepted' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                filterStatus === tab.id
                  ? 'bg-white text-black border-white'
                  : 'bg-surface-border text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applicant List Feed */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Applicants Found</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {applications.length === 0
              ? 'When students discover your company postings on AVUNK and apply, their applications and contact info will appear here.'
              : 'No applicants match your current search or status filter.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <Card key={app.id} className="p-6 bg-surface border-surface-border hover:border-slate-600 transition-all space-y-4 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Applicant Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-surface-border text-white text-sm font-black flex items-center justify-center shrink-0 border border-slate-700 uppercase">
                      {app.student_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {app.student_name}
                      </h3>
                      <p className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        Applied for: <strong className="text-white">{app.requirement_title}</strong>
                      </p>
                    </div>

                    <Badge
                      variant={
                        app.status === 'accepted'
                          ? 'success'
                          : app.status === 'shortlisted'
                          ? 'gold'
                          : app.status === 'under_review'
                          ? 'info'
                          : app.status === 'rejected'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {app.status === 'accepted'
                        ? '★ Hired as Intern'
                        : app.status === 'shortlisted'
                        ? '✓ Shortlisted'
                        : app.status === 'under_review'
                        ? '● Under Review'
                        : app.status === 'rejected'
                        ? '✕ Rejected'
                        : '● Applied (New)'}
                    </Badge>
                  </div>

                  {/* Contact & Institute Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{app.student_institute}</span>
                      {app.student_department && <span className="text-slate-500 truncate">({app.student_department})</span>}
                    </div>

                    {app.student_email && (
                      <a
                        href={`mailto:${app.student_email}`}
                        className="flex items-center gap-1.5 text-indigo-300 hover:underline truncate"
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{app.student_email}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                      </a>
                    )}

                    {app.student_phone && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{app.student_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills / Tech Stack */}
                  {app.student_skills && app.student_skills.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Tech Stack & Skills:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {app.student_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-surface-border text-slate-200 rounded text-[11px] font-medium border border-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    Applied on {new Date(app.applied_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Candidate Action Buttons */}
                <div className="flex flex-row lg:flex-col gap-2 shrink-0 self-end lg:self-center border-t lg:border-t-0 lg:border-l border-surface-border pt-3 lg:pt-0 lg:pl-4 w-full lg:w-auto justify-end">
                  {app.status !== 'accepted' && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={processingId === app.id}
                      onClick={() => handleAcceptAsIntern(app)}
                      icon={<ShieldCheck className="w-3.5 h-3.5 text-black" />}
                    >
                      Accept & Hire
                    </Button>
                  )}

                  {app.status !== 'shortlisted' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={processingId === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'shortlisted')}
                      icon={<Award className="w-3.5 h-3.5 text-amber-400" />}
                    >
                      Shortlist
                    </Button>
                  )}

                  {app.status !== 'under_review' && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={processingId === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'under_review')}
                      icon={<Clock className="w-3.5 h-3.5" />}
                    >
                      Mark Under Review
                    </Button>
                  )}

                  {app.status !== 'rejected' && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={processingId === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                      icon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
