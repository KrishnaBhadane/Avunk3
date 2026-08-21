import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ResumeRecord, ResumeAnalysis } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { User, Mail, ShieldCheck, FileText, Upload, Save, Check } from 'lucide-react';

export const StudentProfileView: React.FC = () => {
  const { studentProfile, updateStudentProfile, user } = useAuth();

  const [fullName, setFullName] = useState(studentProfile?.full_name || '');
  const [institute, setInstitute] = useState(studentProfile?.institute_name || '');
  const [department, setDepartment] = useState(studentProfile?.department || '');
  const [graduationYear, setGraduationYear] = useState(studentProfile?.graduation_year?.toString() || '2026');
  const [phone, setPhone] = useState(studentProfile?.phone || '');
  const [address, setAddress] = useState(studentProfile?.address || '');
  const [skillsInput, setSkillsInput] = useState(studentProfile?.skills?.join(', ') || '');
  const [discoverable, setDiscoverable] = useState(studentProfile?.discoverable ?? true);

  const [latestResume, setLatestResume] = useState<ResumeRecord | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<ResumeAnalysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (studentProfile) {
      setFullName(studentProfile.full_name || '');
      setInstitute(studentProfile.institute_name || '');
      setDepartment(studentProfile.department || '');
      setGraduationYear(studentProfile.graduation_year?.toString() || '2026');
      setPhone(studentProfile.phone || '');
      setAddress(studentProfile.address || '');
      setSkillsInput(studentProfile.skills?.join(', ') || '');
      setDiscoverable(studentProfile.discoverable ?? true);

      // Fetch latest resume
      supabase
        .from('resumes')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setLatestResume(data[0] as ResumeRecord);
          }
        });

      // Fetch latest analysis
      supabase
        .from('resume_analyses')
        .select('*')
        .eq('student_id', studentProfile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setLatestAnalysis(data[0] as ResumeAnalysis);
          }
        });
    }
  }, [studentProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);

    const res = await updateStudentProfile({
      full_name: fullName,
      institute_name: institute,
      department: department,
      graduation_year: Number(graduationYear),
      phone,
      address,
      skills,
      discoverable,
    });

    setSaving(false);
    if (!res.success) {
      setSaveError(res.error || 'Failed to update profile');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="border-b border-surface-border pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-white" />
            Student Profile Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your verified academic profile, skill tags, and resume credentials.
          </p>
        </div>

        <Badge variant={studentProfile?.verification_status === 'verified' ? 'success' : 'warning'} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
          {studentProfile?.verification_status === 'verified' ? 'Verified Student Profile' : 'Verification Pending'}
        </Badge>
      </div>

      {saveError && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold">
          {saveError}
        </div>
      )}

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="space-y-6">
          <h2 className="text-base font-bold text-white border-b border-surface-border pb-3">Personal & Academic Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Verified Email</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-border/50 border border-surface-border rounded-lg text-sm text-slate-400">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Institute Name</label>
              <input
                type="text"
                value={institute}
                onChange={(e) => setInstitute(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Graduation Year</label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Skills (comma separated)</label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-surface-border">
            <input
              type="checkbox"
              id="discoverableCheck"
              checked={discoverable}
              onChange={(e) => setDiscoverable(e.target.checked)}
              className="rounded border-slate-700 bg-background text-white focus:ring-0"
            />
            <label htmlFor="discoverableCheck" className="text-xs text-slate-300">
              Make profile discoverable to verified hiring companies (candidate matching)
            </label>
          </div>
        </Card>

        {/* Resume Management */}
        <Card className="space-y-4">
          <div className="flex justify-between items-center border-b border-surface-border pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Active Resume Document
            </h2>
            {latestResume && <Badge variant="info">Version {latestResume.version}</Badge>}
          </div>

          {latestResume ? (
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-border text-white flex items-center justify-center font-bold">
                  DOC
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{latestResume.file_name}</p>
                  <p className="text-[11px] text-slate-500">
                    Uploaded on {new Date(latestResume.uploaded_at).toLocaleDateString()}
                    {latestAnalysis ? ` • ATS Score ${latestAnalysis.score}/100` : ''}
                  </p>
                </div>
              </div>

              <Link to="/student/resume">
                <Button type="button" variant="outline" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>
                  Manage Resume
                </Button>
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-background rounded-lg border border-surface-border text-center space-y-2">
              <p className="text-xs text-slate-400">No resume uploaded yet.</p>
              <Link to="/student/resume">
                <Button type="button" variant="outline" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>
                  Upload Resume
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" loading={saving} icon={<Save className="w-4 h-4 text-black" />}>
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
