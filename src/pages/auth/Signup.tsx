import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { GraduationCap, Building2, UserCheck, Check, AlertCircle, Mail } from 'lucide-react';

export const Signup: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>('student');

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Student fields
  const [fullName, setFullName] = useState('');
  const [institute, setInstitute] = useState('');
  const [department, setDepartment] = useState('');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');

  // T&P fields
  const [institutionName, setInstitutionName] = useState('');
  const [tpAddress, setTpAddress] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let profileData: Record<string, any> = {};

    if (role === 'student') {
      if (!fullName.trim()) {
        setError('Full name is required');
        setLoading(false);
        return;
      }
      profileData = {
        fullName,
        institute,
        department,
        graduationYear,
        phone,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      };
    } else if (role === 'tp') {
      if (!institutionName.trim()) {
        setError('Institution name is required');
        setLoading(false);
        return;
      }
      profileData = {
        institutionName,
        address: tpAddress,
      };
    } else if (role === 'company') {
      if (!companyName.trim()) {
        setError('Company name is required');
        setLoading(false);
        return;
      }
      profileData = {
        companyName,
        industry,
        website,
        address: companyAddress,
      };
    }

    const result = await signup(email, password, role, profileData);

    if (!result.success) {
      setError(result.error || 'Signup failed. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);

    if (result.requiresEmailConfirmation) {
      setNeedsConfirmation(true);
    } else {
      // Immediate session: redirect after short delay
      setTimeout(() => {
        if (role === 'student') navigate('/student');
        else if (role === 'tp') navigate('/tp');
        else navigate('/company');
      }, 1500);
    }
  };

  if (success) {
    if (needsConfirmation) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 antialiased">
          <Card className="max-w-md w-full p-8 text-center space-y-5 border-slate-800 bg-surface">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-950/50">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Check Your Email</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                We've sent a verification link to <span className="font-semibold text-white">{email}</span>.
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Please click the link in the email to activate your account, then sign in to access your dashboard.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Go to Sign In
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center antialiased">
        <Card className="max-w-md w-full mx-4 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Account Created Successfully!</h2>
          <p className="text-xs text-slate-400">
            Your AVUNK {role === 'student' ? 'Student' : role === 'tp' ? 'T&P' : 'Company'} account is ready.
            {role === 'student' && ' You have received 2 free AI credits.'}
          </p>
          <p className="text-xs text-slate-500">Redirecting to your dashboard...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-black text-lg tracking-tighter">
              AV
            </div>
            <span className="font-extrabold tracking-widest text-white text-lg">AVUNK</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Your Account</h2>
          <p className="text-xs text-slate-400 mt-1">
            Step {step} of 2 — {step === 1 ? 'Credentials & Role' : 'Profile Details'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {step === 1 && (
          <Card className="p-6">
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Select Your Role
                </label>
                <div className="grid grid-cols-3 gap-2 bg-background p-1 rounded-xl border border-surface-border">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg text-xs font-semibold transition-all ${
                      role === 'student' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 mb-1" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('tp')}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg text-xs font-semibold transition-all ${
                      role === 'tp' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mb-1" />
                    T&P Cell
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('company')}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg text-xs font-semibold transition-all ${
                      role === 'company' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mb-1" />
                    Company
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2.5 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2.5 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full">
                Continue to Profile Details →
              </Button>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <button type="button" onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-white mb-2">
                ← Back to Step 1
              </button>

              {role === 'student' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Institution</label>
                      <input type="text" value={institute} onChange={(e) => setInstitute(e.target.value)} placeholder="e.g. IIT Delhi" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                      <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Graduation Year</label>
                      <input type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Skills (comma separated)</label>
                    <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Python" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                  </div>
                </>
              )}

              {role === 'tp' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Institution Name *</label>
                    <input type="text" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="e.g. IIT Delhi" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Address</label>
                    <input type="text" value={tpAddress} onChange={(e) => setTpAddress(e.target.value)} placeholder="Campus address" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                  </div>
                </>
              )}

              {role === 'company' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Apex Systems Labs" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                      <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Website</label>
                      <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://company.com" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Office Address</label>
                    <input type="text" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Office address" className="w-full px-3 py-2 bg-background border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-slate-400" />
                  </div>
                </>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                Create Account
              </Button>

              {role === 'student' && (
                <p className="text-[11px] text-center text-slate-500">
                  You'll receive 2 free AI credits upon account creation.
                </p>
              )}
            </form>
          </Card>
        )}

        <div className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
