import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Sparkles, Zap, FileCheck, Check, Clock, CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const StudentPlus: React.FC = () => {
  const { credits, transactions, totalCredits } = useCredits();

  return (
    <div className="space-y-8 antialiased">
      <div className="border-b border-surface-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-amber-400" />
            AVUNK Plus & Credit Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your AI verification balance, credit history, and tier benefits.
          </p>
        </div>

        <Badge variant="gold" icon={<Sparkles className="w-3.5 h-3.5" />}>
          {totalCredits > 0 ? `${totalCredits} Credits Available` : '0 Credits Left'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-surface to-sidebar border-slate-700 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Free Credits Balance</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-white">{credits.free_credits}</span>
            <p className="text-xs text-slate-400 mt-1">Student verification grant</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-surface to-sidebar border-slate-700 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid Credits Balance</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-white">{credits.paid_credits}</span>
            <p className="text-xs text-slate-400 mt-1">Purchased verification packs</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-surface to-sidebar border-slate-700 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Transactions</span>
            <FileCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-white">{transactions.length}</span>
            <p className="text-xs text-slate-400 mt-1">Ledger operations recorded</p>
          </div>
        </Card>
      </div>

      {/* Credit History Ledger */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">Credit Transaction Ledger</h2>
        {transactions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No credit transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-border text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-hover">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                        tx.type === 'grant' || tx.type === 'addition' || tx.type === 'refund'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}>
                        {tx.type === 'deduction' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{tx.reason}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-8 border-amber-900/40 bg-amber-950/20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" /> Future Feature (Coming Soon in V2)
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AVUNK Plus Pro Subscription</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            Unlimited offer verifications, priority Gemini 1.5 Pro deep research pipelines, and direct employer application routing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-2">
          <div className="bg-surface p-4 rounded-xl border border-surface-border space-y-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold text-white">Unlimited Offer Audits</p>
            <p className="text-[11px] text-slate-400">Never run out of verification credits.</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-surface-border space-y-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold text-white">Priority AI Research</p>
            <p className="text-[11px] text-slate-400">Deep search registry lookup.</p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-surface-border space-y-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold text-white">Verified Badge</p>
            <p className="text-[11px] text-slate-400">Stand out in company searches.</p>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="secondary" size="md" disabled icon={<CreditCard className="w-4 h-4" />}>
            Razorpay Integration Disabled in V1 Demo
          </Button>
        </div>
      </Card>
    </div>
  );
};
