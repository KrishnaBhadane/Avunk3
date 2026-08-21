import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  FileText,
  TrendingUp,
  User,
  Users,
  Briefcase,
  Search,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const studentLinks = [
    { to: '/student', label: 'Home', icon: LayoutDashboard },
    { to: '/student/tracker', label: 'Tracker', icon: Clock },
    { to: '/student/offer-check', label: 'Verify', icon: FileCheck },
    { to: '/student/resume', label: 'Resume', icon: FileText },
    { to: '/student/profile', label: 'Profile', icon: User },
  ];

  const tpLinks = [
    { to: '/tp', label: 'Home', icon: LayoutDashboard },
    { to: '/tp/students', label: 'Students', icon: Users },
    { to: '/tp/insights', label: 'Analytics', icon: TrendingUp },
    { to: '/tp/profile', label: 'Profile', icon: User },
  ];

  const companyLinks = [
    { to: '/company', label: 'Home', icon: LayoutDashboard },
    { to: '/company/intern-tracker', label: 'Interns', icon: Clock },
    { to: '/company/requirements', label: 'Postings', icon: Briefcase },
    { to: '/company/find-students', label: 'Candidates', icon: Search },
    { to: '/company/profile', label: 'Profile', icon: User },
  ];

  const links =
    user.role === 'student'
      ? studentLinks
      : user.role === 'tp'
      ? tpLinks
      : companyLinks;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-md border-t border-surface-border px-2 py-1.5 flex justify-around items-center">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/student' || link.to === '/tp' || link.to === '/company'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-white font-bold' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
