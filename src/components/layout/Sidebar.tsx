import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  FileText,
  TrendingUp,
  User,
  Users,
  Briefcase,
  Search,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditContext';
import { Tooltip } from '../common/Tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: any;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { totalCredits } = useCredits();
  const navigate = useNavigate();

  if (!user) return null;

  const studentLinks: NavItem[] = [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/offer-check', label: 'Offer Check', icon: FileCheck },
    { to: '/student/resume', label: 'Resume', icon: FileText },
    { to: '/student/insights', label: 'Insights', icon: TrendingUp },
    { to: '/student/profile', label: 'Profile', icon: User },
    { to: '/student/plus', label: 'AVUNK Plus', icon: Sparkles, badge: `${totalCredits} Credits` },
  ];

  const tpLinks: NavItem[] = [
    { to: '/tp', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tp/students', label: 'Students', icon: Users },
    { to: '/tp/insights', label: 'Insights', icon: TrendingUp },
    { to: '/tp/profile', label: 'Profile', icon: User },
  ];

  const companyLinks: NavItem[] = [
    { to: '/company', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/company/requirements', label: 'Requirements', icon: Briefcase },
    { to: '/company/find-students', label: 'Find Candidates', icon: Search },
    { to: '/company/profile', label: 'Profile', icon: User },
  ];

  const links =
    user.role === 'student'
      ? studentLinks
      : user.role === 'tp'
      ? tpLinks
      : companyLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-surface-border h-screen sticky top-0 shrink-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black tracking-tighter text-sm">
            AV
          </div>
          <div>
            <h1 className="font-extrabold tracking-widest text-white text-base leading-none">AVUNK</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">
              Intelligence Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          {user.role} Portal
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/student' || link.to === '/tp' || link.to === '/company'}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 font-mono">
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-surface-border space-y-3 bg-surface/50">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user.email}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role} Account</p>
            </div>
          </div>
          <Tooltip content="Sign Out">
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};
