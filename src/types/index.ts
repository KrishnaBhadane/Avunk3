export type UserRole = 'student' | 'tp' | 'company';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  role: UserRole;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  profile_id: string;
  full_name: string;
  institute_id?: string;
  institute_name?: string;
  department: string;
  graduation_year: number;
  address?: string;
  phone?: string;
  skills: string[];
  discoverable: boolean;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface TPProfile {
  id: string;
  profile_id: string;
  institution_id?: string;
  institution_name: string;
  institution_email: string;
  address?: string;
  verification_status: VerificationStatus;
  verification_document?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  profile_id: string;
  company_name: string;
  company_email: string;
  industry?: string;
  website?: string;
  address?: string;
  verification_status: VerificationStatus;
  verification_document?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeRecord {
  id: string;
  student_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  version: number;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  uploaded_at: string;
}

export interface TenPointAuditItem {
  point_number: number;
  title: string;
  verdict_status: 'pass' | 'warning' | 'fail' | 'info';
  summary: string;
  details: string;
}

export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  student_id: string;
  score: number;
  grade?: string;
  skills_detected: string[];
  strengths: string[];
  weaknesses: string[];
  plus_points?: string[];
  worst_points?: string[];
  ten_point_breakdown?: TenPointAuditItem[];
  missing_skills: string[];
  ats_feedback: string;
  role_recommendations: string[];
  market_feedback: string;
  action_plan?: string[];
  ai_model?: string;
  raw_ai_response?: any;
  created_at: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface OfferAnalysis {
  id: string;
  offer_id: string;
  student_id: string;
  company_name: string;
  internship_role: string;
  verdict?: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  positive_signals: string[];
  warning_signals: string[];
  plus_points?: string[];
  worst_points?: string[];
  ten_point_breakdown?: TenPointAuditItem[];
  missing_information: string[];
  inconsistencies: string[];
  recommendation: string;
  actionable_steps?: string[];
  company_research?: any;
  internship_research?: any;
  sources: {
    name: string;
    status: 'verified' | 'unverified' | 'unavailable';
    date?: string;
    notes?: string;
  }[];
  raw_ai_response?: any;
  created_at: string;
}

export interface InternshipOffer {
  id: string;
  student_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  uploaded_at: string;
}

export interface InternshipRequirement {
  id: string;
  company_id: string;
  company_name?: string;
  title: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  location: string;
  mode: 'Remote' | 'Onsite' | 'Hybrid';
  stipend: string;
  duration: string;
  is_active: boolean;
  created_at: string;
}

export interface CandidateMatch {
  id: string;
  student_id: string;
  student_name: string;
  institute_name: string;
  department: string;
  graduation_year: number;
  skills: string[];
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  ai_explanation: string;
  resume_url?: string;
  resume_score?: number;
}

export interface UserCredits {
  free_credits: number;
  paid_credits: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'deduction' | 'addition' | 'grant' | 'refund';
  amount: number;
  reason: string;
  reference?: string;
  created_at: string;
}

// ============================================================
// INTERNSHIP TRACKER & WORK LOG TYPES
// ============================================================
export type InternshipStatus = 'active' | 'completed' | 'paused';
export type DailyLogStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected';
export type EvidenceType = 'file' | 'github' | 'demo' | 'link';

export interface StudentInternship {
  id: string;
  student_id: string;
  company_id?: string;
  company_name: string;
  role: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: InternshipStatus;
  mentor_name?: string;
  mentor_email?: string;
  created_at: string;
  updated_at: string;
}

export interface InternshipLogEvidence {
  id: string;
  daily_log_id: string;
  evidence_type: EvidenceType;
  title?: string;
  file_path?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  url?: string;
  created_at: string;
}

export interface InternshipMentorReview {
  id: string;
  daily_log_id: string;
  reviewer_id?: string;
  reviewer_name?: string;
  decision: 'approved' | 'changes_requested' | 'rejected';
  comment: string;
  created_at: string;
}

export interface InternshipDailyLog {
  id: string;
  internship_id: string;
  student_id: string;
  log_date: string;
  title: string;
  description: string;
  tasks_completed?: string;
  learnings?: string;
  blockers?: string;
  hours_worked: number;
  status: DailyLogStatus;
  evidence?: InternshipLogEvidence[];
  mentor_reviews?: InternshipMentorReview[];
  created_at: string;
  updated_at: string;
}

export interface InternshipProgressStats {
  total_days: number;
  days_completed: number;
  days_remaining: number;
  total_logs: number;
  approved_logs: number;
  pending_logs: number;
  changes_requested_logs: number;
  rejected_logs: number;
  total_hours_worked: number;
  evidence_submitted_count: number;
  activity_consistency_percent: number;
}

