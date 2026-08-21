import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { Button } from '../../components/common/Button';
import { ShieldCheck, UserCheck, Building2, GraduationCap, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');

    const result = await login(cleanEmail, password);

    if (!result.success) {
      setError(result.error || 'Invalid credentials or network failure');
      setLoading(false);
      return;
    }

    // Navigation will be handled by auth state change + ProtectedRoute
    // But we need to read the role from the profile to know where to redirect.
    // The AuthContext will set the user, and then we redirect based on role.
    // For now, we wait a beat for the auth state to propagate.
    setTimeout(() => {
      // The role selector on login is just a UX hint — the actual role comes from DB.
      // After login, the root / route will redirect to the correct dashboard.
      navigate('/');
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row antialiased selection:bg-slate-700 selection:text-white">
      {/* Left Branding Side */}
      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-surface-border bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xl tracking-tighter shadow-lg">
            AV
          </div>
          <div>
            <h1 className="font-extrabold tracking-widest text-white text-xl">AVUNK</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Internship Intelligence & Verification
            </p>
          </div>
        </div>

        <div className="my-12 md:my-0 space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-surface-border text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verification Platform for Institutions & Companies</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Evidence-Based Internship Verification & Talent Intelligence
          </h2>

          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Connecting Students, Training & Placement departments, and verified employers through deterministic risk scores, AI resume parsing, and skill matching.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="bg-surface border border-surface-border p-3 rounded-lg text-center">
              <p className="text-lg font-bold text-white">Students</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Risk & Skill Audit</p>
            </div>
            <div className="bg-surface border border-surface-border p-3 rounded-lg text-center">
              <p className="text-lg font-bold text-white">T&P Cells</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Institutional Portal</p>
            </div>
            <div className="bg-surface border border-surface-border p-3 rounded-lg text-center">
              <p className="text-lg font-bold text-white">Companies</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Match Candidates</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 relative z-10 flex items-center justify-between">
          <span>AVUNK Enterprise v2.4</span>
          <span>Security & Compliance Encrypted</span>
        </div>
      </div>

      {/* Right Login Form Side */}
      <div className="md:w-1/2 p-6 md:p-16 flex flex-col justify-center items-center bg-background">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Sign In to AVUNK</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter your verified credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                Account Role
              </label>
              <div className="grid grid-cols-3 gap-2 bg-surface p-1 rounded-xl border border-surface-border">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    role === 'student'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 mb-1" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('tp')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    role === 'tp'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 mb-1" />
                  T&P Cell
                </button>
                <button
                  type="button"
                  onClick={() => setRole('company')}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    role === 'company'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 mb-1" />
                  Company
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {role === 'student' ? 'Student Email' : role === 'tp' ? 'Institution Email' : 'Company Business Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    role === 'student'
                      ? 'you@university.edu'
                      : role === 'tp'
                      ? 'tp@university.edu'
                      : 'hiring@company.com'
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400 transition-colors"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Sign In to Dashboard
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-400">
            Don't have an AVUNK account?{' '}
            <Link to="/signup" className="text-white font-semibold hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
