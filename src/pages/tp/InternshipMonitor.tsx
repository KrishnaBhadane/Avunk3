import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllInternshipsForTP,
  fetchAllTasksForTP,
  createInternshipTask,
  reviewTaskSubmission,
  verifyInternship,
} from '../../lib/internshipTracker';
import type { TPInternshipRecord } from '../../lib/internshipTracker';
import type {
  InternshipTask,
  TaskPriority,
  TaskSubmissionType,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  ShieldX,
  BarChart3,
  Search,
  Plus,
  ListTodo,
  Clock,
  Check,
  Send,
  ExternalLink,
  Code2,
  Globe,
  FileText,
  X,
  Printer,
} from 'lucide-react';

export const TPInternshipMonitor: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'students' | 'tasks' | 'reviews'>('students');
  const [records, setRecords] = useState<TPInternshipRecord[]>([]);
  const [allTasks, setAllTasks] = useState<InternshipTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Create Task Modal State
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskSubmissionRequired, setTaskSubmissionRequired] = useState(true);
  const [taskSubmissionType, setTaskSubmissionType] = useState<TaskSubmissionType>('multiple');
  const [assignMode, setAssignMode] = useState<'all' | 'individual' | 'company'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Task Review Form State
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'completed' | 'changes_requested' | 'rejected'>('completed');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Printable Report Modal
  const [showReportModal, setShowReportModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [internshipsData, tasksData] = await Promise.all([
        fetchAllInternshipsForTP(),
        fetchAllTasksForTP(),
      ]);
      setRecords(internshipsData);
      setAllTasks(tasksData);
    } catch (err) {
      console.error('Error loading T&P data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Verify Internship
  const handleVerify = async (internshipId: string, decision: 'active' | 'rejected') => {
    setVerifyingId(internshipId);
    setError('');

    const res = await verifyInternship(internshipId, decision);
    if (!res.success) {
      setError(res.error || 'Failed to process');
      setVerifyingId(null);
      return;
    }

    setNotice(decision === 'active' ? 'Internship verified and activated.' : 'Internship request rejected.');
    setTimeout(() => setNotice(''), 4000);
    setVerifyingId(null);
    await loadData();
  };

  // Handle Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDescription.trim()) {
      setError('Task title and description are required.');
      return;
    }

    let targetStudentIds: string[] = [];

    if (assignMode === 'all') {
      targetStudentIds = records.map((r) => r.internship.student_id);
    } else if (assignMode === 'company') {
      targetStudentIds = records
        .filter((r) => r.internship.company_id === selectedCompanyId)
        .map((r) => r.internship.student_id);
    } else {
      targetStudentIds = selectedStudentIds;
    }

    // Deduplicate student IDs
    targetStudentIds = [...new Set(targetStudentIds)];

    if (targetStudentIds.length === 0) {
      setError('Please select at least one active student to assign this task.');
      return;
    }

    setCreatingTask(true);
    setError('');

    const res = await createInternshipTask({
      student_ids: targetStudentIds,
      created_by: user?.id,
      created_by_role: 'tp',
      task_source: 'Training & Placement Department',
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      instructions: taskInstructions.trim() || undefined,
      deadline: taskDeadline,
      priority: taskPriority,
      submission_required: taskSubmissionRequired,
      submission_type: taskSubmissionType,
    });

    if (!res.success) {
      setError(res.error || 'Failed to assign task');
      setCreatingTask(false);
      return;
    }

    setShowCreateTaskModal(false);
    setCreatingTask(false);
    setTaskTitle('');
    setTaskDescription('');
    setTaskInstructions('');
    setSelectedStudentIds([]);
    setNotice(`✓ Task assigned successfully to ${targetStudentIds.length} student(s)!`);
    setTimeout(() => setNotice(''), 5000);

    await loadData();
  };

  // Handle Review Task Submission
  const handleReviewSubmission = async (taskId: string, subId: string) => {
    if (!reviewComment.trim() && reviewDecision !== 'completed') {
      setError('Please provide feedback instructions when requesting changes or rejecting.');
      return;
    }

    setSubmittingReview(true);
    setError('');

    const res = await reviewTaskSubmission(
      taskId,
      subId,
      reviewDecision,
      reviewComment.trim() || 'Approved by Training & Placement Department',
      user?.id,
      'Training & Placement Department'
    );

    if (!res.success) {
      setError(res.error || 'Failed to save review');
      setSubmittingReview(false);
      return;
    }

    setNotice(
      reviewDecision === 'completed'
        ? 'Task verified and marked as Completed!'
        : 'Feedback sent to student for updates.'
    );
    setTimeout(() => setNotice(''), 4000);
    setReviewingTaskId(null);
    setReviewComment('');
    setSubmittingReview(false);

    await loadData();
  };

  // Filter students
  const filteredRecords = records.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.internship.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student_institute.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter tasks
  const filteredTasks = allTasks.filter((t) => {
    return (
      searchTerm === '' ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.student_name && t.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.company_name && t.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Pending review submissions
  const pendingSubmissions = allTasks.filter((t) =>
    ['submitted', 'under_review'].includes(t.status)
  );

  // Overall Metrics
  const totalStudents = [...new Set(records.map((r) => r.internship.student_id))].length;
  const activeInternships = records.filter((r) => r.internship.status === 'active').length;
  const tasksAssigned = allTasks.length;
  const tasksCompleted = allTasks.filter((t) => t.status === 'completed').length;
  const pendingReviewsCount = pendingSubmissions.length;
  const overdueTasksCount = allTasks.filter((t) => t.status === 'overdue').length;

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
            <BarChart3 className="w-7 h-7 text-white" />
            Student Tracker — College / T&P
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assign internship tasks, review student deliverables, track institutional progress, and generate verified reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowReportModal(true)}
            icon={<Printer className="w-4 h-4" />}
          >
            Generate Report
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setShowCreateTaskModal(true);
              setError('');
            }}
            icon={<Plus className="w-4 h-4 text-black" />}
          >
            + Create Task
          </Button>
        </div>
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

      {/* Main Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Students</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalStudents}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Active Internships</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{activeInternships}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-slate-300 uppercase font-bold block">Tasks Assigned</span>
          <span className="text-2xl font-black text-white mt-1 block">{tasksAssigned}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Tasks Completed</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{tasksCompleted}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Review</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingReviewsCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-rose-400 uppercase font-bold block">Overdue Tasks</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">{overdueTasksCount}</span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-border gap-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Enrolled Interns ({records.length})
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          All Tasks Assigned ({allTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Submissions ({pendingSubmissions.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, company, or task..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
          />
        </div>

        {activeTab === 'students' && (
          <div className="flex gap-1.5">
            {['all', 'pending_verification', 'active', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                  filterStatus === status
                    ? 'bg-white text-black border-white'
                    : 'bg-surface-border text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {status === 'all' ? 'All' : status === 'pending_verification' ? 'Pending Verification' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: ENROLLED STUDENTS INTERNSHIP TABLE */}
      {activeTab === 'students' && (
        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <Card className="p-12 text-center border-dashed space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-lg font-bold text-white">No Enrolled Interns Found</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No students currently match your filter criteria.
              </p>
            </Card>
          ) : (
            filteredRecords.map((record) => {
              const { internship } = record;
              const isExpanded = expandedId === internship.id;
              const isPending = internship.status === 'pending_verification';

              // Calculate student specific tasks
              const studentTasks = allTasks.filter((t) => t.student_id === internship.student_id);
              const completedTasksCount = studentTasks.filter((t) => t.status === 'completed').length;
              const progressPct = studentTasks.length > 0
                ? Math.round((completedTasksCount / studentTasks.length) * 100)
                : record.consistency_percent;

              return (
                <Card
                  key={internship.id}
                  className={`p-5 transition-all border ${
                    isPending
                      ? 'border-amber-800/50 bg-amber-950/10'
                      : internship.status === 'active'
                      ? 'border-surface-border bg-surface'
                      : 'border-surface-border bg-surface'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-surface-border text-white text-xs font-black flex items-center justify-center shrink-0 border border-slate-700 uppercase">
                        {record.student_name.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{record.student_name}</h4>
                          <Badge
                            variant={
                              isPending
                                ? 'warning'
                                : internship.status === 'active'
                                ? 'info'
                                : 'success'
                            }
                          >
                            {isPending
                              ? '⏳ Pending Verification'
                              : internship.status === 'active'
                              ? '● Active'
                              : '✓ Completed'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {record.company_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {record.student_institute}
                          </span>
                          <span className="text-slate-500">{internship.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {!isPending && (
                        <div className="flex gap-2 text-center">
                          <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Tasks</span>
                            <span className="text-sm font-black text-white">
                              {studentTasks.length > 0 ? `${completedTasksCount}/${studentTasks.length}` : `${record.approved_logs} logs`}
                            </span>
                          </div>

                          <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                            <span className="text-[9px] text-emerald-400 uppercase font-bold block">Progress</span>
                            <span className="text-sm font-black text-emerald-400">{progressPct}%</span>
                          </div>
                        </div>
                      )}

                      {isPending && (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            loading={verifyingId === internship.id}
                            onClick={() => handleVerify(internship.id, 'active')}
                            icon={<ShieldCheck className="w-3.5 h-3.5 text-black" />}
                          >
                            Verify
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={verifyingId === internship.id}
                            onClick={() => handleVerify(internship.id, 'rejected')}
                            icon={<ShieldX className="w-3.5 h-3.5" />}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : internship.id)}
                        icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Detail Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-surface-border space-y-3 text-xs">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-background rounded-xl border border-surface-border">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                          <span className="text-xs font-bold text-white mt-0.5 block">{internship.total_days} days</span>
                        </div>
                        <div className="p-3 bg-background rounded-xl border border-surface-border">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Period</span>
                          <span className="text-[11px] font-medium text-white mt-0.5 block">
                            {new Date(internship.start_date).toLocaleDateString()} – {new Date(internship.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="p-3 bg-background rounded-xl border border-surface-border">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Hours Logged</span>
                          <span className="text-xs font-bold text-white mt-0.5 block">{record.total_hours} hrs</span>
                        </div>
                        <div className="p-3 bg-background rounded-xl border border-surface-border">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Deliverables Logged</span>
                          <span className="text-xs font-bold text-white mt-0.5 block">{record.total_logs} logs ({record.approved_logs} approved)</span>
                        </div>
                      </div>

                      {studentTasks.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                            Assigned Tasks ({studentTasks.length})
                          </span>
                          <div className="space-y-1">
                            {studentTasks.map((st) => (
                              <div key={st.id} className="p-2.5 bg-background rounded-lg border border-surface-border flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-semibold text-white">{st.title}</span>
                                  <span className="text-[10px] text-slate-400 ml-2">Source: {st.task_source}</span>
                                </div>
                                <Badge variant={st.status === 'completed' ? 'success' : st.status === 'overdue' ? 'danger' : 'info'}>
                                  {st.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ALL TASKS ASSIGNED */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card className="p-12 text-center border-dashed space-y-3">
              <ListTodo className="w-10 h-10 text-slate-600 mx-auto" />
              <h2 className="text-lg font-bold text-white">No Tasks Assigned Yet</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click "+ Create Task" above to assign coursework, deliverables, or milestones to interns.
              </p>
              <Button variant="primary" size="sm" onClick={() => setShowCreateTaskModal(true)}>
                + Create Task
              </Button>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="p-5 bg-surface border-surface-border space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{task.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-950/80 border border-indigo-800 text-indigo-300">
                        {task.task_source}
                      </span>
                      <Badge variant={task.status === 'completed' ? 'success' : task.status === 'overdue' ? 'danger' : 'info'}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Assigned to: <strong className="text-white">{task.student_name}</strong></span>
                      <span>•</span>
                      <span>Company: {task.company_name}</span>
                      <span>•</span>
                      <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: PENDING REVIEWS QUEUE */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <Card className="p-12 text-center border-dashed space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-bold text-white">All Caught Up!</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are no pending task submissions waiting for review.
              </p>
            </Card>
          ) : (
            pendingSubmissions.map((task) => {
              const latestSub = task.submissions?.[0];
              const isReviewing = reviewingTaskId === task.id;

              return (
                <Card key={task.id} className="p-5 bg-surface border-surface-border space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{task.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-950 border border-amber-800 text-amber-300">
                          Pending Review
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Submitted by: <strong className="text-white">{task.student_name}</strong> ({task.company_name})
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setReviewingTaskId(isReviewing ? null : task.id);
                        setReviewComment('');
                        setReviewDecision('completed');
                      }}
                    >
                      {isReviewing ? 'Cancel' : 'Evaluate & Review'}
                    </Button>
                  </div>

                  {/* Submission Deliverables */}
                  {latestSub && (
                    <div className="p-3 bg-background rounded-xl border border-surface-border space-y-2 text-xs">
                      {latestSub.submission_text && (
                        <div>
                          <span className="font-bold text-slate-300 block mb-0.5">Written Deliverable:</span>
                          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{latestSub.submission_text}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {latestSub.github_url && (
                          <a
                            href={latestSub.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700"
                          >
                            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>GitHub Deliverable</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {latestSub.demo_url && (
                          <a
                            href={latestSub.demo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700"
                          >
                            <Globe className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Live Demo</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {latestSub.file_url && (
                          <a
                            href={latestSub.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-700"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>{latestSub.file_name || 'Attached File'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Review Action Drawer */}
                  {isReviewing && (
                    <div className="p-4 bg-background rounded-xl border border-slate-700 space-y-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Record T&P Evaluation Decision
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewDecision('completed')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            reviewDecision === 'completed'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-surface border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" /> Approve (Completed)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewDecision('changes_requested')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            reviewDecision === 'changes_requested'
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-surface border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Request Changes
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                          Evaluator Feedback / Instructions
                        </label>
                        <textarea
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="e.g. Excellent solution! Approved."
                          className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setReviewingTaskId(null)}>
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={submittingReview}
                          onClick={() => handleReviewSubmission(task.id, latestSub?.id || '')}
                          icon={<Send className="w-3.5 h-3.5 text-black" />}
                        >
                          Submit Decision
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

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto antialiased">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">+ Create Internship Task</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign tasks to enrolled students from the Training & Placement department.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement Authentication Module & Security Audit"
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Description *</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the expected technical deliverables and problem statement..."
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instructions / Acceptance Criteria</label>
                <textarea
                  rows={2}
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  placeholder="Include code quality standards, commit message guidelines, or test coverage expectations..."
                  className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                />
              </div>

              {/* Assignment Target Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Target *</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAssignMode('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      assignMode === 'all'
                        ? 'bg-white text-black border-white'
                        : 'bg-background border-slate-700 text-slate-400'
                    }`}
                  >
                    All Students ({records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('company')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      assignMode === 'company'
                        ? 'bg-white text-black border-white'
                        : 'bg-background border-slate-700 text-slate-400'
                    }`}
                  >
                    By Company Batch
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('individual')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      assignMode === 'individual'
                        ? 'bg-white text-black border-white'
                        : 'bg-background border-slate-700 text-slate-400'
                    }`}
                  >
                    Select Individuals
                  </button>
                </div>

                {assignMode === 'company' && (
                  <div className="mb-2">
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    >
                      <option value="">Choose Company Batch...</option>
                      {[...new Map(records.filter((r) => r.internship.company_id).map((r) => [r.internship.company_id, r.company_name])).entries()].map(([cId, cName]) => (
                        <option key={cId} value={cId!}>
                          {cName} ({records.filter((r) => r.internship.company_id === cId).length} interns)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {assignMode === 'individual' && (
                  <div className="max-h-36 overflow-y-auto border border-surface-border rounded-xl bg-background p-2 space-y-1">
                    {records.map((r) => {
                      const isChecked = selectedStudentIds.includes(r.internship.student_id);
                      return (
                        <label
                          key={r.internship.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-surface rounded text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, r.internship.student_id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== r.internship.student_id));
                              }
                            }}
                          />
                          <span className="text-white font-medium">{r.student_name}</span>
                          <span className="text-slate-500">({r.company_name})</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskSubmissionRequired}
                      onChange={(e) => setTaskSubmissionRequired(e.target.checked)}
                    />
                    <span>Requires Deliverable / Evidence Submission</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Required Deliverable</label>
                  <select
                    value={taskSubmissionType}
                    onChange={(e) => setTaskSubmissionType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="multiple">Multiple (File/Git/Demo)</option>
                    <option value="github">GitHub Link</option>
                    <option value="file">File Upload / PDF</option>
                    <option value="text">Written Text Response</option>
                    <option value="url">Demo URL</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowCreateTaskModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={creatingTask}
                  icon={<Send className="w-4 h-4 text-black" />}
                >
                  Publish & Assign Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY PROGRESS REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto antialiased">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Institutional Internship Progress Report</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Training & Placement Department • Generated {new Date().toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-background rounded-xl border border-surface-border space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-surface rounded-lg border border-surface-border">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Interns</span>
                  <span className="text-xl font-black text-white mt-0.5 block">{totalStudents}</span>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-surface-border">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Active</span>
                  <span className="text-xl font-black text-emerald-400 mt-0.5 block">{activeInternships}</span>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-surface-border">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Completion Rate</span>
                  <span className="text-xl font-black text-white mt-0.5 block">
                    {tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0}%
                  </span>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-surface-border">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">Overdue</span>
                  <span className="text-xl font-black text-rose-400 mt-0.5 block">{overdueTasksCount}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-bold text-white block">Student Progress Breakdown:</span>
                <div className="max-h-60 overflow-y-auto divide-y divide-surface-border/40 border border-surface-border rounded-lg">
                  {records.map((r) => {
                    const studentTasks = allTasks.filter((t) => t.student_id === r.internship.student_id);
                    const completed = studentTasks.filter((t) => t.status === 'completed').length;
                    const pct = studentTasks.length > 0 ? Math.round((completed / studentTasks.length) * 100) : r.consistency_percent;

                    return (
                      <div key={r.internship.id} className="p-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">{r.student_name}</span>
                          <span className="text-[11px] text-slate-400">{r.company_name} • {r.internship.role}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-400 block">{pct}% Progress</span>
                          <span className="text-[10px] text-slate-500">
                            {studentTasks.length > 0 ? `${completed}/${studentTasks.length} tasks` : `${r.total_logs} logs`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReportModal(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()} icon={<Printer className="w-3.5 h-3.5 text-black" />}>
                Print Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
