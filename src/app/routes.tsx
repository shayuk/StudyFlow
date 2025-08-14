import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.tsx';
import { StudentDashboard } from '../features/student/StudentDashboard.tsx';
import { StudentReportPage } from '../features/student/StudentReportPage.tsx';
import { LecturerDashboard } from '../features/lecturer/LecturerDashboard.tsx';
import { LecturerManagementDashboard } from '../features/lecturer/LecturerManagementDashboard.tsx';
import { LandingPage } from '../features/landing/LandingPage.tsx';

// Management Tabs
import CourseBuildingTab from '../features/lecturer/management/CourseBuildingTab.tsx';
import BotSettingsTab from '../features/lecturer/management/BotSettingsTab.tsx';
import AssignmentBuildingTab from '../features/lecturer/management/AssignmentBuildingTab.tsx';

// Analysis Tabs
import StudentAnalysisTab from '../features/lecturer/analysis/StudentAnalysisTab.tsx';
import ClassAnalysisTab from '../features/lecturer/analysis/ClassAnalysisTab.tsx';

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
        element: <StudentDashboard />,
      },
      {
        path: 'student/report',
        element: <StudentReportPage />,
      },
      {
        path: 'lecturer',
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
            element: <LecturerDashboard />,
            children: [
              { index: true, element: <StudentAnalysisTab /> },
              { path: 'class', element: <ClassAnalysisTab /> },
            ],
          },
        ],
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
