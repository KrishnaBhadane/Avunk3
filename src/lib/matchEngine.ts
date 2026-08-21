import type { CandidateMatch, InternshipRequirement, StudentProfile } from '../types';

export function calculateCandidateMatch(
  requirement: InternshipRequirement,
  student: StudentProfile,
  resumeScore: number = 75
): CandidateMatch {
  const reqSkills = (requirement.required_skills || []).map(s => s.toLowerCase());
  const prefSkills = (requirement.preferred_skills || []).map(s => s.toLowerCase());
  const studentSkills = (student.skills || []).map(s => s.toLowerCase());

  let requiredMatchRatio = 0;
  const matchingReqSkills: string[] = [];
  const missingReqSkills: string[] = [];

  if (reqSkills.length > 0) {
    reqSkills.forEach(req => {
      if (studentSkills.some(sk => sk.includes(req) || req.includes(sk))) {
        matchingReqSkills.push(req);
      } else {
        missingReqSkills.push(req);
      }
    });
    requiredMatchRatio = matchingReqSkills.length / reqSkills.length;
  } else {
    requiredMatchRatio = 1.0;
  }

  let prefMatchRatio = 0;
  if (prefSkills.length > 0) {
    const matchingPref = prefSkills.filter(pref => studentSkills.some(sk => sk.includes(pref) || pref.includes(sk)));
    prefMatchRatio = matchingPref.length / prefSkills.length;
  } else {
    prefMatchRatio = 0.8;
  }

  const resumeScoreRatio = Math.min(resumeScore / 100, 1.0);
  const gradScoreRatio = student.graduation_year >= 2025 ? 1.0 : 0.8;
  const baselineRatio = student.skills.length >= 3 ? 1.0 : 0.6;

  const totalScoreRaw =
    requiredMatchRatio * 50 +
    resumeScoreRatio * 20 +
    gradScoreRatio * 15 +
    prefMatchRatio * 10 +
    baselineRatio * 5;

  const matchScore = Math.round(Math.min(Math.max(totalScoreRaw, 10), 98));

  const matchingSkillsDisplay = matchingReqSkills.map(s => s.toUpperCase());
  const missingSkillsDisplay = missingReqSkills.map(s => s.toUpperCase());

  let explanation = `Candidate demonstrates a ${matchScore}% profile compatibility for ${requirement.title}.`;
  if (matchingSkillsDisplay.length > 0) {
    explanation += ` Strong overlap in core technologies: ${matchingSkillsDisplay.slice(0, 3).join(', ')}.`;
  }
  if (missingSkillsDisplay.length > 0) {
    explanation += ` Missing specific required skill: ${missingSkillsDisplay[0]}.`;
  }

  return {
    id: `match-${student.id}-${requirement.id}`,
    student_id: student.id,
    student_name: student.full_name,
    institute_name: student.institute_name || 'Indian Institute of Technology (IIT) Delhi',
    department: student.department,
    graduation_year: student.graduation_year,
    skills: student.skills,
    match_score: matchScore,
    matching_skills: matchingSkillsDisplay,
    missing_skills: missingSkillsDisplay,
    ai_explanation: explanation,
    resume_score: resumeScore
  };
}
