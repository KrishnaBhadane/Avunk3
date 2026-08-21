import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStudentInternships,
  createStudentInternship,
  fetchInternshipDailyLogs,
  submitDailyWorkLog,
  uploadEvidenceFile,
  calculateProgressStats,
} from '../../lib/internshipTracker';
import type {
  StudentInternship,
  InternshipDailyLog,
  InternshipProgressStats,
  EvidenceType,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Building2,
  Briefcase,
  FileText,
  Code2,
  Globe,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Award,
  Check,
  X,
  FileCheck,
} from 'lucide-react';

export const StudentTracker: React.FC = () => {
  const { studentProfile } = useAuth();

  const [_internships, setInternships] = useState<StudentInternship[]>([]);
  const [activeInternship, setActiveInternship] = useState<StudentInternship | null>(null);
  const [dailyLogs, setDailyLogs] = useState<InternshipDailyLog[]>([]);
  const [stats, setStats] = useState<InternshipProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddInternshipModal, setShowAddInternshipModal] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<InternshipDailyLog | null>(null);

  // Add Internship Form State
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newTotalDays, setNewTotalDays] = useState(30);
  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [submittingInternship, setSubmittingInternship] = useState(false);

  // Daily Log Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTitle, setLogTitle] = useState('');
  const [logHours, setLogHours] = useState(4);
  const [logDescription, setLogDescription] = useState('');
  const [logTasksCompleted, setLogTasksCompleted] = useState('');
  const [logLearnings, setLogLearnings] = useState('');
  const [logBlockers, setLogBlockers] = useState('');

  // Evidence Inputs in Log Form
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [customLinkTitle, setCustomLinkTitle] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingLog, setUploadingLog] = useState(false);

  const [formError, setFormError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Fetch student internships on mount
  const loadData = useCallback(async () => {
    if (!studentProfile) return;
    setLoading(true);

    const list = await fetchStudentInternships(studentProfile.id);
    setInternships(list);

    if (list.length > 0) {
      // Set active internship (or first one)
      const active = list.find((i) => i.status === 'active') || list[0];
      setActiveInternship(active);

      // Fetch daily logs
      const logs = await fetchInternshipDailyLogs(active.id);
      setDailyLogs(logs);
      setStats(calculateProgressStats(active, logs));
    } else {
      setActiveInternship(null);
      setDailyLogs([]);
      setStats(null);
    }

    setLoading(false);
  }, [studentProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle creating a new internship track
  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile) return;
    if (!newCompany.trim() || !newRole.trim()) {
      setFormError('Company name and internship role are required');
      return;
    }

    setSubmittingInternship(true);
    setFormError('');

    const res = await createStudentInternship(studentProfile.id, {
      company_name: newCompany.trim(),
      role: newRole.trim(),
      start_date: newStartDate,
      end_date: newEndDate,
      total_days: Number(newTotalDays) || 30,
      mentor_name: newMentorName.trim() || undefined,
      mentor_email: newMentorEmail.trim() || undefined,
    });

    if (!res.success || !res.data) {
      setFormError(res.error || 'Failed to create internship');
      setSubmittingInternship(false);
      return;
    }

    setShowAddInternshipModal(false);
    setSubmittingInternship(false);
    setNewCompany('');
    setNewRole('');
    setSuccessNotice('Internship track activated! You can now start logging daily progress.');
    setTimeout(() => setSuccessNotice(''), 5000);

    await loadData();
  };

  // Open modal to add or edit log
  const handleOpenAddLog = (existing?: InternshipDailyLog) => {
    setFormError('');
    if (existing) {
      setEditingLog(existing);
      setLogDate(existing.log_date);
      setLogTitle(existing.title);
      setLogHours(existing.hours_worked);
      setLogDescription(existing.description);
      setLogTasksCompleted(existing.tasks_completed || '');
      setLogLearnings(existing.learnings || '');
      setLogBlockers(existing.blockers || '');
      setGithubUrl('');
      setDemoUrl('');
      setCustomLinkUrl('');
      setCustomLinkTitle('');
      setEvidenceFile(null);
    } else {
      setEditingLog(null);
      setLogDate(new Date().toISOString().split('T')[0]);
      setLogTitle('');
      setLogHours(4);
      setLogDescription('');
      setLogTasksCompleted('');
      setLogLearnings('');
      setLogBlockers('');
      setGithubUrl('');
      setDemoUrl('');
      setCustomLinkUrl('');
      setCustomLinkTitle('');
      setEvidenceFile(null);
    }
    setShowAddLogModal(true);
  };

  // Submit daily work log
  const handleSubmitDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile || !activeInternship) return;

    if (!logTitle.trim() || !logDescription.trim()) {
      setFormError('Work title and description are required.');
      return;
    }

    setUploadingLog(true);
    setFormError('');

    try {
      const evidenceItems: Array<{
        evidence_type: EvidenceType;
        title?: string;
        file_path?: string;
        file_url?: string;
        file_name?: string;
        file_type?: string;
        url?: string;
      }> = [];

      // 1. If file attached, upload to storage
      if (evidenceFile) {
        const uploadRes = await uploadEvidenceFile(evidenceFile, studentProfile.id);
        if (uploadRes.success && uploadRes.url) {
          evidenceItems.push({
            evidence_type: 'file',
            title: evidenceFile.name,
            file_name: evidenceFile.name,
            file_type: evidenceFile.type,
            file_url: uploadRes.url,
            file_path: uploadRes.filePath,
            url: uploadRes.url,
          });
        }
      }

      // 2. If GitHub URL
      if (githubUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'github',
          title: 'GitHub Commit / PR',
          url: githubUrl.trim(),
        });
      }

      // 3. If Demo URL
      if (demoUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'demo',
          title: 'Live Project Demo',
          url: demoUrl.trim(),
        });
      }

      // 4. Custom Link
      if (customLinkUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'link',
          title: customLinkTitle.trim() || 'Reference Link',
          url: customLinkUrl.trim(),
        });
      }

      const res = await submitDailyWorkLog(
        activeInternship.id,
        studentProfile.id,
        {
          log_id: editingLog?.id,
          log_date: logDate,
          title: logTitle.trim(),
          description: logDescription.trim(),
          tasks_completed: logTasksCompleted.trim() || undefined,
          learnings: logLearnings.trim() || undefined,
          blockers: logBlockers.trim() || undefined,
          hours_worked: Number(logHours) || 4,
        },
        evidenceItems
      );

      if (!res.success) {
        setFormError(res.error || 'Failed to save daily work log');
        setUploadingLog(false);
        return;
      }

      setShowAddLogModal(false);
      setUploadingLog(false);
      setSuccessNotice(
        editingLog
          ? 'Daily work log updated and resubmitted for mentor review!'
          : 'Today\'s work log submitted successfully! Mentor review pending.'
      );
      setTimeout(() => setSuccessNotice(''), 5000);

      // Refresh logs
      const updatedLogs = await fetchInternshipDailyLogs(activeInternship.id);
      setDailyLogs(updatedLogs);
      setStats(calculateProgressStats(activeInternship, updatedLogs));
    } catch (err: any) {
      setFormError('Submission failed: ' + (err.message || 'Unknown error'));
      setUploadingLog(false);
    }
  };

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
            <FileCheck className="w-7 h-7 text-white" />
            Internship Tracker & Daily Work Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record daily engineering tasks, submit verifiable evidence, and track mentor review approvals.
          </p>
        </div>

        {activeInternship && (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleOpenAddLog()}
              icon={<Plus className="w-4 h-4 text-black" />}
            >
              + Add Today's Work
            </Button>
          </div>
        )}
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Review Notices & Action Alerts */}
      {stats && stats.changes_requested_logs > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-200 text-xs font-medium flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Mentor requested updates on <strong>{stats.changes_requested_logs} work log(s)</strong>. Please review mentor feedback below and resubmit.
            </span>
          </div>
        </div>
      )}

      {/* Main Internship Content or Empty State */}
      {!activeInternship ? (
        <Card className="p-12 text-center border-dashed space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-border text-slate-300 flex items-center justify-center mx-auto shadow-inner">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Track Your Internship</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Record your daily work, attach code commits & evidence, and build a verified institutional record of your engineering internship.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setFormError('');
              setShowAddInternshipModal(true);
            }}
            icon={<Plus className="w-4 h-4 text-black" />}
          >
            + Add Active Internship
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Internship Overview Banner */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-gradient-to-r from-surface via-sidebar to-surface shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {activeInternship.company_name}
                </span>
                <Badge
                  variant={
                    activeInternship.status === 'completed'
                      ? 'success'
                      : activeInternship.status === 'paused'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {activeInternship.status === 'completed'
                    ? 'Completed Record'
                    : activeInternship.status === 'paused'
                    ? 'Paused'
                    : 'Active Internship'}
                </Badge>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">{activeInternship.role}</h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Start: {new Date(activeInternship.start_date).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  End: {new Date(activeInternship.end_date).toLocaleDateString()}
                </span>
                {activeInternship.mentor_name && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">
                      Mentor: <strong className="text-white">{activeInternship.mentor_name}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Days Counter */}
            <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-surface-border pt-4 md:pt-0 md:pl-6 shrink-0 w-full md:w-auto">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Days Completed</span>
                <p className="text-3xl font-black text-white">
                  {stats?.days_completed || 0}
                  <span className="text-sm font-normal text-slate-500"> / {activeInternship.total_days} days</span>
                </p>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {stats?.days_remaining || 0} days remaining
              </span>
            </div>
          </div>

          {/* Internship Activity & Progress Section */}
          {stats && (
            <Card className="p-6 space-y-6 bg-surface border-surface-border shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-border pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Internship Activity & Verification Stats
                </h3>
                <span className="text-[11px] text-slate-400">
                  Measures recorded + submitted + reviewed progress
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-background p-4 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Work Logs</span>
                  <span className="text-2xl font-black text-white mt-1 block">{stats.total_logs}</span>
                  <span className="text-[10px] text-slate-500">{stats.total_hours_worked} total hours</span>
                </div>

                <div className="bg-background p-4 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Approved Logs</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.approved_logs}</span>
                  <span className="text-[10px] text-slate-500">Verified by mentor</span>
                </div>

                <div className="bg-background p-4 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Review</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.pending_logs}</span>
                  <span className="text-[10px] text-slate-500">Awaiting feedback</span>
                </div>

                <div className="bg-background p-4 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">Action Required</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">{stats.changes_requested_logs}</span>
                  <span className="text-[10px] text-slate-500">Updates requested</span>
                </div>

                <div className="bg-background p-4 rounded-xl border border-surface-border col-span-2 md:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Evidence Items</span>
                  <span className="text-2xl font-black text-white mt-1 block">{stats.evidence_submitted_count}</span>
                  <span className="text-[10px] text-slate-500">Proofs attached</span>
                </div>
              </div>

              {/* Activity Consistency Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">Activity Consistency</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {stats.activity_consistency_percent}%
                  </span>
                </div>
                <div className="w-full bg-surface-border h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.activity_consistency_percent}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Daily Work Logs Timeline Feed */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Work Log Timeline ({dailyLogs.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily recorded deliverables with proof of work and supervisor reviews.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddLog()}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Log Today's Work
              </Button>
            </div>

            {dailyLogs.length === 0 ? (
              <Card className="p-10 text-center border-dashed space-y-3">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-white">No daily logs recorded yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click "+ Add Today's Work" above to document your tasks, learnings, and attach screenshots or GitHub commits.
                </p>
                <Button variant="primary" size="sm" onClick={() => handleOpenAddLog()}>
                  + Add Today's Work
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {dailyLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

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
                              <h4 className="text-base font-bold text-white">{log.title}</h4>
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
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {log.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                          {log.status === 'changes_requested' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenAddLog(log)}
                            >
                              Update & Resubmit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Log Detail Drawer */}
                      {isExpanded && (
                        <div className="mt-5 pt-5 border-t border-surface-border space-y-4 text-xs">
                          {/* Full description & breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3.5 bg-background rounded-xl border border-surface-border">
                              <span className="font-bold text-slate-300 block mb-1">Tasks Completed:</span>
                              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                                {log.tasks_completed || log.description}
                              </p>
                            </div>

                            <div className="p-3.5 bg-background rounded-xl border border-surface-border">
                              <span className="font-bold text-emerald-400 block mb-1">What I Learned:</span>
                              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                                {log.learnings || 'Daily applied engineering problem solving.'}
                              </p>
                            </div>

                            <div className="p-3.5 bg-background rounded-xl border border-surface-border">
                              <span className="font-bold text-amber-400 block mb-1">Blockers / Challenges:</span>
                              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                                {log.blockers || 'None encountered.'}
                              </p>
                            </div>
                          </div>

                          {/* Evidence Attachments */}
                          {log.evidence && log.evidence.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                                Attached Evidence ({log.evidence.length})
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
                                      {ev.title || ev.file_name || 'Evidence Link'}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mentor Review Feedback */}
                          {log.mentor_reviews && log.mentor_reviews.length > 0 && (
                            <div className="p-4 rounded-xl bg-surface border border-slate-700 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                  Mentor Review Feedback
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(log.mentor_reviews[0].created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed italic bg-background p-2.5 rounded-lg border border-surface-border">
                                "{log.mentor_reviews[0].comment}"
                              </p>
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

      {/* Add / Edit Daily Log Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto antialiased">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingLog ? 'Update Daily Work Log' : '+ Add Today\'s Work Log'}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeInternship?.company_name} • {activeInternship?.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitDailyLog} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hours Worked *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    value={logHours}
                    onChange={(e) => setLogHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work / Task Title *</label>
                <input
                  type="text"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="e.g. Implemented JWT Authentication and Database Middleware"
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">What I Worked On / Description *</label>
                <textarea
                  rows={3}
                  value={logDescription}
                  onChange={(e) => setLogDescription(e.target.value)}
                  placeholder="Summarize the core technical features and modules worked on today..."
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">What I Learned</label>
                  <textarea
                    rows={2}
                    value={logLearnings}
                    onChange={(e) => setLogLearnings(e.target.value)}
                    placeholder="Key learnings, API patterns, or algorithms mastered..."
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Problems / Blockers</label>
                  <textarea
                    rows={2}
                    value={logBlockers}
                    onChange={(e) => setLogBlockers(e.target.value)}
                    placeholder="Any debugging issues or questions for mentor..."
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Evidence Section */}
              <div className="space-y-3 pt-2 border-t border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Attach Evidence & Links
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" /> GitHub Commit / PR Link
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Live Demo / Deployed Project Link
                    </label>
                    <input
                      type="url"
                      value={demoUrl}
                      onChange={(e) => setDemoUrl(e.target.value)}
                      placeholder="https://my-app.vercel.app"
                      className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> File / Screenshot / Document Evidence
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-border file:text-white hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowAddLogModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={uploadingLog}
                  icon={<Check className="w-4 h-4 text-black" />}
                >
                  {editingLog ? 'Update & Resubmit Log' : 'Submit Today\'s Work Log'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Internship Modal */}
      {showAddInternshipModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto antialiased">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <h3 className="text-lg font-bold text-white">+ Add Active Internship Track</h3>
              <button
                type="button"
                onClick={() => setShowAddInternshipModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateInternship} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Apex Systems Labs"
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Internship Role *</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer Intern"
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Total Days)</label>
                <input
                  type="number"
                  min="5"
                  max="365"
                  value={newTotalDays}
                  onChange={(e) => setNewTotalDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mentor Name (Optional)</label>
                  <input
                    type="text"
                    value={newMentorName}
                    onChange={(e) => setNewMentorName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mentor Email (Optional)</label>
                  <input
                    type="email"
                    value={newMentorEmail}
                    onChange={(e) => setNewMentorEmail(e.target.value)}
                    placeholder="mentor@company.com"
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowAddInternshipModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submittingInternship}
                  icon={<Plus className="w-4 h-4 text-black" />}
                >
                  Activate Internship Track
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
