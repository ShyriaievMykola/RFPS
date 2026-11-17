import { createBrowserRouter } from 'react-router';
import { AppShell } from './AppShell';
import { NotFoundPage, RouteErrorPage } from './errorPages';
import { GuestOnly, HomeRedirect, RequireAuth, RequireRole } from './guards';

// Сторінки завантажуються окремими частинами (code splitting): на екрані входу
// браузер не тягне бібліотеку графіків чи генератор PDF.
const lazyPage = <K extends string>(
  load: () => Promise<Record<K, React.ComponentType>>,
  name: K,
) => {
  return async () => ({ Component: (await load())[name] });
};

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', lazy: lazyPage(() => import('@/features/auth/LoginPage'), 'LoginPage') },
          {
            path: 'register',
            lazy: lazyPage(() => import('@/features/auth/RegisterPage'), 'RegisterPage'),
          },
          {
            path: 'forgot',
            lazy: lazyPage(() => import('@/features/auth/ForgotPage'), 'ForgotPage'),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <HomeRedirect /> },
              {
                element: <RequireRole role="resident" />,
                children: [
                  {
                    path: 'dashboard',
                    lazy: lazyPage(
                      () => import('@/features/dashboard/DashboardPage'),
                      'DashboardPage',
                    ),
                  },
                  {
                    path: 'analytics',
                    lazy: lazyPage(
                      () => import('@/features/analytics/AnalyticsPage'),
                      'AnalyticsPage',
                    ),
                  },
                  {
                    path: 'limits',
                    lazy: lazyPage(() => import('@/features/limits/LimitsPage'), 'LimitsPage'),
                  },
                  {
                    path: 'reports',
                    lazy: lazyPage(() => import('@/features/reports/ReportsPage'), 'ReportsPage'),
                  },
                ],
              },
              {
                path: 'admin',
                element: <RequireRole role="admin" />,
                children: [
                  {
                    index: true,
                    lazy: lazyPage(
                      () => import('@/features/admin/AdminOverviewPage'),
                      'AdminOverviewPage',
                    ),
                  },
                  {
                    path: 'apartments',
                    lazy: lazyPage(
                      () => import('@/features/admin/ApartmentsPage'),
                      'ApartmentsPage',
                    ),
                  },
                  {
                    path: 'announcements',
                    lazy: lazyPage(
                      () => import('@/features/admin/AnnouncementsPage'),
                      'AnnouncementsPage',
                    ),
                  },
                ],
              },
              {
                path: 'outages',
                lazy: lazyPage(() => import('@/features/outages/OutagesPage'), 'OutagesPage'),
              },
              {
                path: 'settings',
                lazy: lazyPage(() => import('@/features/settings/SettingsPage'), 'SettingsPage'),
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
