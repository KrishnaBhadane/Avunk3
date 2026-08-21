/**
 * AVUNK Internship Tracker & Daily Work Log Service
 *
 * Provides typed data operations for student daily work submissions, evidence management,
 * progress calculation, and company/mentor reviews.
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
} from '../types';

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
 * Create a new student tracked internship record
 */
export async function createStudentInternship(
  studentProfileId: string,
  payload: {
    company_name: string;
    role: string;
    start_date: string;
    end_date: string;
    total_days: number;
    company_id?: string;
    mentor_name?: string;
    mentor_email?: string;
  }
): Promise<{ success: boolean; data?: StudentInternship; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('student_internships')
      .insert({
        student_id: studentProfileId,
        company_name: payload.company_name,
        role: payload.role,
        start_date: payload.start_date,
        end_date: payload.end_date,
        total_days: payload.total_days || 30,
        company_id: payload.company_id || null,
        mentor_name: payload.mentor_name || null,
        mentor_email: payload.mentor_email || null,
        status: 'active',
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

    // Try uploading to 'resumes' bucket which is pre-configured, or 'offer-letters'
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

/**
 * Fetch all interns assigned to a company
 */
export async function fetchCompanyInterns(
  companyProfileId: string
): Promise<Array<StudentInternship & { student_name?: string; student_email?: string; student_institute?: string }>> {
  try {
    const { data: internships, error } = await supabase
      .from('student_internships')
      .select('*')
      .eq('company_id', companyProfileId)
      .order('created_at', { ascending: false });

    if (error || !internships) return [];

    const studentIds = internships.map((i: any) => i.student_id);
    if (studentIds.length === 0) return [];

    const { data: students } = await supabase
      .from('student_profiles')
      .select('id, full_name, institute_name, profile_id')
      .in('id', studentIds);

    const studentMap = new Map<string, any>();
    (students || []).forEach((s: any) => studentMap.set(s.id, s));

    return internships.map((item: any) => {
      const student = studentMap.get(item.student_id);
      return {
        ...item,
        student_name: student?.full_name || 'Student Candidate',
        student_institute: student?.institute_name || 'Partner College',
      };
    });
  } catch (err) {
    console.error('Error in fetchCompanyInterns:', err);
    return [];
  }
}

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
