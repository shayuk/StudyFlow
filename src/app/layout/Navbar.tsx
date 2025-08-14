import { Link, NavLink, useLocation } from 'react-router-dom';

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

export const Navbar = () => {
  const location = useLocation();
  const isApp = location.pathname.startsWith('/app');

  let navContent = null;
  if (location.pathname.startsWith('/app/student')) {
    navContent = <StudentNav />;
  } else if (location.pathname.startsWith('/app/lecturer')) {
    navContent = <LecturerNav />;
  }

  return (
    <nav className="bg-primary shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo />
            {isApp && (
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navContent}
                </div>
              </div>
            )}
          </div>
          {isApp && (
            <div className="hidden md:block">
              <button className="bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-4 rounded-full transition-colors">
                התנתקות
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
