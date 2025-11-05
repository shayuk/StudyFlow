import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { NotificationBell } from '../../features/notifications/NotificationBell.js';
import Button from '@/components/ui/Button';
import { AuthModal } from '@/features/auth/AuthModal';
import { useAuth, type AuthState } from '../../hooks/useAuth.ts';

const Logo = () => (
  <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white font-bold">
      א
    </div>
    <span className="text-xl font-bold text-white">StudyFlow</span>
  </Link>
);

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  end?: boolean;
}

const NavItem = ({ to, children, end = false }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }: { isActive: boolean }) =>
      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-accent text-white'
          : 'text-gray-300 hover:bg-primary-dark hover:text-white'
      }`
    }
  >
    {children}
  </NavLink>
);

const StudentNav = () => (
  <>
    <NavItem to="/app/student" end>הקורסים שלי</NavItem>
    <NavItem to="/app/student/report">דוח התקדמות</NavItem>
  </>
);

const LecturerNav = () => (
  <>
    <NavItem to="/app/lecturer/management">ניהול קורס</NavItem>
    <NavItem to="/app/lecturer/analysis">אנליזה</NavItem>
  </>
);

export const Navbar: React.FC = () => {
  const user = useAuth((s: AuthState) => s.user);
  const logout = useAuth((s: AuthState) => s.logout);
  const isStudent = user?.role === 'student';
  const isLecturer = user?.role === 'lecturer';
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo />
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4 rtl:space-x-reverse rtl:ml-0 rtl:mr-10">
                  {isStudent && <StudentNav />}
                  {isLecturer && <LecturerNav />}
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 space-x-4 rtl:space-x-reverse">
                {user ? (
                  <>
                    <NotificationBell />
                    <span className="text-gray-300">שלום, {user?.name}</span>
                    <button onClick={logout} className="bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-4 rounded-full transition-colors">
                      התנתקות
                    </button>
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setShowAuth(true)}>
                    התחברות
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
};
