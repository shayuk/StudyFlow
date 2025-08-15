import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.tsx';
import { StudentDashboard } from '../features/student/StudentDashboard.tsx';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.tsx';
import { StudentReportPage } from '../features/student/StudentReportPage.tsx';
import AnalyticsDashboard from '../features/lecturer/analytics/AnalyticsDashboard.tsx';
import { LecturerManagementDashboard } from '../features/lecturer/LecturerManagementDashboard.tsx';
import { LandingPage } from '../features/landing/LandingPage.tsx';

// Management Tabs
import CourseBuildingTab from '../features/lecturer/management/CourseBuildingTab.tsx';
import BotSettingsTab from '../features/lecturer/management/BotSettingsTab.tsx';
import AssignmentBuildingTab from '../features/lecturer/management/AssignmentBuildingTab.tsx';


const NotFound = () => <div className="text-center">404 - Page Not Found</div>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <NotFound />,
  },
  {
    path: '/app',
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: 'student',
        element: <ProtectedRoute allowedRoles={['student']} />,
        children: [
          { index: true, element: <StudentDashboard /> },
          { path: 'report', element: <StudentReportPage /> },
        ],
      },
      {
        path: 'lecturer',
        element: <ProtectedRoute allowedRoles={['lecturer']} />,
        children: [
          {
            path: 'management',
            element: <LecturerManagementDashboard />,
            children: [
              { index: true, element: <CourseBuildingTab /> },
              { path: 'bot-settings', element: <BotSettingsTab /> },
              { path: 'assignments', element: <AssignmentBuildingTab /> },
            ],
          },
          {
            path: 'analysis',
            element: <AnalyticsDashboard />,
          },
        ],
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
