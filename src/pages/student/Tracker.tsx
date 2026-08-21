import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStudentInternships,
  createStudentInternship,
  fetchInternshipDailyLogs,
  submitDailyWorkLog,
  uploadEvidenceFile,
  calculateProgressStats,
  fetchRegisteredCompanies,
  fetchStudentTasks,
  submitTaskDeliverable,
  calculateTaskProgress,
  fetchStudentAttendance,
  calculateAttendanceStats,
} from '../../lib/internshipTracker';
import type { RegisteredCompany } from '../../lib/internshipTracker';
import type {
  StudentInternship,
  InternshipDailyLog,
  InternshipProgressStats,
  EvidenceType,
  InternshipTask,
  StudentTaskProgressStats,
  InternshipAttendanceRecord,
  AttendanceSummaryStats,
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
  Code2,
  Globe,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
  FileCheck,
  ShieldAlert,
  Search,
  ListTodo,
  UserCheck,
  Send,
} from 'lucide-react';

export const StudentTracker: React.FC = () => {
  const { studentProfile } = useAuth();

  const [_internships, setInternships] = useState<StudentInternship[]>([]);
  const [activeInternship, setActiveInternship] = useState<StudentInternship | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'logs' | 'attendance'>('tasks');
  const [loading, setLoading] = useState(true);

  // Tasks State
  const [tasks, setTasks] = useState<InternshipTask[]>([]);
  const [taskStats, setTaskStats] = useState<StudentTaskProgressStats | null>(null);
  const [selectedTask, setSelectedTask] = useState<InternshipTask | null>(null);
  const [taskFilter, setTaskFilter] = useState<string>('all');

  // Task Submission Form State
  const [showTaskSubmitModal, setShowTaskSubmitModal] = useState(false);
  const [taskSubmissionText, setTaskSubmissionText] = useState('');
  const [taskGithubUrl, setTaskGithubUrl] = useState('');
  const [taskDemoUrl, setTaskDemoUrl] = useState('');
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Daily Logs & Progress
  const [dailyLogs, setDailyLogs] = useState<InternshipDailyLog[]>([]);
  const [stats, setStats] = useState<InternshipProgressStats | null>(null);

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<InternshipAttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceSummaryStats | null>(null);

  // Modals & Forms
  const [showAddInternshipModal, setShowAddInternshipModal] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<InternshipDailyLog | null>(null);

  // Registered Companies for Add Internship Modal
  const [registeredCompanies, setRegisteredCompanies] = useState<RegisteredCompany[]>([]);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyInputMode, setCompanyInputMode] = useState<'registered' | 'custom'>('registered');

  // Add Internship Form
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newTotalDays, setNewTotalDays] = useState(30);
  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [submittingInternship, setSubmittingInternship] = useState(false);

  // Daily Log Form
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTitle, setLogTitle] = useState('');
  const [logHours, setLogHours] = useState(4);
  const [logDescription, setLogDescription] = useState('');
  const [logTasksCompleted, setLogTasksCompleted] = useState('');
  const [logLearnings, setLogLearnings] = useState('');
  const [logBlockers, setLogBlockers] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingLog, setUploadingLog] = useState(false);

  const [formError, setFormError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Fetch student internships & tasks on mount
  const loadData = useCallback(async () => {
    if (!studentProfile) return;
    setLoading(true);

    try {
      // 1. Fetch internships
      const list = await fetchStudentInternships(studentProfile.id);
      setInternships(list);

      if (list.length > 0) {
        const active = list.find((i) => i.status === 'active')
          || list.find((i) => i.status === 'pending_verification')
          || list[0];
        setActiveInternship(active);

        if (active.status !== 'pending_verification') {
          const logs = await fetchInternshipDailyLogs(active.id);
          setDailyLogs(logs);
          setStats(calculateProgressStats(active, logs));
        } else {
          setDailyLogs([]);
          setStats(null);
        }
      } else {
        setActiveInternship(null);
        setDailyLogs([]);
        setStats(null);
      }

      // 2. Fetch assigned tasks
      const studentTasks = await fetchStudentTasks(studentProfile.id);
      setTasks(studentTasks);
      setTaskStats(calculateTaskProgress(studentTasks));

      // 3. Fetch attendance
      const attRecords = await fetchStudentAttendance(studentProfile.id);
      setAttendanceRecords(attRecords);
      setAttendanceStats(calculateAttendanceStats(attRecords));
    } catch (err) {
      console.error('Error loading student tracker data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load registered companies when modal opens
  const handleOpenAddInternshipModal = async () => {
    setFormError('');
    setShowAddInternshipModal(true);
    setSelectedCompanyId('');
    setSelectedCompanyName('');
    setCompanySearchTerm('');
    setNewRole('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNewTotalDays(30);
    setNewMentorName('');
    setNewMentorEmail('');
    setLoadingCompanies(true);

    try {
      const companies = await fetchRegisteredCompanies();
      setRegisteredCompanies(companies);
      if (companies.length === 0) {
        setCompanyInputMode('custom');
      } else {
        setCompanyInputMode('registered');
      }
    } catch {
      setCompanyInputMode('custom');
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Handle creating a new internship track
  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile) return;

    if (!selectedCompanyName.trim()) {
      setFormError('Please choose or enter your company name.');
      return;
    }
    if (!newRole.trim()) {
      setFormError('Internship role is required.');
      return;
    }

    setSubmittingInternship(true);
    setFormError('');

    const res = await createStudentInternship(studentProfile.id, {
      company_name: selectedCompanyName.trim(),
      role: newRole.trim(),
      start_date: newStartDate,
      end_date: newEndDate,
      total_days: Number(newTotalDays) || 30,
      company_id: selectedCompanyId || null,
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
    setSuccessNotice('Internship request sent for verification! Tracker will activate once the company confirms your internship.');
    setTimeout(() => setSuccessNotice(''), 8000);

    await loadData();
  };

  // Open Task Submission Modal
  const handleOpenSubmitTask = (task: InternshipTask) => {
    setSelectedTask(task);
    setTaskSubmissionText('');
    setTaskGithubUrl('');
    setTaskDemoUrl('');
    setTaskFile(null);
    setFormError('');
    setShowTaskSubmitModal(true);
  };

  // Submit Task Deliverable
  const handleSubmitTaskDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentProfile || !selectedTask) return;

    if (!taskSubmissionText.trim() && !taskFile && !taskGithubUrl.trim() && !taskDemoUrl.trim()) {
      setFormError('Please provide a written response, upload a file, or enter a GitHub/demo URL.');
      return;
    }

    setSubmittingTask(true);
    setFormError('');

    try {
      let uploadedFileUrl: string | undefined = undefined;
      let uploadedFileName: string | undefined = undefined;

      if (taskFile) {
        const uploadRes = await uploadEvidenceFile(taskFile, studentProfile.id, selectedTask.id);
        if (uploadRes.success && uploadRes.url) {
          uploadedFileUrl = uploadRes.url;
          uploadedFileName = taskFile.name;
        }
      }

      const res = await submitTaskDeliverable({
        task_id: selectedTask.id,
        student_id: studentProfile.id,
        submission_text: taskSubmissionText.trim() || undefined,
        file_url: uploadedFileUrl,
        file_name: uploadedFileName,
        github_url: taskGithubUrl.trim() || undefined,
        demo_url: taskDemoUrl.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to submit task deliverable');
        setSubmittingTask(false);
        return;
      }

      setShowTaskSubmitModal(false);
      setSubmittingTask(false);
      setSuccessNotice(`✓ Task "${selectedTask.title}" submitted successfully! Waiting for verification.`);
      setTimeout(() => setSuccessNotice(''), 6000);

      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Submission error');
      setSubmittingTask(false);
    }
  };

  // Open Daily Log Modal
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
      setEvidenceFile(null);
    }
    setShowAddLogModal(true);
  };

  // Submit Daily Log
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

      if (githubUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'github',
          title: 'GitHub Commit / PR',
          url: githubUrl.trim(),
        });
      }

      if (demoUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'demo',
          title: 'Live Project Demo',
          url: demoUrl.trim(),
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

      const updatedLogs = await fetchInternshipDailyLogs(activeInternship.id);
      setDailyLogs(updatedLogs);
      setStats(calculateProgressStats(activeInternship, updatedLogs));
    } catch (err: any) {
      setFormError('Submission failed: ' + (err.message || 'Unknown error'));
      setUploadingLog(false);
    }
  };

  const filteredCompanies = registeredCompanies.filter((c) =>
    c.company_name.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'pending') return ['not_started', 'in_progress', 'changes_requested'].includes(t.status);
    if (taskFilter === 'completed') return t.status === 'completed';
    if (taskFilter === 'submitted') return ['submitted', 'under_review'].includes(t.status);
    if (taskFilter === 'overdue') return t.status === 'overdue';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const isPendingVerification = activeInternship?.status === 'pending_verification';

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-white" />
            Student Internship Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete tasks assigned by your College / T&P and Company, submit verifiable evidence, and track institutional progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeInternship && !isPendingVerification && (
            <Button
              variant="outline"
              size="md"
              onClick={() => handleOpenAddLog()}
              icon={<Plus className="w-4 h-4" />}
            >
              + Log Today's Work
            </Button>
          )}

          {!activeInternship && (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenAddInternshipModal}
              icon={<Plus className="w-4 h-4 text-black" />}
            >
              + Add Internship Track
            </Button>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* PENDING VERIFICATION BLOCKER */}
      {isPendingVerification && activeInternship && (
        <Card className="p-8 text-center border-amber-800/60 bg-amber-950/20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/50 text-amber-400 flex items-center justify-center mx-auto border border-amber-800/40">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Awaiting Company Verification</h2>
            <p className="text-xs text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
              Your internship request at <strong className="text-amber-300">{activeInternship.company_name}</strong> as <strong className="text-white">{activeInternship.role}</strong> has been submitted.
              The company must verify and confirm your internship before the daily work tracker becomes active.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
            <div className="p-3 bg-background rounded-xl border border-surface-border text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Company</span>
              <span className="text-xs font-bold text-white mt-0.5 block truncate">{activeInternship.company_name}</span>
            </div>
            <div className="p-3 bg-background rounded-xl border border-surface-border text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Role</span>
              <span className="text-xs font-bold text-white mt-0.5 block truncate">{activeInternship.role}</span>
            </div>
            <div className="p-3 bg-background rounded-xl border border-surface-border text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Start Date</span>
              <span className="text-xs font-bold text-white mt-0.5 block">{new Date(activeInternship.start_date).toLocaleDateString()}</span>
            </div>
            <div className="p-3 bg-background rounded-xl border border-surface-border text-center">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Status</span>
              <Badge variant="warning">Pending Verification</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Main Internship Dashboard */}
      {activeInternship && !isPendingVerification && (
        <div className="space-y-6">
          {/* Internship Overview Banner */}
          <div className="p-6 rounded-2xl border border-slate-700 bg-gradient-to-r from-surface via-sidebar to-surface shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {activeInternship.company_name}
                </span>
                <Badge variant={activeInternship.status === 'completed' ? 'success' : 'info'}>
                  {activeInternship.status === 'completed' ? 'Completed Record' : 'Active Internship'}
                </Badge>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">{activeInternship.role}</h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(activeInternship.start_date).toLocaleDateString()} – {new Date(activeInternship.end_date).toLocaleDateString()}
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

            {/* Calculated Task Progress Meter */}
            <div className="flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-surface-border pt-4 md:pt-0 md:pl-6 shrink-0 w-full md:w-auto">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Overall Progress</span>
                <p className="text-3xl font-black text-white">
                  {taskStats && taskStats.has_tasks ? `${taskStats.progress_percent}%` : stats?.days_completed ? `${Math.round((stats.days_completed / activeInternship.total_days) * 100)}%` : 'No tasks'}
                </p>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {taskStats && taskStats.has_tasks
                  ? `${taskStats.completed_tasks} of ${taskStats.total_tasks} tasks completed`
                  : `${stats?.days_completed || 0} / ${activeInternship.total_days} days recorded`}
              </span>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-surface border-surface-border">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Tasks</span>
              <span className="text-2xl font-black text-white mt-1 block">{taskStats?.total_tasks || 0}</span>
              <span className="text-[10px] text-slate-500">From T&P and Company</span>
            </Card>

            <Card className="p-4 bg-surface border-surface-border">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Completed</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{taskStats?.completed_tasks || 0}</span>
              <span className="text-[10px] text-slate-500">Verified & Approved</span>
            </Card>

            <Card className="p-4 bg-surface border-surface-border">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending / In Progress</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">{taskStats?.pending_tasks || 0}</span>
              <span className="text-[10px] text-slate-500">Awaiting submission</span>
            </Card>

            <Card className="p-4 bg-surface border-surface-border">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Overdue</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">{taskStats?.overdue_tasks || 0}</span>
              <span className="text-[10px] text-slate-500">Past deadline</span>
            </Card>
          </div>

          {/* Navigation Tabs */}
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
              My Tasks ({tasks.length})
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
              Attendance {attendanceStats?.enabled ? `(${attendanceStats.attendance_rate_percent}%)` : '(Optional)'}
            </button>
          </div>

          {/* TAB 1: MY ASSIGNED TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Task Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: `All (${tasks.length})` },
                    { id: 'pending', label: `Pending (${taskStats?.pending_tasks || 0})` },
                    { id: 'submitted', label: `Under Review (${taskStats?.under_review_tasks || 0})` },
                    { id: 'completed', label: `Completed (${taskStats?.completed_tasks || 0})` },
                    { id: 'overdue', label: `Overdue (${taskStats?.overdue_tasks || 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTaskFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        taskFilter === tab.id
                          ? 'bg-white text-black border-white'
                          : 'bg-surface-border text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <Card className="p-12 text-center border-dashed space-y-3">
                  <ListTodo className="w-8 h-8 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No tasks found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {tasks.length === 0
                      ? 'Your College / T&P Department or Company has not assigned any internship tasks yet.'
                      : 'No tasks match the selected filter.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const isOverdue = task.status === 'overdue';
                    const isChangesReq = task.status === 'changes_requested';
                    const isSubmitted = task.status === 'submitted' || task.status === 'under_review';

                    return (
                      <Card
                        key={task.id}
                        className={`p-5 transition-all border ${
                          isCompleted
                            ? 'border-emerald-900/40 bg-emerald-950/10'
                            : isChangesReq
                            ? 'border-amber-800 bg-amber-950/20'
                            : isOverdue
                            ? 'border-rose-900/60 bg-rose-950/10'
                            : 'border-surface-border bg-surface'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h4 className="text-base font-bold text-white">{task.title}</h4>

                              {/* Task Source Badge */}
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-950/80 border border-indigo-800 text-indigo-300 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-indigo-400" />
                                {task.task_source}
                              </span>

                              {/* Priority Badge */}
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                task.priority === 'high'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : task.priority === 'medium'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {task.priority} Priority
                              </span>

                              {/* Status Badge */}
                              <Badge
                                variant={
                                  isCompleted
                                    ? 'success'
                                    : isChangesReq
                                    ? 'warning'
                                    : isOverdue
                                    ? 'danger'
                                    : isSubmitted
                                    ? 'info'
                                    : 'default'
                                }
                              >
                                {isCompleted
                                  ? '✓ Completed'
                                  : isChangesReq
                                  ? '⚠ Changes Requested'
                                  : isOverdue
                                  ? '⌛ Overdue'
                                  : isSubmitted
                                  ? '● Submitted (Under Review)'
                                  : '● Pending'}
                              </Badge>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                              {task.description}
                            </p>

                            <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                Deadline: <strong className={isOverdue ? 'text-rose-400' : 'text-slate-300'}>{new Date(task.deadline).toLocaleDateString()}</strong>
                              </span>

                              {task.submission_required && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <FileCheck className="w-3 h-3 text-slate-500" />
                                  Requires: <strong className="text-slate-300 uppercase">{task.submission_type}</strong>
                                </span>
                              )}
                            </div>

                            {/* Reviewer Feedback Notice if Changes Requested */}
                            {isChangesReq && task.submissions && task.submissions.length > 0 && task.submissions[0].review_comment && (
                              <div className="mt-2 p-2.5 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-200 text-xs">
                                <strong>Feedback from {task.submissions[0].reviewer_name || 'Reviewer'}:</strong> "{task.submissions[0].review_comment}"
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            {isCompleted ? (
                              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                                <Check className="w-4 h-4" /> Verified
                              </span>
                            ) : (
                              <Button
                                variant={isChangesReq ? 'secondary' : 'primary'}
                                size="sm"
                                onClick={() => handleOpenSubmitTask(task)}
                                icon={<Send className="w-3.5 h-3.5" />}
                              >
                                {isChangesReq ? 'Resubmit Work' : isSubmitted ? 'Update Submission' : 'Submit Task Work'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAILY WORK LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-surface-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Daily Work Log Timeline ({dailyLogs.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Record your daily tasks, hours worked, and deliverables for mentor reviews.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAddLog()}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  + Add Today's Log
                </Button>
              </div>

              {dailyLogs.length === 0 ? (
                <Card className="p-10 text-center border-dashed space-y-3">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-white">No daily logs recorded yet</p>
                  <Button variant="primary" size="sm" onClick={() => handleOpenAddLog()}>
                    + Add Today's Work
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {dailyLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <Card key={log.id} className="p-5 bg-surface border-surface-border space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-surface-border text-white text-xs font-black flex flex-col items-center justify-center shrink-0 border border-slate-700">
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
                                <Badge variant={log.status === 'approved' ? 'success' : log.status === 'changes_requested' ? 'warning' : 'info'}>
                                  {log.status === 'approved' ? '✓ Approved' : log.status === 'changes_requested' ? '⚠ Changes Requested' : '● Pending'}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{log.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {log.status === 'changes_requested' && (
                              <Button variant="primary" size="sm" onClick={() => handleOpenAddLog(log)}>
                                Update & Resubmit
                              </Button>
                            )}
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

                        {isExpanded && (
                          <div className="pt-3 border-t border-surface-border space-y-3 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="p-3 bg-background rounded-lg border border-surface-border">
                                <span className="font-bold text-slate-300 block mb-1">Tasks Completed:</span>
                                <p className="text-slate-300 whitespace-pre-line">{log.tasks_completed || log.description}</p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border border-surface-border">
                                <span className="font-bold text-emerald-400 block mb-1">Learnings:</span>
                                <p className="text-slate-300 whitespace-pre-line">{log.learnings || 'Applied technical problem solving.'}</p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border border-surface-border">
                                <span className="font-bold text-amber-400 block mb-1">Blockers:</span>
                                <p className="text-slate-300 whitespace-pre-line">{log.blockers || 'None.'}</p>
                              </div>
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

          {/* TAB 3: ATTENDANCE (OPTIONAL) */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {!attendanceStats?.enabled ? (
                <Card className="p-10 text-center border-dashed space-y-3">
                  <UserCheck className="w-8 h-8 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Attendance tracking is not enabled</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Your employer has not recorded any attendance logs yet. Attendance is optional and enabled directly by your company mentor.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Attendance Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card className="p-4 bg-surface border-surface-border text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Attendance Rate</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1 block">{attendanceStats.attendance_rate_percent}%</span>
                    </Card>
                    <Card className="p-4 bg-surface border-surface-border text-center">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Present</span>
                      <span className="text-2xl font-black text-white mt-1 block">{attendanceStats.present_days} days</span>
                    </Card>
                    <Card className="p-4 bg-surface border-surface-border text-center">
                      <span className="text-[10px] text-rose-400 uppercase font-bold block">Absent</span>
                      <span className="text-2xl font-black text-white mt-1 block">{attendanceStats.absent_days} days</span>
                    </Card>
                    <Card className="p-4 bg-surface border-surface-border text-center">
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">Half Day</span>
                      <span className="text-2xl font-black text-white mt-1 block">{attendanceStats.half_days} days</span>
                    </Card>
                    <Card className="p-4 bg-surface border-surface-border text-center">
                      <span className="text-[10px] text-indigo-400 uppercase font-bold block">Approved Leave</span>
                      <span className="text-2xl font-black text-white mt-1 block">{attendanceStats.leave_days} days</span>
                    </Card>
                  </div>

                  {/* Attendance History List */}
                  <div className="space-y-2">
                    {attendanceRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 bg-surface rounded-xl border border-surface-border flex justify-between items-center text-xs"
                      >
                        <span className="font-semibold text-white">
                          {new Date(rec.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <Badge
                          variant={
                            rec.status === 'present'
                              ? 'success'
                              : rec.status === 'absent'
                              ? 'danger'
                              : rec.status === 'half_day'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          ● {rec.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Task Submission Modal */}
      {showTaskSubmitModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto antialiased">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Submit Work for Task</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTask.title} • Assigned by {selectedTask.task_source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskSubmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Instructions */}
            <div className="p-3.5 bg-background rounded-xl border border-surface-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">Task Description:</span>
                <span className="text-[10px] text-slate-400">Deadline: {new Date(selectedTask.deadline).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{selectedTask.description}</p>
              {selectedTask.instructions && (
                <div className="pt-2 border-t border-surface-border">
                  <span className="font-bold text-amber-400 block mb-1">Instructions:</span>
                  <p className="text-slate-300 leading-relaxed">{selectedTask.instructions}</p>
                </div>
              )}
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitTaskDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Written Response / Explanation
                </label>
                <textarea
                  rows={3}
                  value={taskSubmissionText}
                  onChange={(e) => setTaskSubmissionText(e.target.value)}
                  placeholder="Describe your implementation, tests performed, or deliverables completed..."
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5" /> GitHub Commit / PR URL
                  </label>
                  <input
                    type="url"
                    value={taskGithubUrl}
                    onChange={(e) => setTaskGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> Live Demo / Deployed URL
                  </label>
                  <input
                    type="url"
                    value={taskDemoUrl}
                    onChange={(e) => setTaskDemoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> File Upload / Screenshot Evidence
                </label>
                <input
                  type="file"
                  onChange={(e) => setTaskFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-border file:text-white hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowTaskSubmitModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submittingTask}
                  icon={<Send className="w-4 h-4 text-black" />}
                >
                  Submit Task for Verification
                </Button>
              </div>
            </form>
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
              <div>
                <h3 className="text-lg font-bold text-white">+ Add Internship Track</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select from registered AVUNK companies or enter your company name.
                </p>
              </div>
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
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-300">
                    Company / Organization *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCompanyInputMode('registered')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                        companyInputMode === 'registered'
                          ? 'bg-white text-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Directory ({registeredCompanies.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyInputMode('custom');
                        setSelectedCompanyId('');
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                        companyInputMode === 'custom'
                          ? 'bg-white text-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Enter Directly
                    </button>
                  </div>
                </div>

                {companyInputMode === 'registered' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={companySearchTerm}
                        onChange={(e) => setCompanySearchTerm(e.target.value)}
                        placeholder="Search company..."
                        className="w-full pl-9 pr-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto border border-surface-border rounded-xl bg-background divide-y divide-surface-border/40">
                      {loadingCompanies ? (
                        <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading companies...</span>
                        </div>
                      ) : filteredCompanies.length === 0 ? (
                        <div className="p-4 text-center space-y-1.5">
                          <p className="text-xs text-slate-400">No companies found in directory.</p>
                          <button
                            type="button"
                            onClick={() => setCompanyInputMode('custom')}
                            className="text-[11px] text-emerald-400 underline font-semibold"
                          >
                            Click to enter company directly
                          </button>
                        </div>
                      ) : (
                        filteredCompanies.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => {
                              setSelectedCompanyId(company.id);
                              setSelectedCompanyName(company.company_name);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              selectedCompanyId === company.id
                                ? 'bg-emerald-950/40 text-emerald-300'
                                : 'hover:bg-surface-hover text-white'
                            }`}
                          >
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold block truncate">{company.company_name}</span>
                              {company.industry && (
                                <span className="text-[10px] text-slate-500 block truncate">{company.industry}</span>
                              )}
                            </div>
                            {selectedCompanyId === company.id && (
                              <Check className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {selectedCompanyName && (
                      <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected: <strong>{selectedCompanyName}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={selectedCompanyName}
                      onChange={(e) => setSelectedCompanyName(e.target.value)}
                      placeholder="e.g. Apex Systems Labs / Google / Microsoft"
                      className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Internship Role *</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer Intern"
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
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
                  Save Track
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
