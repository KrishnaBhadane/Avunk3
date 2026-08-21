import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompanyInterns,
  fetchInternshipDailyLogs,
  submitMentorReview,
  calculateProgressStats,
  verifyInternship,
  fetchTasksForCompany,
  createInternshipTask,
  reviewTaskSubmission,
  markStudentAttendance,
  fetchCompanyAttendance,
  calculateAttendanceStats,
  calculateTaskProgress,
} from '../../lib/internshipTracker';
import type {
  StudentInternship,
  InternshipDailyLog,
  InternshipProgressStats,
  InternshipTask,
  TaskPriority,
  TaskSubmissionType,
  InternshipAttendanceRecord,
  AttendanceStatus,
  AttendanceSummaryStats,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  GraduationCap,
  Code2,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Send,
  ShieldCheck,
  ShieldX,
  ListTodo,
  UserCheck,
  Plus,
} from 'lucide-react';

interface ExtendedInternItem extends StudentInternship {
  student_name?: string;
  student_email?: string;
  student_institute?: string;
  student_skills?: string[];
}

export const CompanyInternTracker: React.FC = () => {
  const { companyProfile, user } = useAuth();

  const [interns, setInterns] = useState<ExtendedInternItem[]>([]);
  const [selectedIntern, setSelectedIntern] = useState<ExtendedInternItem | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'logs' | 'attendance'>('tasks');
  const [loading, setLoading] = useState(true);

  // Intern Tasks
  const [companyTasks, setCompanyTasks] = useState<InternshipTask[]>([]);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskInstructions, setNewTaskInstructions] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskSubmissionType, setNewTaskSubmissionType] = useState<TaskSubmissionType>('multiple');
  const [assigningTask, setAssigningTask] = useState(false);

  // Task Review State
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [taskReviewDecision, setTaskReviewDecision] = useState<'completed' | 'changes_requested' | 'rejected'>('completed');
  const [taskReviewComment, setTaskReviewComment] = useState('');
  const [submittingTaskReview, setSubmittingTaskReview] = useState(false);

  // Daily Work Logs State
  const [dailyLogs, setDailyLogs] = useState<InternshipDailyLog[]>([]);
  const [stats, setStats] = useState<InternshipProgressStats | null>(null);
  const [reviewingLogId, setReviewingLogId] = useState<string | null>(null);
  const [logReviewDecision, setLogReviewDecision] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [logReviewComment, setLogReviewComment] = useState('');
  const [submittingLogReview, setSubmittingLogReview] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Attendance Management State
  const [attendanceRecords, setAttendanceRecords] = useState<InternshipAttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceSummaryStats | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('present');
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Separate pending verification and verified interns
  const pendingInterns = interns.filter((i) => i.status === 'pending_verification');
  const verifiedInterns = interns.filter((i) => i.status !== 'pending_verification');

  // Load Interns and their tasks
  const loadInterns = useCallback(async () => {
    if (!companyProfile) return;
    setLoading(true);

    try {
      const list = await fetchCompanyInterns(companyProfile.id, companyProfile.company_name);
      setInterns(list);

      const tasks = await fetchTasksForCompany(companyProfile.id);
      setCompanyTasks(tasks);

      const verified = list.filter((i) => i.status !== 'pending_verification');
      if (verified.length > 0) {
        const target = selectedIntern ? verified.find((v) => v.id === selectedIntern.id) || verified[0] : verified[0];
        setSelectedIntern(target);

        // Fetch logs
        const logs = await fetchInternshipDailyLogs(target.id);
        setDailyLogs(logs);
        setStats(calculateProgressStats(target, logs));

        // Fetch attendance
        const attRecords = await fetchCompanyAttendance(companyProfile.id);
        const internAtt = attRecords.filter((a) => a.student_id === target.student_id);
        setAttendanceRecords(internAtt);
        setAttendanceStats(calculateAttendanceStats(internAtt));
      } else {
        setSelectedIntern(null);
        setDailyLogs([]);
        setStats(null);
      }
    } catch (err) {
      console.error('Error loading company intern data:', err);
    } finally {
      setLoading(false);
    }
  }, [companyProfile, selectedIntern]);

  useEffect(() => {
    loadInterns();
  }, [loadInterns]);

  // Select an intern to view their details
  const handleSelectIntern = async (intern: ExtendedInternItem) => {
    setSelectedIntern(intern);
    setReviewingLogId(null);
    setReviewingTaskId(null);

    const logs = await fetchInternshipDailyLogs(intern.id);
    setDailyLogs(logs);
    setStats(calculateProgressStats(intern, logs));

    if (companyProfile) {
      const attRecords = await fetchCompanyAttendance(companyProfile.id);
      const internAtt = attRecords.filter((a) => a.student_id === intern.student_id);
      setAttendanceRecords(internAtt);
      setAttendanceStats(calculateAttendanceStats(internAtt));
    }
  };

  // Handle Verify/Reject intern
  const handleVerifyIntern = async (internshipId: string, decision: 'active' | 'rejected') => {
    setVerifyingId(internshipId);
    setError('');

    const res = await verifyInternship(internshipId, decision);
    if (!res.success) {
      setError(res.error || 'Failed to update internship status');
      setVerifyingId(null);
      return;
    }

    setNotice(decision === 'active' ? '✓ Intern verified and activated!' : 'Internship request rejected.');
    setTimeout(() => setNotice(''), 4000);
    setVerifyingId(null);
    await loadInterns();
  };

  // Create Company Task
  const handleCreateCompanyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyProfile || !selectedIntern) return;

    setAssigningTask(true);
    setError('');

    const res = await createInternshipTask({
      student_ids: [selectedIntern.student_id],
      internship_id: selectedIntern.id,
      company_id: companyProfile.id,
      created_by: user?.id,
      created_by_role: 'company',
      task_source: `Company (${companyProfile.company_name})`,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      instructions: newTaskInstructions.trim() || undefined,
      deadline: newTaskDeadline,
      priority: newTaskPriority,
      submission_required: true,
      submission_type: newTaskSubmissionType,
    });

    if (!res.success) {
      setError(res.error || 'Failed to create task');
      setAssigningTask(false);
      return;
    }

    setShowCreateTaskModal(false);
    setAssigningTask(false);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskInstructions('');
    setNotice(`✓ Task assigned to ${selectedIntern.student_name}!`);
    setTimeout(() => setNotice(''), 4000);

    await loadInterns();
  };

  // Review Task Submission
  const handleReviewTask = async (taskId: string, subId: string) => {
    setSubmittingTaskReview(true);
    setError('');

    const res = await reviewTaskSubmission(
      taskId,
      subId,
      taskReviewDecision,
      taskReviewComment.trim() || 'Reviewed by Company Mentor',
      user?.id,
      companyProfile?.company_name || 'Company Mentor'
    );

    if (!res.success) {
      setError(res.error || 'Failed to submit task review');
      setSubmittingTaskReview(false);
      return;
    }

    setNotice(
      taskReviewDecision === 'completed'
        ? '✓ Task deliverable verified and marked as Completed!'
        : 'Feedback sent to intern for updates.'
    );
    setTimeout(() => setNotice(''), 4000);
    setReviewingTaskId(null);
    setTaskReviewComment('');
    setSubmittingTaskReview(false);

    await loadInterns();
  };

  // Submit Daily Log Review
  const handleSubmitLogReview = async (logId: string) => {
    if (!companyProfile) return;
    setSubmittingLogReview(true);
    setError('');

    const res = await submitMentorReview(
      logId,
      logReviewDecision,
      logReviewComment.trim() || 'Reviewed and verified.',
      companyProfile.company_name || 'Company Reviewer'
    );

    if (!res.success) {
      setError(res.error || 'Failed to submit review');
      setSubmittingLogReview(false);
      return;
    }

    setNotice(`Log review saved as "${logReviewDecision.replace('_', ' ')}"!`);
    setTimeout(() => setNotice(''), 4000);
    setReviewingLogId(null);
    setLogReviewComment('');
    setSubmittingLogReview(false);

    if (selectedIntern) {
      const updatedLogs = await fetchInternshipDailyLogs(selectedIntern.id);
      setDailyLogs(updatedLogs);
      setStats(calculateProgressStats(selectedIntern, updatedLogs));
    }
  };

  // Save Attendance
  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyProfile || !selectedIntern) return;

    setSavingAttendance(true);
    setError('');

    const res = await markStudentAttendance({
      internship_id: selectedIntern.id,
      student_id: selectedIntern.student_id,
      company_id: companyProfile.id,
      date: attendanceDate,
      status: attendanceStatus,
      marked_by: user?.id,
    });

    if (!res.success) {
      setError(res.error || 'Failed to record attendance');
      setSavingAttendance(false);
      return;
    }

    setNotice(`Attendance marked as ${attendanceStatus.toUpperCase()} for ${selectedIntern.student_name}!`);
    setTimeout(() => setNotice(''), 4000);
    setSavingAttendance(false);

    const attRecords = await fetchCompanyAttendance(companyProfile.id);
    const internAtt = attRecords.filter((a) => a.student_id === selectedIntern.student_id);
    setAttendanceRecords(internAtt);
    setAttendanceStats(calculateAttendanceStats(internAtt));
  };

  // Selected intern tasks
  const selectedInternTasks = companyTasks.filter((t) =>
    selectedIntern ? t.student_id === selectedIntern.student_id : false
  );
  const internTaskStats = calculateTaskProgress(selectedInternTasks);

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
            <Users className="w-7 h-7 text-white" />
            Company Intern Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify interns, assign tasks, review submitted deliverables, and optionally record presence.
          </p>
        </div>

        {selectedIntern && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateTaskModal(true)}
            icon={<Plus className="w-4 h-4 text-black" />}
          >
            + Assign Company Task
          </Button>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Pending Verification Requests ({pendingInterns.length})
            </span>
            <span className="text-[11px] text-slate-400">— Verify interns to activate their daily tracker</span>
          </div>

          <div className="space-y-2">
            {pendingInterns.map((intern) => (
              <Card key={intern.id} className="p-4 border-amber-800/60 bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-white">{intern.student_name}</h4>
                    <Badge variant="warning">⏳ Pending Verification</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                    <span>Role: <strong className="text-white">{intern.role}</strong></span>
                    <span>•</span>
                    <span>College: {intern.student_institute}</span>
                    <span>•</span>
                    <span>Period: {new Date(intern.start_date).toLocaleDateString()} – {new Date(intern.end_date).toLocaleDateString()} ({intern.total_days} days)</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
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
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VERIFIED INTERNS DASHBOARD */}
      {verifiedInterns.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Active Interns</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {pendingInterns.length > 0
              ? 'You have pending verification requests above. Click "Verify Intern" to activate them.'
              : 'When students register an internship with your company, their tracking records will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Interns Selector Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Active Interns ({verifiedInterns.length})
            </span>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {verifiedInterns.map((intern) => {
                const isSelected = selectedIntern?.id === intern.id;
                const studentTasks = companyTasks.filter((t) => t.student_id === intern.student_id);
                const completedCount = studentTasks.filter((t) => t.status === 'completed').length;
                const pct = studentTasks.length > 0 ? Math.round((completedCount / studentTasks.length) * 100) : 0;

                return (
                  <button
                    key={intern.id}
                    type="button"
                    onClick={() => handleSelectIntern(intern)}
                    className={`w-full p-4 rounded-xl text-left transition-all border block ${
                      isSelected
                        ? 'bg-surface border-white/40 shadow-lg'
                        : 'bg-surface/50 border-surface-border hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface-border text-white text-xs font-black flex items-center justify-center shrink-0 border border-slate-700 uppercase">
                        {intern.student_name?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{intern.student_name}</h4>
                        <span className="text-[11px] text-slate-400 block truncate">{intern.role}</span>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                          <span>{intern.student_institute}</span>
                          <span className="text-emerald-400 font-bold">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Intern Detail Panel */}
          {selectedIntern && (
            <div className="lg:col-span-3 space-y-6">
              {/* Intern Overview Header */}
              <div className="p-6 rounded-2xl border border-slate-700 bg-surface shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-extrabold text-white">{selectedIntern.student_name}</h3>
                    <Badge variant={selectedIntern.status === 'completed' ? 'success' : 'info'}>
                      {selectedIntern.status === 'completed' ? 'Completed' : 'Active Intern'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {selectedIntern.student_institute}
                    </span>
                    <span>•</span>
                    <span>Role: <strong className="text-white">{selectedIntern.role}</strong></span>
                    <span>•</span>
                    <span>{new Date(selectedIntern.start_date).toLocaleDateString()} – {new Date(selectedIntern.end_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 text-center shrink-0">
                  <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Tasks Done</span>
                    <span className="text-sm font-black text-white">
                      {internTaskStats.completed_tasks} / {internTaskStats.total_tasks}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                    <span className="text-[9px] text-emerald-400 uppercase font-bold block">Progress</span>
                    <span className="text-sm font-black text-emerald-400">
                      {internTaskStats.has_tasks ? `${internTaskStats.progress_percent}%` : `${stats?.days_completed || 0} days`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-surface-border gap-6">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                    activeTab === 'tasks'
                      ? 'border-white text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Assigned Tasks ({selectedInternTasks.length})
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                    activeTab === 'logs'
                      ? 'border-white text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Daily Work Logs ({dailyLogs.length})
                </button>

                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                    activeTab === 'attendance'
                      ? 'border-white text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Attendance Management (Optional)
                </button>
              </div>

              {/* TAB 1: ASSIGNED TASKS & DELIVERABLE REVIEW */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      Tasks Assigned to {selectedIntern.student_name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateTaskModal(true)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      + Assign Task
                    </Button>
                  </div>

                  {selectedInternTasks.length === 0 ? (
                    <Card className="p-10 text-center border-dashed space-y-3">
                      <ListTodo className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-sm font-bold text-white">No tasks assigned yet</p>
                      <Button variant="primary" size="sm" onClick={() => setShowCreateTaskModal(true)}>
                        + Assign First Task
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {selectedInternTasks.map((task) => {
                        const latestSub = task.submissions?.[0];
                        const isReviewing = reviewingTaskId === task.id;

                        return (
                          <Card key={task.id} className="p-5 bg-surface border-surface-border space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-white">{task.title}</h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-950/80 border border-indigo-800 text-indigo-300">
                                    {task.task_source}
                                  </span>
                                  <Badge variant={task.status === 'completed' ? 'success' : task.status === 'overdue' ? 'danger' : 'info'}>
                                    {task.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-300">{task.description}</p>
                                <span className="text-[11px] text-slate-500 block">
                                  Deadline: {new Date(task.deadline).toLocaleDateString()} • Priority: {task.priority}
                                </span>
                              </div>

                              {latestSub && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setReviewingTaskId(isReviewing ? null : task.id);
                                    setTaskReviewComment('');
                                    setTaskReviewDecision('completed');
                                  }}
                                >
                                  {isReviewing ? 'Close' : 'Review Deliverable'}
                                </Button>
                              )}
                            </div>

                            {/* Deliverable preview */}
                            {latestSub && (
                              <div className="p-3 bg-background rounded-xl border border-surface-border space-y-2 text-xs">
                                {latestSub.submission_text && (
                                  <p className="text-slate-300">{latestSub.submission_text}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {latestSub.github_url && (
                                    <a href={latestSub.github_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                                      <Code2 className="w-3.5 h-3.5" /> GitHub Code <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                  {latestSub.demo_url && (
                                    <a href={latestSub.demo_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                                      <Globe className="w-3.5 h-3.5" /> Live Demo <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Task Review Action Drawer */}
                            {isReviewing && (
                              <div className="p-4 bg-background rounded-xl border border-slate-700 space-y-3">
                                <span className="text-xs font-bold text-white uppercase block">Record Review Decision</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setTaskReviewDecision('completed')}
                                    className={`px-3 py-1 rounded text-xs font-bold ${taskReviewDecision === 'completed' ? 'bg-emerald-600 text-white' : 'bg-surface text-slate-300'}`}
                                  >
                                    Approve (Completed)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTaskReviewDecision('changes_requested')}
                                    className={`px-3 py-1 rounded text-xs font-bold ${taskReviewDecision === 'changes_requested' ? 'bg-amber-600 text-white' : 'bg-surface text-slate-300'}`}
                                  >
                                    Request Changes
                                  </button>
                                </div>

                                <textarea
                                  rows={2}
                                  value={taskReviewComment}
                                  onChange={(e) => setTaskReviewComment(e.target.value)}
                                  placeholder="Feedback comments for student..."
                                  className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                                />

                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setReviewingTaskId(null)}>Cancel</Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    loading={submittingTaskReview}
                                    onClick={() => handleReviewTask(task.id, latestSub?.id || '')}
                                  >
                                    Submit Review
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DAILY WORK LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-3">
                  {dailyLogs.length === 0 ? (
                    <Card className="p-10 text-center border-dashed">
                      <p className="text-xs text-slate-400">No daily logs submitted by this intern yet.</p>
                    </Card>
                  ) : (
                    dailyLogs.map((log) => {
                      const isReviewing = reviewingLogId === log.id;
                      const isExpanded = expandedLogId === log.id;

                      return (
                        <Card key={log.id} className="p-5 bg-surface border-surface-border space-y-3">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="text-sm font-bold text-white">{log.title}</h4>
                                <span className="text-xs px-2 py-0.5 rounded bg-black/40 text-slate-300 font-mono">
                                  {log.hours_worked} hrs • {new Date(log.log_date).toLocaleDateString()}
                                </span>
                                <Badge variant={log.status === 'approved' ? 'success' : log.status === 'changes_requested' ? 'warning' : 'info'}>
                                  {log.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-300 mt-1">{log.description}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setReviewingLogId(isReviewing ? null : log.id);
                                  setLogReviewComment('');
                                  setLogReviewDecision('approved');
                                }}
                              >
                                {isReviewing ? 'Cancel' : 'Review Log'}
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

                          {/* Review form */}
                          {isReviewing && (
                            <div className="p-4 bg-background rounded-xl border border-slate-700 space-y-3 text-xs">
                              <span className="font-bold text-white uppercase block">Mentor Decision</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setLogReviewDecision('approved')}
                                  className={`px-3 py-1 rounded text-xs font-bold ${logReviewDecision === 'approved' ? 'bg-emerald-600 text-white' : 'bg-surface text-slate-300'}`}
                                >
                                  Approve Work
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLogReviewDecision('changes_requested')}
                                  className={`px-3 py-1 rounded text-xs font-bold ${logReviewDecision === 'changes_requested' ? 'bg-amber-600 text-white' : 'bg-surface text-slate-300'}`}
                                >
                                  Request Changes
                                </button>
                              </div>

                              <textarea
                                rows={2}
                                value={logReviewComment}
                                onChange={(e) => setLogReviewComment(e.target.value)}
                                placeholder="Mentor feedback..."
                                className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                              />

                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setReviewingLogId(null)}>Cancel</Button>
                                <Button variant="primary" size="sm" loading={submittingLogReview} onClick={() => handleSubmitLogReview(log.id)}>
                                  Save Review
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: ATTENDANCE MANAGEMENT (OPTIONAL) */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  {/* Mark Attendance Form */}
                  <Card className="p-6 bg-surface border-surface-border space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Record Attendance for {selectedIntern.student_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Attendance is optional. Mark daily presence to maintain institutional records.
                      </p>
                    </div>

                    <form onSubmit={handleRecordAttendance} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                        <input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Presence Status</label>
                        <select
                          value={attendanceStatus}
                          onChange={(e) => setAttendanceStatus(e.target.value as any)}
                          className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                        >
                          <option value="present">● Present</option>
                          <option value="absent">✕ Absent</option>
                          <option value="half_day">◐ Half Day</option>
                          <option value="leave">● Approved Leave</option>
                        </select>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={savingAttendance}
                        icon={<Check className="w-4 h-4 text-black" />}
                      >
                        Save Presence
                      </Button>
                    </form>
                  </Card>

                  {/* Attendance Log History */}
                  {attendanceRecords.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <p className="text-xs text-slate-400">No attendance records logged for this intern yet.</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-400 block">
                        Logged Attendance History ({attendanceStats?.attendance_rate_percent}% Attendance Rate)
                      </span>
                      {attendanceRecords.map((rec) => (
                        <div key={rec.id} className="p-3 bg-surface rounded-xl border border-surface-border flex justify-between items-center text-xs">
                          <span className="font-semibold text-white">
                            {new Date(rec.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <Badge variant={rec.status === 'present' ? 'success' : rec.status === 'absent' ? 'danger' : 'warning'}>
                            ● {rec.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE COMPANY TASK MODAL */}
      {showCreateTaskModal && selectedIntern && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto antialiased">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">+ Assign Company Task</h3>
                <p className="text-xs text-slate-400 mt-0.5">Assigning to {selectedIntern.student_name}</p>
              </div>
              <button type="button" onClick={() => setShowCreateTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompanyTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Build Payment Gateway Webhook Integration"
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Describe deliverables and requirements..."
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Required Deliverable</label>
                <select
                  value={newTaskSubmissionType}
                  onChange={(e) => setNewTaskSubmissionType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="multiple">Multiple (File/Git/Demo)</option>
                  <option value="github">GitHub Link</option>
                  <option value="file">File Upload / PDF</option>
                  <option value="text">Written Text Response</option>
                  <option value="url">Demo URL</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <Button type="button" variant="outline" size="md" onClick={() => setShowCreateTaskModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={assigningTask} icon={<Send className="w-4 h-4 text-black" />}>
                  Assign Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
