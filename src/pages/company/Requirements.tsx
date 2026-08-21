import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  fetchCompanyApplications,
  updateApplicationStatus,
  type CompanyApplicantItem,
} from '../../lib/internshipTracker';
import type { InternshipRequirement } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Briefcase,
  Plus,
  Check,
  Loader2,
  Users,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
} from 'lucide-react';

export const CompanyRequirements: React.FC = () => {
  const { companyProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'postings' | 'applications'>('postings');
  const [requirements, setRequirements] = useState<InternshipRequirement[]>([]);
  const [applications, setApplications] = useState<CompanyApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reqSkills, setReqSkills] = useState('');
  const [prefSkills, setPrefSkills] = useState('');
  const [location, setLocation] = useState('Remote');
  const [mode, setMode] = useState<'Remote' | 'Onsite' | 'Hybrid'>('Remote');
  const [stipend, setStipend] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyProfile) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch requirements
      const { data: reqData } = await supabase
        .from('internship_requirements')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('created_at', { ascending: false });

      if (reqData) {
        setRequirements(reqData as InternshipRequirement[]);
      }

      // 2. Fetch candidate applications
      const apps = await fetchCompanyApplications(companyProfile.id);
      setApplications(apps);
    } catch (err) {
      console.error('Error loading company requirements/applications:', err);
    } finally {
      setLoading(false);
    }
  }, [companyProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyProfile) return;

    setSaving(true);

    const { data, error } = await supabase
      .from('internship_requirements')
      .insert({
        company_id: companyProfile.id,
        title,
        description,
        required_skills: reqSkills.split(',').map(s => s.trim()).filter(Boolean),
        preferred_skills: prefSkills.split(',').map(s => s.trim()).filter(Boolean),
        location,
        mode,
        stipend,
        duration,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setRequirements([data as InternshipRequirement, ...requirements]);
      setShowModal(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Reset form
      setTitle('');
      setDescription('');
      setReqSkills('');
      setPrefSkills('');
      setLocation('Remote');
      setMode('Remote');
      setStipend('');
      setDuration('');
    }

    setSaving(false);
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: string) => {
    setUpdatingAppId(appId);
    const res = await updateApplicationStatus(appId, newStatus);
    if (res.success) {
      setActionNotice(`Application marked as ${newStatus.replace('_', ' ')}!`);
      setTimeout(() => setActionNotice(''), 4000);
      await loadData();
    }
    setUpdatingAppId(null);
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
      <div className="border-b border-surface-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-white" />
            Internship Postings & Applications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your company's internship requirements and review student candidate applications.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowModal(true)}
          icon={<Plus className="w-4 h-4 text-black" />}
        >
          Create Requirement
        </Button>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-surface-border gap-6">
        <button
          onClick={() => setActiveTab('postings')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'postings'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Active Postings ({requirements.length})
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Applications Received ({applications.length})
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> Requirement posted successfully!
        </div>
      )}

      {/* Postings Tab */}
      {activeTab === 'postings' && (
        <>
          {requirements.length === 0 && !showModal ? (
            <Card className="p-12 text-center border-dashed space-y-3">
              <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No requirements posted yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create your first internship requirement to publish roles to the AVUNK student network.
              </p>
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                + Create Requirement
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {requirements.map((req) => (
                <Card key={req.id} className="p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-border pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{req.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {req.mode} • {req.location} • {req.stipend} • Duration: {req.duration}
                      </p>
                    </div>
                    <Badge variant={req.is_active ? 'success' : 'warning'}>
                      {req.is_active ? 'Active Posting' : 'Inactive'}
                    </Badge>
                  </div>

                  {req.description && (
                    <p className="text-xs text-slate-300 leading-relaxed">{req.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-400">Required Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {req.required_skills.map((s, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 bg-surface-border text-slate-200 rounded font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                    {req.preferred_skills.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-500">Preferred:</span>
                        <div className="flex flex-wrap gap-1">
                          {req.preferred_skills.map((s, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-background text-slate-400 rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Applications Received Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <Card className="p-12 text-center border-dashed space-y-3">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No applications received yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When students apply for your posted internship requirements via AVUNK, their applications will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} className="p-5 bg-surface border-surface-border space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{app.student_name}</h4>
                        <Badge
                          variant={
                            app.status === 'shortlisted' || app.status === 'accepted'
                              ? 'success'
                              : app.status === 'under_review'
                              ? 'warning'
                              : app.status === 'rejected'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {app.status === 'shortlisted'
                            ? '✓ Shortlisted'
                            : app.status === 'under_review'
                            ? '● Under Review'
                            : app.status === 'rejected'
                            ? '✕ Rejected'
                            : 'Applied'}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-300">
                        Applied for: <strong className="text-white">{app.requirement_title}</strong>
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {app.student_institute}
                        </span>
                        {app.student_department && <span>• {app.student_department}</span>}
                        {app.student_graduation_year && <span>• Class of {app.student_graduation_year}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Tech Stack */}
                      {app.student_skills && app.student_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {app.student_skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-surface-border text-slate-300 rounded text-[10px] font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={updatingAppId === app.id}
                        onClick={() => handleUpdateAppStatus(app.id, 'shortlisted')}
                        icon={<Award className="w-3.5 h-3.5 text-black" />}
                      >
                        Shortlist
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        loading={updatingAppId === app.id}
                        onClick={() => handleUpdateAppStatus(app.id, 'under_review')}
                        icon={<Clock className="w-3.5 h-3.5" />}
                      >
                        Review
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        loading={updatingAppId === app.id}
                        onClick={() => handleUpdateAppStatus(app.id, 'rejected')}
                        icon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Requirement Modal */}
      {showModal && (
        <Card className="p-6 space-y-4 border-slate-600 bg-surface">
          <div className="flex justify-between items-center border-b border-surface-border pb-3">
            <h2 className="text-base font-bold text-white">Post New Internship Requirement</h2>
            <button onClick={() => setShowModal(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
          </div>

          <form onSubmit={handleCreateRequirement} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Requirement Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Developer Intern" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400">
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Key deliverables..." rows={3} className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Required Skills (comma separated) *</label>
                <input type="text" value={reqSkills} onChange={(e) => setReqSkills(e.target.value)} placeholder="React, TypeScript" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Skills (comma separated)</label>
                <input type="text" value={prefSkills} onChange={(e) => setPrefSkills(e.target.value)} placeholder="Docker, SQL" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote / City" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stipend</label>
                <input type="text" value={stipend} onChange={(e) => setStipend(e.target.value)} placeholder="₹25,000 / month" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duration</label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="6 Months" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>Publish Requirement</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
