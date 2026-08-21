export interface TenPointAuditItem {
  point_number: number;
  title: string;
  verdict_status: 'pass' | 'warning' | 'fail' | 'info';
  summary: string;
  details: string;
}

export interface OfferAnalysisResult {
  company_name: string;
  internship_role: string;
  verdict: 'Verified Legitimate' | 'Proceed with Caution' | 'High Risk / Probable Scam';
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  confidence: number;
  plus_points: string[];
  worst_points: string[];
  ten_point_breakdown: TenPointAuditItem[];
  positive_signals: string[];
  warning_signals: string[];
  missing_information: string[];
  inconsistencies: string[];
  recommendation: string;
  actionable_steps: string[];
  sources: Array<{
    name: string;
    status: 'verified' | 'unverified' | 'unavailable';
    date?: string;
    notes?: string;
  }>;
}

export interface ResumeAnalysisResult {
  score: number;
  grade: string;
  plus_points: string[];
  worst_points: string[];
  ten_point_breakdown: TenPointAuditItem[];
  strengths: string[];
  weaknesses: string[];
  skills_detected: string[];
  missing_skills: string[];
  ats_feedback: string;
  role_recommendations: string[];
  market_feedback: string;
  action_plan: string[];
}
