import { NavLink, Outlet } from 'react-router-dom';

const AnalysisTab = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `px-4 py-2 font-semibold border-b-2 transition-colors ${
        isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`
    }
  >
    {children}
  </NavLink>
);

export const LecturerDashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">דשבורד אנליזה</h1>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6 rtl:space-x-reverse">
          <AnalysisTab to=".">אנליזה - תלמיד</AnalysisTab>
          <AnalysisTab to="class">אנליזה - כיתה</AnalysisTab>
        </nav>
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
