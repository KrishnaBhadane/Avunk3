import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompanyInterns,
  fetchInternshipDailyLogs,
  submitMentorReview,
  calculateProgressStats,
  verifyInternship,
} from '../../lib/internshipTracker';
import type {
  StudentInternship,
  InternshipDailyLog,
  InternshipProgressStats,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  GraduationCap,
  FileText,
  Code2,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Send,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';

interface ExtendedInternItem extends StudentInternship {
  student_name?: string;
  student_email?: string;
  student_institute?: string;
  student_skills?: string[];
}

export const CompanyInternTracker: React.FC = () => {
  const { companyProfile } = useAuth();

  const [interns, setInterns] = useState<ExtendedInternItem[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<ExtendedInternItem | null>(null);
  const [dailyLogs, setDailyLogs] = useState<InternshipDailyLog[]>([]);
  const [stats, setStats] = useState<InternshipProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mentor Review Form State
  const [reviewingLogId, setReviewingLogId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Separate pending verification and verified interns
  const pendingInterns = interns.filter((i) => i.status === 'pending_verification');
  const verifiedInterns = interns.filter((i) => i.status !== 'pending_verification');

  // Fetch interns for company
  const loadInterns = useCallback(async () => {
    if (!companyProfile) return;
    setLoading(true);

    const list = await fetchCompanyInterns(companyProfile.id);
    setInterns(list);

    // Auto-select the first verified intern
    const verified = list.filter((i) => i.status !== 'pending_verification');
    if (verified.length > 0) {
      setSelectedIntern(verified[0]);
      const logs = await fetchInternshipDailyLogs(verified[0].id);
      setDailyLogs(logs);
      setStats(calculateProgressStats(verified[0], logs));
    } else {
      setSelectedIntern(null);
      setDailyLogs([]);
      setStats(null);
    }

    setLoading(false);
  }, [companyProfile]);

  useEffect(() => {
    loadInterns();
  }, [loadInterns]);

  // Select an intern to view their work logs
  const handleSelectIntern = async (intern: ExtendedInternItem) => {
    if (intern.status === 'pending_verification') return; // Can't view logs for unverified
    setSelectedIntern(intern);
    setLoading(true);
    setReviewingLogId(null);

    const logs = await fetchInternshipDailyLogs(intern.id);
    setDailyLogs(logs);
    setStats(calculateProgressStats(intern, logs));
    setLoading(false);
  };

  // Verify or reject intern
  const handleVerifyIntern = async (internshipId: string, decision: 'active' | 'rejected') => {
    setVerifyingId(internshipId);
    setError('');

    const res = await verifyInternship(internshipId, decision);
    if (!res.success) {
      setError(res.error || 'Failed to process verification');
      setVerifyingId(null);
      return;
    }

    setNotice(
      decision === 'active'
        ? 'Intern verified! They can now start logging daily work.'
        : 'Internship request rejected and removed.'
    );
    setTimeout(() => setNotice(''), 5000);
    setVerifyingId(null);

    await loadInterns();
  };

  // Submit mentor review decision
  const handleSubmitReview = async (logId: string) => {
    if (!reviewComment.trim()) {
      setError('Please provide feedback or instructions in the comment box.');
      return;
    }

    setSubmittingReview(true);
    setError('');

    const res = await submitMentorReview(
      logId,
      reviewDecision,
      reviewComment.trim(),
      companyProfile?.company_name || 'Enterprise Supervisor'
    );

    if (!res.success) {
      setError(res.error || 'Failed to submit review');
      setSubmittingReview(false);
      return;
    }

    setNotice(
      reviewDecision === 'approved'
        ? 'Work log marked as Approved!'
        : reviewDecision === 'changes_requested'
        ? 'Feedback sent to intern for updates!'
        : 'Work log marked as Rejected.'
    );
    setTimeout(() => setNotice(''), 4000);

    setReviewingLogId(null);
    setReviewComment('');
    setSubmittingReview(false);

    // Refresh logs
    if (selectedIntern) {
      const logs = await fetchInternshipDailyLogs(selectedIntern.id);
      setDailyLogs(logs);
      setStats(calculateProgressStats(selectedIntern, logs));
    }
  };

  if (loading && interns.length === 0) {
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
            <Users className="w-7 h-7 text-white" />
            Intern Tracker & Mentor Review Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify intern registrations, monitor daily deliverables, and approve work logs. Only your company's interns are shown.
          </p>
        </div>

        {selectedIntern && (
          <Badge variant="info">
            Managing: {selectedIntern.student_name}
          </Badge>
        )}
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PENDING VERIFICATION REQUESTS */}
      {pendingInterns.length > 0 && (
        <Card className="p-6 border-amber-800/50 bg-amber-950/10 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-amber-800/30 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Pending Verification Requests ({pendingInterns.length})
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            These students claim to be interning at your company. You must verify or reject each request. Until verified, they cannot access the internship tracker.
          </p>

          <div className="space-y-3">
            {pendingInterns.map((intern) => (
              <div
                key={intern.id}
                className="p-4 bg-background rounded-xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{intern.student_name}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Role: <strong>{intern.role}</strong>
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {intern.student_institute}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(intern.start_date).toLocaleDateString()} – {new Date(intern.end_date).toLocaleDateString()}
                    </span>
                    <span>{intern.total_days} days</span>
                  </div>
                  {/* Show student skills / tech stack */}
                  {intern.student_skills && intern.student_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {intern.student_skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-surface-border text-slate-300 rounded text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={verifyingId === intern.id}
                    onClick={() => handleVerifyIntern(intern.id, 'active')}
                    icon={<ShieldCheck className="w-3.5 h-3.5 text-black" />}
                  >
                    Verify Intern
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={verifyingId === intern.id}
                    onClick={() => handleVerifyIntern(intern.id, 'rejected')}
                    icon={<ShieldX className="w-3.5 h-3.5" />}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {interns.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Interns Assigned Yet</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            When students register and add your company as their active internship provider, their verification request will appear here. Only verified interns will have tracker access.
          </p>
        </Card>
      ) : verifiedInterns.length === 0 && pendingInterns.length > 0 ? (
        <Card className="p-8 text-center border-dashed space-y-2">
          <p className="text-sm text-slate-400">No verified interns yet. Verify pending requests above to enable intern tracking.</p>
        </Card>
      ) : verifiedInterns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interns List Sidebar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Verified Interns ({verifiedInterns.length})
            </h3>

            <div className="space-y-2">
              {verifiedInterns.map((intern) => {
                const isSelected = selectedIntern?.id === intern.id;

                return (
                  <Card
                    key={intern.id}
                    className={`p-4 transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-emerald-500/80 bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/40'
                        : 'border-surface-border bg-surface hover:border-slate-600'
                    }`}
                    onClick={() => handleSelectIntern(intern)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">{intern.student_name}</h4>
                        <p className="text-xs text-slate-300 mt-0.5 font-medium">{intern.role}</p>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          {intern.student_institute}
                        </p>
                        {/* Show tech stack */}
                        {intern.student_skills && intern.student_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {intern.student_skills.slice(0, 4).map((skill, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-surface-border text-slate-400 rounded text-[9px] font-medium">
                                {skill}
                              </span>
                            ))}
                            {intern.student_skills.length > 4 && (
                              <span className="text-[9px] text-slate-500">+{intern.student_skills.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <Badge variant={intern.status === 'completed' ? 'success' : 'info'}>
                        {intern.total_days}d Track
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Intern Details & Logs Review Section */}
          {selectedIntern && (
            <div className="lg:col-span-2 space-y-6">
              {/* Intern Progress Overview */}
              <div className="p-6 rounded-2xl border border-slate-700 bg-gradient-to-r from-surface via-sidebar to-surface shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Intern Profile & Track
                  </span>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                    {selectedIntern.student_name}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedIntern.role} • {selectedIntern.student_institute}
                  </p>
                  {/* Show tech stack */}
                  {selectedIntern.student_skills && selectedIntern.student_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedIntern.student_skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-surface-border text-slate-300 rounded text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(selectedIntern.start_date).toLocaleDateString()} – {new Date(selectedIntern.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 text-right">
                  <div className="p-3 bg-background rounded-xl border border-surface-border">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Days Done</span>
                    <span className="text-xl font-black text-white">
                      {stats?.days_completed || 0} / {selectedIntern.total_days}
                    </span>
                  </div>
                  <div className="p-3 bg-background rounded-xl border border-surface-border">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Review</span>
                    <span className="text-xl font-black text-amber-400">
                      {stats?.pending_logs || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Logs List for Selected Intern */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-surface-border pb-3">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Daily Work Logs Submitted ({dailyLogs.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    {stats?.approved_logs || 0} approved • {stats?.pending_logs || 0} pending
                  </span>
                </div>

                {dailyLogs.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <p className="text-xs text-slate-400">This intern has not submitted any work logs yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {dailyLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const isReviewing = reviewingLogId === log.id;

                      return (
                        <Card
                          key={log.id}
                          className={`p-5 transition-all border ${
                            log.status === 'approved'
                              ? 'border-emerald-900/40 bg-emerald-950/10'
                              : log.status === 'changes_requested'
                              ? 'border-amber-800 bg-amber-950/20'
                              : log.status === 'rejected'
                              ? 'border-rose-800 bg-rose-950/20'
                              : 'border-surface-border bg-surface'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-start md:items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-surface-border text-white text-xs font-black flex flex-col items-center justify-center shrink-0 border border-slate-700">
                                <span>{new Date(log.log_date).getDate()}</span>
                                <span className="text-[9px] uppercase font-bold text-slate-400">
                                  {new Date(log.log_date).toLocaleString('default', { month: 'short' })}
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className="text-sm font-bold text-white">{log.title}</h4>
                                  <span className="text-xs px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono">
                                    {log.hours_worked} hrs
                                  </span>
                                  <Badge
                                    variant={
                                      log.status === 'approved'
                                        ? 'success'
                                        : log.status === 'changes_requested'
                                        ? 'warning'
                                        : log.status === 'rejected'
                                        ? 'danger'
                                        : 'info'
                                    }
                                  >
                                    {log.status === 'approved'
                                      ? '✓ Approved'
                                      : log.status === 'changes_requested'
                                      ? '⚠ Changes Requested'
                                      : log.status === 'rejected'
                                      ? '✕ Rejected'
                                      : '● Pending Review'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                  {log.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setReviewingLogId(isReviewing ? null : log.id);
                                  setReviewComment('');
                                  setReviewDecision('approved');
                                }}
                              >
                                {isReviewing ? 'Cancel' : 'Review & Decision'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                              </Button>
                            </div>
                          </div>

                          {/* Mentor Review Action Drawer */}
                          {isReviewing && (
                            <div className="mt-4 pt-4 border-t border-surface-border p-4 bg-background rounded-xl border border-slate-700 space-y-4">
                              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                Submit Supervisor Review Decision
                              </span>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReviewDecision('approved')}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                    reviewDecision === 'approved'
                                      ? 'bg-emerald-600 text-white border-emerald-500'
                                      : 'bg-surface-border text-slate-300 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve Work Log
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewDecision('changes_requested')}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                    reviewDecision === 'changes_requested'
                                      ? 'bg-amber-600 text-white border-amber-500'
                                      : 'bg-surface-border text-slate-300 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewDecision('rejected')}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                    reviewDecision === 'rejected'
                                      ? 'bg-rose-600 text-white border-rose-500'
                                      : 'bg-surface-border text-slate-300 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>

                              <div>
                                <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                                  Mentor Feedback / Instructions *
                                </label>
                                <textarea
                                  rows={2}
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="e.g. Great implementation! Please add error boundary validation for password fields."
                                  className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReviewingLogId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  loading={submittingReview}
                                  onClick={() => handleSubmitReview(log.id)}
                                  icon={<Send className="w-3.5 h-3.5 text-black" />}
                                >
                                  Submit Decision
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-surface-border space-y-3 text-xs">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-3 bg-background rounded-lg border border-surface-border">
                                  <span className="font-bold text-slate-300 block mb-1">Tasks Completed:</span>
                                  <p className="text-slate-300 whitespace-pre-line">{log.tasks_completed || log.description}</p>
                                </div>
                                <div className="p-3 bg-background rounded-lg border border-surface-border">
                                  <span className="font-bold text-emerald-400 block mb-1">Learnings:</span>
                                  <p className="text-slate-300 whitespace-pre-line">{log.learnings || 'Applied engineering deliverables.'}</p>
                                </div>
                                <div className="p-3 bg-background rounded-lg border border-surface-border">
                                  <span className="font-bold text-amber-400 block mb-1">Blockers:</span>
                                  <p className="text-slate-300 whitespace-pre-line">{log.blockers || 'None.'}</p>
                                </div>
                              </div>

                              {/* Evidence Items */}
                              {log.evidence && log.evidence.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                                    Submitted Evidence ({log.evidence.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {log.evidence.map((ev) => (
                                      <a
                                        key={ev.id}
                                        href={ev.url || ev.file_url || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-background hover:bg-slate-800 text-slate-200 rounded-lg border border-surface-border flex items-center gap-2 transition-colors"
                                      >
                                        {ev.evidence_type === 'github' ? (
                                          <Code2 className="w-3.5 h-3.5 text-slate-300" />
                                        ) : ev.evidence_type === 'demo' ? (
                                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                        )}
                                        <span className="font-medium text-xs truncate max-w-[200px]">
                                          {ev.title || ev.file_name || 'Evidence Attachment'}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-slate-500" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
