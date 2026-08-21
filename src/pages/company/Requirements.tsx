import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { InternshipRequirement } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Briefcase, Plus, Check, Loader2 } from 'lucide-react';

export const CompanyRequirements: React.FC = () => {
  const { companyProfile } = useAuth();
  const [requirements, setRequirements] = useState<InternshipRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  // Fetch requirements from Supabase
  useEffect(() => {
    const fetchRequirements = async () => {
      if (!companyProfile) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('internship_requirements')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequirements(data as InternshipRequirement[]);
      }
      setLoading(false);
    };

    fetchRequirements();
  }, [companyProfile]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 antialiased">
      <div className="border-b border-surface-border pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-white" />
            Internship Requirement Postings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define role criteria and skill benchmarks for candidate matching.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4 text-black" />}>
          Create Requirement
        </Button>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> Requirement posted successfully!
        </div>
      )}

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

      {requirements.length === 0 && !showModal ? (
        <Card className="p-8 text-center">
          <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No requirements posted yet.</p>
          <p className="text-xs text-slate-500 mt-1">Create your first internship requirement to start matching candidates.</p>
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
    </div>
  );
};
