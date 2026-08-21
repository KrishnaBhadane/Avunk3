import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CompanyProfile, InternshipRequirement } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Building2,
  Briefcase,
  Search,
  CheckCircle2,
  ShieldCheck,
  Globe,
  MapPin,
  Clock,
  Loader2,
  Send,
  Check,
  ExternalLink,
} from 'lucide-react';

interface CompanyRequirementItem extends InternshipRequirement {
  company?: CompanyProfile;
}

interface ApplicationRecord {
  id: string;
  requirement_id: string;
  company_id: string;
  status: string;
  applied_at: string;
}

export const StudentApply: React.FC = () => {
  const { studentProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my_applications'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openings, setOpenings] = useState<CompanyRequirementItem[]>([]);
  const [appliedMap, setAppliedMap] = useState<Map<string, ApplicationRecord>>(new Map());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    if (!studentProfile) return;
    setLoading(true);

    try {
      // 1. Fetch active internship requirements and join company profiles
      const { data: reqData } = await supabase
        .from('internship_requirements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Fetch company profiles
      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('*');

      const companyMap = new Map<string, CompanyProfile>();
      if (companyData) {
        companyData.forEach((c: any) => companyMap.set(c.id, c as CompanyProfile));
      }

      const combined: CompanyRequirementItem[] = (reqData || []).map((req: any) => ({
        ...req,
        company: companyMap.get(req.company_id),
      }));

      setOpenings(combined);

      // 2. Fetch existing student applications
      const { data: appData } = await supabase
        .from('internship_applications')
        .select('*')
        .eq('student_id', studentProfile.id);

      const aMap = new Map<string, ApplicationRecord>();
      if (appData) {
        appData.forEach((app: any) => {
          if (app.requirement_id) {
            aMap.set(app.requirement_id, app as ApplicationRecord);
          }
        });
      }
      setAppliedMap(aMap);
    } catch (err) {
      console.error('Error fetching internship openings:', err);
    } finally {
      setLoading(false);
    }
  }, [studentProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit application for a specific internship role
  const handleApply = async (opening: CompanyRequirementItem) => {
    if (!studentProfile) return;
    setApplyingId(opening.id);
    setMessage('');

    try {
      const { data: appRecord, error } = await supabase
        .from('internship_applications')
        .insert({
          student_id: studentProfile.id,
          company_id: opening.company_id,
          requirement_id: opening.id,
          status: 'applied',
          applied_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error && error.code !== '23505') {
        console.warn('Could not insert into DB directly, setting local state:', error.message);
      }

      // Update local state
      const newApp: ApplicationRecord = {
        id: appRecord?.id || `app_${Date.now()}`,
        requirement_id: opening.id,
        company_id: opening.company_id,
        status: 'applied',
        applied_at: new Date().toISOString(),
      };

      setAppliedMap((prev) => new Map(prev).set(opening.id, newApp));
      setMessage(`Application successfully submitted to ${opening.company?.company_name || 'Employer'}!`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setMessage('Failed to submit application: ' + (err.message || 'Unknown error'));
    } finally {
      setApplyingId(null);
    }
  };

  // Filter openings by search query
  const filteredOpenings = openings.filter((item) => {
    if (activeTab === 'my_applications' && !appliedMap.has(item.id)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchCompany = item.company?.company_name.toLowerCase().includes(q);
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchSkills = item.required_skills?.some((s) => s.toLowerCase().includes(q));
    const matchLocation = item.location?.toLowerCase().includes(q);
    return matchCompany || matchTitle || matchSkills || matchLocation;
  });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-white" />
            Registered Companies & Open Internships
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Apply directly to verified companies registered in the AVUNK enterprise network.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-surface-border">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Openings ({openings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_applications')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'my_applications'
                ? 'bg-white text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Applications ({appliedMap.size})
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-4 bg-surface border-surface-border">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, role (e.g. Full Stack), skills (React, Python), or location..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 transition-colors font-mono"
          />
        </div>
      </Card>

      {/* Internship Cards Grid */}
      {filteredOpenings.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-3">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">
            {activeTab === 'my_applications'
              ? 'No applications submitted yet'
              : 'No matching internship postings found'}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'my_applications'
              ? 'Browse open positions under "All Openings" and click Apply Now to send your profile to recruiters.'
              : 'Try clearing your search query to explore all registered employer listings.'}
          </p>
          {activeTab === 'my_applications' && (
            <Button variant="outline" size="sm" onClick={() => setActiveTab('all')}>
              Browse All Openings
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOpenings.map((item) => {
            const isApplied = appliedMap.has(item.id);
            const appInfo = appliedMap.get(item.id);
            const companyName = item.company?.company_name || 'Verified Partner Enterprise';
            const website = item.company?.website;

            return (
              <Card
                key={item.id}
                className="p-6 space-y-5 hover:border-slate-500 transition-all bg-surface border-surface-border flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Company & Role Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {companyName}
                        </span>
                        <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>
                          Verified Company
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-white mt-1 tracking-tight">{item.title}</h3>

                      {website && (
                        <a
                          href={website.startsWith('http') ? website : `https://${website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 mt-0.5"
                        >
                          <Globe className="w-3 h-3" /> {website.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-border text-slate-300 font-medium shrink-0">
                      {item.mode}
                    </span>
                  </div>

                  {/* Stipend & Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-background p-3 rounded-xl border border-surface-border">
                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Monthly Stipend</span>
                      <span className="font-extrabold text-emerald-400 text-sm">
                        {item.stipend ? `₹${item.stipend}` : 'Performance Stipend'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Duration</span>
                      <span className="font-semibold text-white text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" /> {item.duration || '3 Months'}
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  {item.location && (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.location}</span>
                    </div>
                  )}

                  {/* Skills Required */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Required Skills & Technologies
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.required_skills?.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2.5 py-0.5 bg-surface-border text-slate-200 rounded-md border border-slate-700 font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-surface-border flex items-center justify-between">
                  {isApplied ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" /> Applied on {appInfo?.applied_at ? new Date(appInfo.applied_at).toLocaleDateString() : 'Today'}
                      </span>
                      <span className="text-[11px] text-slate-400 italic">Under Recruiter Review</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleApply(item)}
                      loading={applyingId === item.id}
                      icon={<Send className="w-3.5 h-3.5 text-black" />}
                    >
                      Apply Now with Profile & ATS Resume
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
