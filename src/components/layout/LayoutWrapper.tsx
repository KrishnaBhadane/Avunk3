import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditContext';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, tpProfile, companyProfile } = useAuth();
  const { totalCredits } = useCredits();

  if (!user) return <>{children}</>;

  let isVerified = true;
  let verificationLabel = 'Verified Account';

  if (user.role === 'tp' && tpProfile) {
    isVerified = tpProfile.verification_status === 'verified';
    verificationLabel = isVerified ? 'Verified Institution' : 'Verification Pending';
  } else if (user.role === 'company' && companyProfile) {
    isVerified = companyProfile.verification_status === 'verified';
    verificationLabel = isVerified ? 'Verified Enterprise' : 'Verification Pending';
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col md:flex-row antialiased selection:bg-slate-700 selection:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="h-14 border-b border-surface-border bg-sidebar/50 px-4 md:px-8 flex items-center justify-between sticky top-0 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-6 h-6 rounded bg-white text-black font-black text-xs flex items-center justify-center">
              AV
            </div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
              {user.role} Intelligence Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user.role !== 'student' && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 ${
                  isVerified
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                }`}
              >
                {isVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{verificationLabel}</span>
              </span>
            )}

            {user.role === 'student' && (
              <Link
                to="/student/plus"
                className="flex items-center gap-1.5 text-xs bg-surface border border-surface-border px-3 py-1 rounded-full hover:border-amber-500/50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-white">{totalCredits}</span>
                <span className="text-slate-400">AI Credits</span>
              </Link>
            )}
          </div>
        </header>

        {user.role !== 'student' && !isVerified && (
          <div className="bg-amber-950/50 border-b border-amber-900/50 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Your institutional verification status is <strong>Pending</strong>. Institutional data access is restricted until document verification completes.
              </span>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
};
