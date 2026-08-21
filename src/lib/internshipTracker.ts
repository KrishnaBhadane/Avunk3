/**
 * AVUNK Internship Tracker & Daily Work Log Service
 *
 * Provides typed data operations for student daily work submissions, evidence management,
 * progress calculation, and company/mentor reviews.
 *
 * KEY RULES:
 * 1. Students can only select companies that are registered on AVUNK (from company_profiles).
 * 2. New internship requests start as 'pending_verification' — the company must verify first.
 * 3. Companies can only access student data (name, tech stack) for interns assigned to them.
 */

import { supabase } from './supabase';
import type {
  StudentInternship,
  InternshipDailyLog,
  InternshipLogEvidence,
  InternshipMentorReview,
  InternshipProgressStats,
  DailyLogStatus,
  EvidenceType,
  InternshipTask,
  TaskSubmission,
  TaskStatus,
  TaskPriority,
  TaskSubmissionType,
  InternshipAttendanceRecord,
  AttendanceStatus,
  StudentTaskProgressStats,
  AttendanceSummaryStats,
} from '../types';

// ============================================================
// REGISTERED COMPANY LOOKUP (for student dropdown)
// ============================================================

export interface RegisteredCompany {
  id: string;
  company_name: string;
  industry?: string;
  website?: string;
}

/**
 * Fetch all companies registered on AVUNK for the student internship dropdown.
 * Only companies that have completed signup appear here.
 */
export async function fetchRegisteredCompanies(): Promise<RegisteredCompany[]> {
  try {
    const { data, error } = await supabase
      .from('company_profiles')
      .select('id, company_name, industry, website')
      .order('company_name', { ascending: true });

    if (error) {
      console.warn('Error fetching registered companies:', error.message);
      return [];
    }
    return (data || []) as RegisteredCompany[];
  } catch (err) {
    console.error('Exception in fetchRegisteredCompanies:', err);
    return [];
  }
}

// ============================================================
// STUDENT INTERNSHIP CRUD
// ============================================================

/**
 * Fetch all tracked internships for a given student
 */
export async function fetchStudentInternships(studentProfileId: string): Promise<StudentInternship[]> {
  try {
    const { data, error } = await supabase
      .from('student_internships')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching student internships:', error.message);
      return [];
    }
    return (data || []) as StudentInternship[];
  } catch (err) {
    console.error('Exception in fetchStudentInternships:', err);
    return [];
  }
}

/**
 * Create a new student tracked internship record.
 * IMPORTANT: Status is always 'pending_verification' — the company must verify it before
 * the student can start logging daily work.
 */
export async function createStudentInternship(
  studentProfileId: string,
  payload: {
    company_name: string;
    role: string;
    start_date: string;
    end_date: string;
    total_days: number;
    company_id?: string | null;
    mentor_name?: string;
    mentor_email?: string;
  }
): Promise<{ success: boolean; data?: StudentInternship; error?: string }> {
  try {
    let resolvedCompanyId = payload.company_id || null;

    // If company_id not provided, try to find matching company_profiles by name
    if (!resolvedCompanyId && payload.company_name) {
      const { data: matchedComp } = await supabase
        .from('company_profiles')
        .select('id')
        .ilike('company_name', payload.company_name.trim())
        .maybeSingle();

      if (matchedComp) {
        resolvedCompanyId = matchedComp.id;
      }
    }

    const { data, error } = await supabase
      .from('student_internships')
      .insert({
        student_id: studentProfileId,
        company_name: payload.company_name.trim(),
        role: payload.role.trim(),
        start_date: payload.start_date,
        end_date: payload.end_date,
        total_days: payload.total_days || 30,
        company_id: resolvedCompanyId,
        mentor_name: payload.mentor_name || null,
        mentor_email: payload.mentor_email || null,
        status: 'pending_verification',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as StudentInternship };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create internship record' };
  }
}

// ============================================================
// DAILY WORK LOGS
// ============================================================

/**
 * Fetch all daily work logs with evidence and mentor reviews for an internship
 */
export async function fetchInternshipDailyLogs(internshipId: string): Promise<InternshipDailyLog[]> {
  try {
    const { data: logsData, error: logsError } = await supabase
      .from('internship_daily_logs')
      .select('*')
      .eq('internship_id', internshipId)
      .order('log_date', { ascending: false });

    if (logsError || !logsData) {
      console.warn('Error fetching daily logs:', logsError?.message);
      return [];
    }

    const logIds = logsData.map((l: any) => l.id);
    if (logIds.length === 0) return [];

    // Fetch evidence items for these logs
    const { data: evidenceData } = await supabase
      .from('internship_log_evidence')
      .select('*')
      .in('daily_log_id', logIds);

    // Fetch mentor reviews for these logs
    const { data: reviewData } = await supabase
      .from('internship_mentor_reviews')
      .select('*')
      .in('daily_log_id', logIds)
      .order('created_at', { ascending: true });

    const evidenceMap = new Map<string, InternshipLogEvidence[]>();
    (evidenceData || []).forEach((ev: any) => {
      const existing = evidenceMap.get(ev.daily_log_id) || [];
      evidenceMap.set(ev.daily_log_id, [...existing, ev as InternshipLogEvidence]);
    });

    const reviewMap = new Map<string, InternshipMentorReview[]>();
    (reviewData || []).forEach((rev: any) => {
      const existing = reviewMap.get(rev.daily_log_id) || [];
      reviewMap.set(rev.daily_log_id, [...existing, rev as InternshipMentorReview]);
    });

    return logsData.map((log: any) => ({
      ...log,
      evidence: evidenceMap.get(log.id) || [],
      mentor_reviews: reviewMap.get(log.id) || [],
    })) as InternshipDailyLog[];
  } catch (err) {
    console.error('Exception in fetchInternshipDailyLogs:', err);
    return [];
  }
}

/**
 * Upload an evidence file to Supabase Storage and retrieve URL
 */
export async function uploadEvidenceFile(
  file: File,
  studentId: string,
  logId?: string
): Promise<{ success: boolean; url?: string; filePath?: string; error?: string }> {
  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `internships/${studentId}/${logId || Date.now()}_${cleanFileName}`;

    // Try uploading to 'resumes' bucket which is pre-configured
    const { data, error } = await supabase.storage.from('resumes').upload(filePath, file, {
      upsert: true,
    });

    if (error) {
      // Fallback: create base64 data URL if storage bucket fails
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            success: true,
            url: reader.result as string,
            filePath,
          });
        };
        reader.onerror = () => {
          resolve({ success: false, error: 'Failed to read file' });
        };
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      filePath: data.path,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'File upload failed' };
  }
}

/**
 * Submit or update a daily work log with evidence attachments
 */
export async function submitDailyWorkLog(
  internshipId: string,
  studentId: string,
  logData: {
    log_id?: string;
    log_date: string;
    title: string;
    description: string;
    tasks_completed?: string;
    learnings?: string;
    blockers?: string;
    hours_worked: number;
  },
  evidenceList: Array<{
    evidence_type: EvidenceType;
    title?: string;
    file_path?: string;
    file_url?: string;
    file_name?: string;
    file_type?: string;
    url?: string;
  }>
): Promise<{ success: boolean; data?: InternshipDailyLog; error?: string }> {
  try {
    let logRecordId = logData.log_id;

    if (logRecordId) {
      // Update existing daily log (e.g. resubmitting after changes requested)
      const { data, error } = await supabase
        .from('internship_daily_logs')
        .update({
          log_date: logData.log_date,
          title: logData.title,
          description: logData.description,
          tasks_completed: logData.tasks_completed || null,
          learnings: logData.learnings || null,
          blockers: logData.blockers || null,
          hours_worked: logData.hours_worked || 4.0,
          status: 'pending', // reset to pending review on update
          updated_at: new Date().toISOString(),
        })
        .eq('id', logRecordId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      logRecordId = data.id;
    } else {
      // Insert new daily log
      const { data, error } = await supabase
        .from('internship_daily_logs')
        .insert({
          internship_id: internshipId,
          student_id: studentId,
          log_date: logData.log_date,
          title: logData.title,
          description: logData.description,
          tasks_completed: logData.tasks_completed || null,
          learnings: logData.learnings || null,
          blockers: logData.blockers || null,
          hours_worked: logData.hours_worked || 4.0,
          status: 'pending',
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      logRecordId = data.id;
    }

    // Insert newly added evidence items
    if (evidenceList.length > 0 && logRecordId) {
      const evidenceRows = evidenceList.map((item) => ({
        daily_log_id: logRecordId,
        evidence_type: item.evidence_type,
        title: item.title || item.file_name || 'Evidence Attachment',
        file_path: item.file_path || null,
        file_url: item.file_url || null,
        file_name: item.file_name || null,
        file_type: item.file_type || null,
        url: item.url || item.file_url || null,
      }));

      await supabase.from('internship_log_evidence').insert(evidenceRows);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit daily work log' };
  }
}

// ============================================================
// MENTOR REVIEW
// ============================================================

/**
 * Submit mentor review decision on a daily log
 */
export async function submitMentorReview(
  dailyLogId: string,
  decision: 'approved' | 'changes_requested' | 'rejected',
  comment: string,
  reviewerName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Insert review record
    const { error: revError } = await supabase.from('internship_mentor_reviews').insert({
      daily_log_id: dailyLogId,
      decision,
      comment,
      reviewer_name: reviewerName || 'Assigned Enterprise Mentor',
    });

    if (revError) {
      console.warn('Review record insert warning:', revError.message);
    }

    // 2. Update daily log status
    const { error: logUpdateError } = await supabase
      .from('internship_daily_logs')
      .update({
        status: decision as DailyLogStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dailyLogId);

    if (logUpdateError) {
      return { success: false, error: logUpdateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit mentor review' };
  }
}

// ============================================================
// COMPANY INTERNSHIP VERIFICATION & INTERN ACCESS
// ============================================================

/**
 * Verify or reject a student's internship request.
 * Called by the company from their Intern Tracker dashboard.
 */
export async function verifyInternship(
  internshipId: string,
  decision: 'active' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (decision === 'rejected') {
      // Delete the internship record entirely on rejection
      const { error } = await supabase
        .from('student_internships')
        .delete()
        .eq('id', internshipId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    // Verify → set status to 'active'
    const { error } = await supabase
      .from('student_internships')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', internshipId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify internship' };
  }
}

/**
 * Fetch all interns assigned to a company.
 * Companies can ONLY see students who have registered an internship with their company.
 * Returns student name, tech stack (skills), and institute — nothing else.
 */
export async function fetchCompanyInterns(
  companyProfileId: string,
  companyName?: string
): Promise<Array<StudentInternship & {
  student_name?: string;
  student_email?: string;
  student_institute?: string;
  student_skills?: string[];
}>> {
  try {
    let query = supabase.from('student_internships').select('*');

    if (companyName && companyName.trim()) {
      query = query.or(`company_id.eq.${companyProfileId},company_name.ilike.%${companyName.trim()}%`);
    } else {
      query = query.eq('company_id', companyProfileId);
    }

    const { data: internships, error } = await query.order('created_at', { ascending: false });

    if (error || !internships) return [];

    const studentIds = internships.map((i: any) => i.student_id);
    if (studentIds.length === 0) return [];

    // Fetch ONLY name, institute, and skills — no email, no phone, no sensitive data
    const { data: students } = await supabase
      .from('student_profiles')
      .select('id, full_name, institute_name, skills')
      .in('id', studentIds);

    const studentMap = new Map<string, any>();
    (students || []).forEach((s: any) => studentMap.set(s.id, s));

    return internships.map((item: any) => {
      const student = studentMap.get(item.student_id);
      return {
        ...item,
        student_name: student?.full_name || 'Student Candidate',
        student_institute: student?.institute_name || 'Partner College',
        student_skills: student?.skills || [],
      };
    });
  } catch (err) {
    console.error('Error in fetchCompanyInterns:', err);
    return [];
  }
}

// ============================================================
// COMPANY JOB APPLICATIONS MANAGEMENT
// ============================================================

export interface CompanyApplicantItem {
  id: string;
  student_id: string;
  requirement_id?: string;
  company_id: string;
  status: string;
  applied_at: string;
  student_name: string;
  student_email?: string;
  student_phone?: string;
  student_institute: string;
  student_department?: string;
  student_graduation_year?: number;
  student_skills: string[];
  requirement_title?: string;
  resume_url?: string;
}

/**
 * Fetch all candidate job applications submitted to this company
 */
export async function fetchCompanyApplications(
  companyProfileId: string
): Promise<CompanyApplicantItem[]> {
  try {
    const { data: apps, error } = await supabase
      .from('internship_applications')
      .select('*')
      .eq('company_id', companyProfileId)
      .order('applied_at', { ascending: false });

    if (error || !apps || apps.length === 0) return [];

    const studentIds = apps.map((a: any) => a.student_id);
    const reqIds = apps.map((a: any) => a.requirement_id).filter(Boolean);

    // Fetch student info
    const { data: students } = await supabase
      .from('student_profiles')
      .select('id, profile_id, full_name, institute_name, department, graduation_year, phone, skills')
      .in('id', studentIds);

    const studentMap = new Map<string, any>();
    const profileIds: string[] = [];
    (students || []).forEach((s: any) => {
      studentMap.set(s.id, s);
      if (s.profile_id) profileIds.push(s.profile_id);
    });

    // Fetch emails from profiles
    const emailMap = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', profileIds);

      (profiles || []).forEach((p: any) => emailMap.set(p.id, p.email));
    }

    // Fetch requirement titles
    let reqMap = new Map<string, string>();
    if (reqIds.length > 0) {
      const { data: reqs } = await supabase
        .from('internship_requirements')
        .select('id, title')
        .in('id', reqIds);

      (reqs || []).forEach((r: any) => reqMap.set(r.id, r.title));
    }

    return apps.map((app: any) => {
      const student = studentMap.get(app.student_id);
      const studentEmail = student?.profile_id ? emailMap.get(student.profile_id) : undefined;

      return {
        id: app.id,
        student_id: app.student_id,
        requirement_id: app.requirement_id,
        company_id: app.company_id,
        status: app.status || 'applied',
        applied_at: app.applied_at || app.created_at || new Date().toISOString(),
        student_name: student?.full_name || 'Applicant Candidate',
        student_email: studentEmail,
        student_phone: student?.phone,
        student_institute: student?.institute_name || 'Partner Institute',
        student_department: student?.department,
        student_graduation_year: student?.graduation_year,
        student_skills: student?.skills || [],
        requirement_title: app.requirement_id ? reqMap.get(app.requirement_id) || 'General Internship' : 'Direct Application',
      };
    });
  } catch (err) {
    console.error('Error fetching company applications:', err);
    return [];
  }
}

/**
 * Update candidate application status (shortlisted, under_review, rejected, accepted)
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('internship_applications')
      .update({ status: newStatus })
      .eq('id', applicationId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update status' };
  }
}

/**
 * Accept an application and directly activate them as an intern in student_internships
 */
export async function acceptApplicationAsIntern(
  app: CompanyApplicantItem,
  companyName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Mark application as 'accepted'
    await updateApplicationStatus(app.id, 'accepted');

    // 2. Create active internship record in student_internships
    const { error } = await supabase.from('student_internships').insert({
      student_id: app.student_id,
      company_id: app.company_id,
      company_name: companyName,
      role: app.requirement_title || 'Intern',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_days: 30,
      status: 'active', // Immediately verified and active
    });

    if (error) {
      console.warn('Note on internship creation:', error.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to accept applicant' };
  }
}

// ============================================================
// T&P INTERNSHIP OVERSIGHT — ALL INTERNSHIPS ACROSS ALL COMPANIES
// ============================================================

export interface TPInternshipRecord {
  internship: StudentInternship;
  student_name: string;
  student_institute: string;
  student_skills: string[];
  company_name: string;
  total_logs: number;
  approved_logs: number;
  pending_logs: number;
  rejected_logs: number;
  total_hours: number;
  consistency_percent: number;
}

/**
 * Fetch ALL student internships across all companies — for T&P oversight.
 * T&P can see every student's internship status, company, logs summary, and effectiveness.
 */
export async function fetchAllInternshipsForTP(): Promise<TPInternshipRecord[]> {
  try {
    // Get all student internships
    const { data: internships, error } = await supabase
      .from('student_internships')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !internships || internships.length === 0) return [];

    const studentIds = [...new Set(internships.map((i: any) => i.student_id))];

    // Fetch student names, institutes, and skills
    const { data: students } = await supabase
      .from('student_profiles')
      .select('id, full_name, institute_name, skills')
      .in('id', studentIds);

    const studentMap = new Map<string, any>();
    (students || []).forEach((s: any) => studentMap.set(s.id, s));

    // Fetch all daily logs for all these internships
    const internshipIds = internships.map((i: any) => i.id);
    const { data: allLogs } = await supabase
      .from('internship_daily_logs')
      .select('internship_id, status, hours_worked')
      .in('internship_id', internshipIds);

    // Group logs by internship_id
    const logsByInternship = new Map<string, any[]>();
    (allLogs || []).forEach((log: any) => {
      const existing = logsByInternship.get(log.internship_id) || [];
      logsByInternship.set(log.internship_id, [...existing, log]);
    });

    return internships.map((item: any) => {
      const student = studentMap.get(item.student_id);
      const logs = logsByInternship.get(item.id) || [];
      const approved = logs.filter((l: any) => l.status === 'approved').length;
      const pending = logs.filter((l: any) => l.status === 'pending').length;
      const rejected = logs.filter((l: any) => l.status === 'rejected').length;
      const totalHours = logs.reduce((acc: number, l: any) => acc + (Number(l.hours_worked) || 0), 0);

      // Consistency: approved work per total days
      const totalDays = item.total_days || 30;
      const logsCount = logs.length;
      const rawScore = totalDays > 0 ? (approved * 1.0 + pending * 0.5) / Math.max(logsCount, 1) : 0;
      const consistency = logsCount > 0 ? Math.min(100, Math.round(rawScore * 100)) : 0;

      return {
        internship: item as StudentInternship,
        student_name: student?.full_name || 'Unknown Student',
        student_institute: student?.institute_name || 'Unknown Institute',
        student_skills: student?.skills || [],
        company_name: item.company_name,
        total_logs: logsCount,
        approved_logs: approved,
        pending_logs: pending,
        rejected_logs: rejected,
        total_hours: totalHours,
        consistency_percent: consistency,
      };
    });
  } catch (err) {
    console.error('Error in fetchAllInternshipsForTP:', err);
    return [];
  }
}

// ============================================================
// PROGRESS STATS
// ============================================================

/**
 * Calculate progress statistics for an internship
 */
export function calculateProgressStats(
  internship: StudentInternship,
  logs: InternshipDailyLog[]
): InternshipProgressStats {
  const totalDays = internship.total_days || 30;

  // Calculate days completed based on unique approved / submitted log dates
  const uniqueLoggedDates = new Set(logs.map((l) => l.log_date));
  const daysCompleted = Math.min(uniqueLoggedDates.size, totalDays);
  const daysRemaining = Math.max(0, totalDays - daysCompleted);

  const totalLogs = logs.length;
  const approvedLogs = logs.filter((l) => l.status === 'approved').length;
  const pendingLogs = logs.filter((l) => l.status === 'pending').length;
  const changesRequestedLogs = logs.filter((l) => l.status === 'changes_requested').length;
  const rejectedLogs = logs.filter((l) => l.status === 'rejected').length;

  const totalHoursWorked = logs.reduce((acc, curr) => acc + (Number(curr.hours_worked) || 0), 0);
  const evidenceCount = logs.reduce((acc, curr) => acc + (curr.evidence?.length || 0), 0);

  // Consistency %: measured by reviewed + submitted work progress
  let consistency = 0;
  if (totalDays > 0) {
    const rawScore = (approvedLogs * 1.0 + pendingLogs * 0.5) / Math.max(daysCompleted, 1);
    consistency = Math.min(100, Math.round(rawScore * 100));
    if (daysCompleted === 0 && totalLogs === 0) consistency = 0;
  }

  return {
    total_days: totalDays,
    days_completed: daysCompleted,
    days_remaining: daysRemaining,
    total_logs: totalLogs,
    approved_logs: approvedLogs,
    pending_logs: pendingLogs,
    changes_requested_logs: changesRequestedLogs,
    rejected_logs: rejectedLogs,
    total_hours_worked: totalHoursWorked,
    evidence_submitted_count: evidenceCount,
    activity_consistency_percent: consistency,
  };
}

// ============================================================
// TASK MANAGEMENT (College / T&P & Company Assigned Tasks)
// ============================================================

/**
 * Create an internship task assigned to an individual student, multiple students, or a company batch
 */
export async function createInternshipTask(payload: {
  student_ids: string[];
  internship_id?: string;
  company_id?: string;
  college_id?: string;
  created_by?: string;
  created_by_role: 'tp' | 'company';
  task_source?: string;
  title: string;
  description: string;
  instructions?: string;
  deadline: string;
  priority: TaskPriority;
  submission_required: boolean;
  submission_type: TaskSubmissionType;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!payload.student_ids || payload.student_ids.length === 0) {
      return { success: false, error: 'At least one student must be selected to assign this task.' };
    }

    const defaultSource = payload.created_by_role === 'tp' ? 'College / T&P' : 'Company';
    const sourceLabel = payload.task_source || defaultSource;

    const rows = payload.student_ids.map((sId) => ({
      student_id: sId,
      internship_id: payload.internship_id || null,
      company_id: payload.company_id || null,
      college_id: payload.college_id || null,
      created_by: payload.created_by || null,
      created_by_role: payload.created_by_role,
      task_source: sourceLabel,
      title: payload.title.trim(),
      description: payload.description.trim(),
      instructions: payload.instructions?.trim() || null,
      deadline: payload.deadline,
      priority: payload.priority || 'medium',
      submission_required: payload.submission_required,
      submission_type: payload.submission_type || 'multiple',
      status: 'not_started',
    }));

    const { data, error } = await supabase.from('internship_tasks').insert(rows).select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || rows.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create task' };
  }
}

/**
 * Fetch all tasks assigned to a student (with submissions and auto-calculated overdue status)
 */
export async function fetchStudentTasks(studentProfileId: string): Promise<InternshipTask[]> {
  try {
    const { data: tasks, error } = await supabase
      .from('internship_tasks')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('deadline', { ascending: true });

    if (error || !tasks) {
      console.warn('Error fetching student tasks:', error?.message);
      return [];
    }

    const taskIds = tasks.map((t: any) => t.id);
    let submissionsMap = new Map<string, TaskSubmission[]>();

    if (taskIds.length > 0) {
      const { data: subs } = await supabase
        .from('task_submissions')
        .select('*')
        .in('task_id', taskIds)
        .order('submitted_at', { ascending: false });

      if (subs) {
        subs.forEach((sub: any) => {
          const list = submissionsMap.get(sub.task_id) || [];
          submissionsMap.set(sub.task_id, [...list, sub as TaskSubmission]);
        });
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.map((t: any) => {
      const subs = submissionsMap.get(t.id) || [];
      let calculatedStatus: TaskStatus = t.status as TaskStatus;

      // Auto-detect overdue if past deadline and not completed/submitted/under_review
      if (
        t.deadline &&
        t.deadline < todayStr &&
        !['completed', 'submitted', 'under_review'].includes(t.status)
      ) {
        calculatedStatus = 'overdue';
      }

      return {
        ...t,
        status: calculatedStatus,
        submissions: subs,
      } as InternshipTask;
    });
  } catch (err) {
    console.error('Exception in fetchStudentTasks:', err);
    return [];
  }
}

/**
 * Fetch all tasks for an institution (for College / T&P oversight)
 */
export async function fetchAllTasksForTP(): Promise<InternshipTask[]> {
  try {
    const { data: tasks, error } = await supabase
      .from('internship_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !tasks) return [];

    const studentIds = [...new Set(tasks.map((t: any) => t.student_id))];
    const companyIds = [...new Set(tasks.map((t: any) => t.company_id).filter(Boolean))];
    const taskIds = tasks.map((t: any) => t.id);

    // Fetch students
    const { data: students } = await supabase
      .from('student_profiles')
      .select('id, full_name')
      .in('id', studentIds);

    const studentMap = new Map<string, string>();
    (students || []).forEach((s: any) => studentMap.set(s.id, s.full_name));

    // Fetch companies
    const companyMap = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('company_profiles')
        .select('id, company_name')
        .in('id', companyIds);

      (companies || []).forEach((c: any) => companyMap.set(c.id, c.company_name));
    }

    // Fetch submissions
    const { data: subs } = await supabase
      .from('task_submissions')
      .select('*')
      .in('task_id', taskIds)
      .order('submitted_at', { ascending: false });

    const submissionsMap = new Map<string, TaskSubmission[]>();
    (subs || []).forEach((sub: any) => {
      const list = submissionsMap.get(sub.task_id) || [];
      submissionsMap.set(sub.task_id, [...list, sub as TaskSubmission]);
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.map((t: any) => {
      const subs = submissionsMap.get(t.id) || [];
      let calculatedStatus: TaskStatus = t.status as TaskStatus;

      if (
        t.deadline &&
        t.deadline < todayStr &&
        !['completed', 'submitted', 'under_review'].includes(t.status)
      ) {
        calculatedStatus = 'overdue';
      }

      return {
        ...t,
        status: calculatedStatus,
        submissions: subs,
        student_name: studentMap.get(t.student_id) || 'Student',
        company_name: t.company_id ? companyMap.get(t.company_id) || 'Corporate Partner' : 'Not Linked',
      } as InternshipTask;
    });
  } catch (err) {
    console.error('Exception in fetchAllTasksForTP:', err);
    return [];
  }
}

/**
 * Fetch all tasks associated with a company's interns
 */
export async function fetchTasksForCompany(companyProfileId: string): Promise<InternshipTask[]> {
  try {
    // 1. Find all student IDs assigned to this company
    const { data: interns } = await supabase
      .from('student_internships')
      .select('id, student_id')
      .eq('company_id', companyProfileId);

    const studentIds = (interns || []).map((i: any) => i.student_id);

    if (studentIds.length === 0) {
      // Check tasks created directly by company
      const { data: directTasks } = await supabase
        .from('internship_tasks')
        .select('*')
        .eq('company_id', companyProfileId);

      return (directTasks || []) as InternshipTask[];
    }

    const { data: tasks, error } = await supabase
      .from('internship_tasks')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    if (error || !tasks) return [];

    const taskIds = tasks.map((t: any) => t.id);

    // Fetch students
    const { data: students } = await supabase
      .from('student_profiles')
      .select('id, full_name')
      .in('id', studentIds);

    const studentMap = new Map<string, string>();
    (students || []).forEach((s: any) => studentMap.set(s.id, s.full_name));

    // Fetch submissions
    const { data: subs } = await supabase
      .from('task_submissions')
      .select('*')
      .in('task_id', taskIds)
      .order('submitted_at', { ascending: false });

    const submissionsMap = new Map<string, TaskSubmission[]>();
    (subs || []).forEach((sub: any) => {
      const list = submissionsMap.get(sub.task_id) || [];
      submissionsMap.set(sub.task_id, [...list, sub as TaskSubmission]);
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.map((t: any) => {
      const subs = submissionsMap.get(t.id) || [];
      let calculatedStatus: TaskStatus = t.status as TaskStatus;

      if (
        t.deadline &&
        t.deadline < todayStr &&
        !['completed', 'submitted', 'under_review'].includes(t.status)
      ) {
        calculatedStatus = 'overdue';
      }

      return {
        ...t,
        status: calculatedStatus,
        submissions: subs,
        student_name: studentMap.get(t.student_id) || 'Intern Candidate',
      } as InternshipTask;
    });
  } catch (err) {
    console.error('Exception in fetchTasksForCompany:', err);
    return [];
  }
}

/**
 * Submit task work/evidence by student
 */
export async function submitTaskDeliverable(payload: {
  task_id: string;
  student_id: string;
  submission_text?: string;
  file_url?: string;
  file_name?: string;
  github_url?: string;
  demo_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Insert row into task_submissions
    const { error: subError } = await supabase.from('task_submissions').insert({
      task_id: payload.task_id,
      student_id: payload.student_id,
      submission_text: payload.submission_text?.trim() || null,
      file_url: payload.file_url || null,
      file_name: payload.file_name || null,
      github_url: payload.github_url?.trim() || null,
      demo_url: payload.demo_url?.trim() || null,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });

    if (subError) {
      return { success: false, error: subError.message };
    }

    // 2. Update task status to 'submitted'
    const { error: taskError } = await supabase
      .from('internship_tasks')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.task_id);

    if (taskError) {
      return { success: false, error: taskError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit task deliverable' };
  }
}

/**
 * Review task submission (approved / changes requested / rejected)
 */
export async function reviewTaskSubmission(
  taskId: string,
  submissionId: string,
  decision: 'completed' | 'changes_requested' | 'rejected',
  comment: string,
  reviewerId?: string,
  reviewerName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update submission record
    const { error: subError } = await supabase
      .from('task_submissions')
      .update({
        status: decision,
        review_comment: comment.trim(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId || null,
        reviewer_name: reviewerName || 'Authorized Evaluator',
      })
      .eq('id', submissionId);

    if (subError) {
      return { success: false, error: subError.message };
    }

    // 2. Update parent task status
    const { error: taskError } = await supabase
      .from('internship_tasks')
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (taskError) {
      return { success: false, error: taskError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to review submission' };
  }
}

/**
 * Calculate accurate task progress statistics for a student or batch
 */
export function calculateTaskProgress(tasks: InternshipTask[]): StudentTaskProgressStats {
  const total = tasks.length;
  if (total === 0) {
    return {
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      overdue_tasks: 0,
      under_review_tasks: 0,
      changes_requested_tasks: 0,
      progress_percent: 0,
      has_tasks: false,
    };
  }

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const overdue = tasks.filter((t) => t.status === 'overdue').length;
  const underReview = tasks.filter((t) => ['submitted', 'under_review'].includes(t.status)).length;
  const changesReq = tasks.filter((t) => t.status === 'changes_requested').length;
  const pending = tasks.filter((t) => ['not_started', 'in_progress', 'changes_requested'].includes(t.status)).length;

  const progressPercent = Math.min(100, Math.round((completed / total) * 100));

  return {
    total_tasks: total,
    completed_tasks: completed,
    pending_tasks: pending,
    overdue_tasks: overdue,
    under_review_tasks: underReview,
    changes_requested_tasks: changesReq,
    progress_percent: progressPercent,
    has_tasks: true,
  };
}

// ============================================================
// ATTENDANCE / PRESENCE MANAGEMENT (OPTIONAL)
// ============================================================

/**
 * Mark or update student attendance for a date (by Company)
 */
export async function markStudentAttendance(payload: {
  internship_id: string;
  student_id: string;
  company_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('internship_attendance')
      .upsert(
        {
          internship_id: payload.internship_id,
          student_id: payload.student_id,
          company_id: payload.company_id,
          date: payload.date,
          status: payload.status,
          marked_by: payload.marked_by || null,
        },
        { onConflict: 'internship_id,date' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record attendance' };
  }
}

/**
 * Fetch attendance records for a student
 */
export async function fetchStudentAttendance(
  studentProfileId: string
): Promise<InternshipAttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('internship_attendance')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('date', { ascending: false });

    if (error || !data) return [];
    return data as InternshipAttendanceRecord[];
  } catch (err) {
    console.error('Exception in fetchStudentAttendance:', err);
    return [];
  }
}

/**
 * Fetch attendance records for a company's interns
 */
export async function fetchCompanyAttendance(
  companyProfileId: string,
  date?: string
): Promise<InternshipAttendanceRecord[]> {
  try {
    let query = supabase
      .from('internship_attendance')
      .select('*')
      .eq('company_id', companyProfileId)
      .order('date', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as InternshipAttendanceRecord[];
  } catch (err) {
    console.error('Exception in fetchCompanyAttendance:', err);
    return [];
  }
}

/**
 * Calculate attendance metrics
 */
export function calculateAttendanceStats(
  records: InternshipAttendanceRecord[]
): AttendanceSummaryStats {
  if (!records || records.length === 0) {
    return {
      enabled: false,
      present_days: 0,
      absent_days: 0,
      half_days: 0,
      leave_days: 0,
      total_marked_days: 0,
      attendance_rate_percent: 0,
    };
  }

  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const half = records.filter((r) => r.status === 'half_day').length;
  const leave = records.filter((r) => r.status === 'leave').length;
  const total = records.length;

  const rate = total > 0 ? Math.round(((present + half * 0.5) / total) * 100) : 0;

  return {
    enabled: true,
    present_days: present,
    absent_days: absent,
    half_days: half,
    leave_days: leave,
    total_marked_days: total,
    attendance_rate_percent: rate,
  };
}
