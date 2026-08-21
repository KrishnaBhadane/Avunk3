import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAllInternshipsForTP,
  verifyInternship,
} from '../../lib/internshipTracker';
import type { TPInternshipRecord } from '../../lib/internshipTracker';
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
} from 'lucide-react';

export const TPInternshipMonitor: React.FC = () => {

  const [records, setRecords] = useState<TPInternshipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllInternshipsForTP();
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // T&P can also verify/reject pending internships
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

  // Filter and search
  const filtered = records.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.internship.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student_institute.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const totalInternships = records.length;
  const pendingCount = records.filter((r) => r.internship.status === 'pending_verification').length;
  const activeCount = records.filter((r) => r.internship.status === 'active').length;
  const completedCount = records.filter((r) => r.internship.status === 'completed').length;
  const avgConsistency = records.length > 0
    ? Math.round(records.reduce((a, r) => a + r.consistency_percent, 0) / records.length)
    : 0;
  const totalLogs = records.reduce((a, r) => a + r.total_logs, 0);
  const totalApproved = records.reduce((a, r) => a + r.approved_logs, 0);

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
      <div className="border-b border-surface-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-white" />
          Internship Monitor — T&P Oversight
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track all student internships across all companies. Verify effectiveness, monitor daily logs, and ensure quality.
        </p>
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

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Internships</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalInternships}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Verification</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Active</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{activeCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-indigo-400 uppercase font-bold block">Completed</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">{completedCount}</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Logs</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalLogs}</span>
          <span className="text-[10px] text-emerald-500">{totalApproved} approved</span>
        </Card>
        <Card className="p-4 bg-surface border-surface-border text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg. Consistency</span>
          <span className="text-2xl font-black text-white mt-1 block">{avgConsistency}%</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, company, or institute..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex gap-1.5">
          {['all', 'pending_verification', 'active', 'completed', 'paused'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                filterStatus === status
                  ? 'bg-white text-black border-white'
                  : 'bg-surface-border text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {status === 'all' ? 'All' : status === 'pending_verification' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Internships Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Internships Found</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {records.length === 0
              ? 'No students have registered any internships yet.'
              : 'No internships match your current filter.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const { internship } = record;
            const isExpanded = expandedId === internship.id;
            const isPending = internship.status === 'pending_verification';

            return (
              <Card
                key={internship.id}
                className={`p-5 transition-all border ${
                  isPending
                    ? 'border-amber-800/50 bg-amber-950/10'
                    : internship.status === 'active'
                    ? 'border-surface-border bg-surface'
                    : internship.status === 'completed'
                    ? 'border-emerald-900/30 bg-emerald-950/10'
                    : 'border-surface-border bg-surface'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Student Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-surface-border text-white text-xs font-black flex items-center justify-center shrink-0 border border-slate-700 uppercase">
                      {record.student_name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{record.student_name}</h4>
                        <Badge
                          variant={
                            isPending ? 'warning'
                              : internship.status === 'active' ? 'info'
                              : internship.status === 'completed' ? 'success'
                              : 'default'
                          }
                        >
                          {isPending ? '⏳ Pending Verification'
                            : internship.status === 'active' ? '● Active'
                            : internship.status === 'completed' ? '✓ Completed'
                            : internship.status}
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
                        <span className="text-slate-500">
                          {internship.role}
                        </span>
                      </div>

                      {/* Tech Stack */}
                      {record.student_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {record.student_skills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-surface-border text-slate-400 rounded text-[9px] font-medium">
                              {skill}
                            </span>
                          ))}
                          {record.student_skills.length > 5 && (
                            <span className="text-[9px] text-slate-500">+{record.student_skills.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {!isPending && (
                      <div className="flex gap-2 text-center">
                        <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Logs</span>
                          <span className="text-sm font-black text-white">{record.total_logs}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                          <span className="text-[9px] text-emerald-400 uppercase font-bold block">Approved</span>
                          <span className="text-sm font-black text-emerald-400">{record.approved_logs}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-background rounded-lg border border-surface-border">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Consistency</span>
                          <span className={`text-sm font-black ${record.consistency_percent >= 70 ? 'text-emerald-400' : record.consistency_percent >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {record.consistency_percent}%
                          </span>
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

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-surface-border">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div className="p-3 bg-background rounded-xl border border-surface-border">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                        <span className="text-sm font-bold text-white block mt-0.5">{internship.total_days} days</span>
                      </div>
                      <div className="p-3 bg-background rounded-xl border border-surface-border">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Period</span>
                        <span className="text-[11px] font-medium text-white block mt-0.5">
                          {new Date(internship.start_date).toLocaleDateString()} — {new Date(internship.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="p-3 bg-background rounded-xl border border-surface-border">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Hours</span>
                        <span className="text-sm font-bold text-white block mt-0.5">{record.total_hours} hrs</span>
                      </div>
                      <div className="p-3 bg-background rounded-xl border border-surface-border">
                        <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Review</span>
                        <span className="text-sm font-bold text-amber-400 block mt-0.5">{record.pending_logs}</span>
                      </div>
                      <div className="p-3 bg-background rounded-xl border border-surface-border">
                        <span className="text-[10px] text-rose-400 uppercase font-bold block">Rejected</span>
                        <span className="text-sm font-bold text-rose-400 block mt-0.5">{record.rejected_logs}</span>
                      </div>
                    </div>

                    {/* Effectiveness Assessment */}
                    <div className="mt-4 p-4 rounded-xl bg-surface border border-slate-700 space-y-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Internship Effectiveness Assessment
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-surface-border h-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              record.consistency_percent >= 70
                                ? 'bg-emerald-500'
                                : record.consistency_percent >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${record.consistency_percent}%` }}
                          />
                        </div>
                        <span className={`text-sm font-black ${
                          record.consistency_percent >= 70
                            ? 'text-emerald-400'
                            : record.consistency_percent >= 40
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}>
                          {record.consistency_percent}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {record.consistency_percent >= 70
                          ? '✓ This internship appears effective — consistent daily work with verified approvals.'
                          : record.consistency_percent >= 40
                          ? '⚠ Moderate effectiveness — some gaps in daily work or mentor approvals.'
                          : record.total_logs === 0
                          ? '● No work logs submitted yet — cannot assess effectiveness.'
                          : '✕ Low effectiveness — significant gaps in daily deliverables or high rejection rate.'}
                      </p>
                    </div>

                    {internship.mentor_name && (
                      <div className="mt-3 text-xs text-slate-400">
                        Mentor: <strong className="text-white">{internship.mentor_name}</strong>
                        {internship.mentor_email && <span> ({internship.mentor_email})</span>}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
