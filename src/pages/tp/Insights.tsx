import React from 'react';
import { Card } from '../../components/common/Card';
import { TrendingUp, BarChart2, PieChart as PieIcon, Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const TPInsights: React.FC = () => {
  const deptData = [
    { department: 'Computer Science', avgScore: 86, total: 420 },
    { department: 'Electronics', avgScore: 81, total: 380 },
    { department: 'Electrical', avgScore: 76, total: 290 },
    { department: 'Mechanical', avgScore: 72, total: 150 },
  ];

  const skillDistribution = [
    { name: 'React / Frontend', value: 45, color: '#FFFFFF' },
    { name: 'Python / ML', value: 25, color: '#94A3B8' },
    { name: 'C++ / Embedded', value: 18, color: '#64748B' },
    { name: 'SQL / Databases', value: 12, color: '#334155' },
  ];

  return (
    <div className="space-y-8 antialiased">
      <div className="border-b border-surface-border pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <TrendingUp className="w-7 h-7 text-white" />
          Institutional Placement Analytics & Skill Gaps
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          High-level institutional insights across student batches, resume quality benchmarks, and tech distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              Average Resume Score by Department
            </h2>
            <span className="text-xs text-slate-500 font-mono">Benchmark: 80+</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <XAxis dataKey="department" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111318', borderColor: '#222631', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="avgScore" fill="#E2E8F0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-slate-400" />
              Student Skill Stack Distribution
            </h2>
            <span className="text-xs text-slate-500">Active Batches</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={skillDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {skillDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111318', borderColor: '#222631', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-surface-border pt-3">
            {skillDistribution.map((sk, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sk.color }} />
                <span className="text-slate-300 font-medium">{sk.name} ({sk.value}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Institutional Skill Gap Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-background rounded-xl border border-surface-border space-y-1">
            <span className="font-bold text-white block">Docker & Containerization</span>
            <p className="text-slate-400">Flagged missing in 42% of student resumes during company candidate matching.</p>
          </div>
          <div className="p-4 bg-background rounded-xl border border-surface-border space-y-1">
            <span className="font-bold text-white block">System Design & SQL</span>
            <p className="text-slate-400">Top requirement by recruiting companies for fullstack internship roles.</p>
          </div>
          <div className="p-4 bg-background rounded-xl border border-surface-border space-y-1">
            <span className="font-bold text-white block">ATS Format Standard</span>
            <p className="text-slate-400">18% of uploaded PDFs use multi-column layouts reducing parser compatibility.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
