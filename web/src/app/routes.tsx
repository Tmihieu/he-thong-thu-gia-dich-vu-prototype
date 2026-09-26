import type { ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router';

import { ChargesHubPage } from '../features/billing/ChargesHubPage';
import { CollectorAccountPage } from '../features/collection/CollectorAccountPage';
import { CollectorCashPage } from '../features/collection/CollectorCashPage';
import { CollectorListPage } from '../features/collection/CollectorListPage/CollectorListPage';
import { CompanyHubPage } from '../features/collection/CompanyHubPage';
import { CommuneComplaintsPage } from '../features/complaints/CommuneComplaintsPage';
import { CompanyComplaintsPage } from '../features/complaints/CompanyComplaintsPage';
import { AreasPage } from '../features/masterdata/AreasPage/AreasPage';
import { ConfigPage } from '../features/masterdata/ConfigPage';
import { SubjectsPage } from '../features/masterdata/SubjectsPage/SubjectsPage';
import { NotificationCenterPage } from '../features/notifications/NotificationCenterPage';
import { ProgressPage } from '../features/remittance/ProgressPage/ProgressPage';
import { ReconciliationPage } from '../features/remittance/ReconciliationPage/ReconciliationPage';
import { LoginPage } from './auth/LoginPage';
import { RequireRole } from './auth/RequireRole';
import type { Role } from './auth/authContext';
import { homePath, MENU, ROLE_BASE, ROLES } from './layout/menuConfig';
import { RoleLayout } from './layout/RoleLayout';
import { NotFoundPage, RootRedirect, UnderConstructionPage } from './pages/StatusPages';

/** Màn đã làm, theo `vai trò:đường dẫn menu`; màn chưa có trong đây hiển thị "Đang xây dựng". */
const PAGES: Partial<Record<`${Role}:${string}`, ReactNode>> = {
  'ADMIN:config': <ConfigPage />,
  'COMMUNE_OFFICER:areas': <AreasPage />,
  'COMMUNE_OFFICER:subjects': <SubjectsPage />,
  'COMMUNE_OFFICER:charges': <ChargesHubPage />,
  'COMMUNE_OFFICER:progress': <ProgressPage />,
  'COMMUNE_OFFICER:reconciliation': <ReconciliationPage />,
  'COMMUNE_OFFICER:complaints': <CommuneComplaintsPage />,
  'COMPANY_MANAGER:complaints': <CompanyComplaintsPage />,
  'COMPANY_MANAGER:assigned': <CompanyHubPage />,
  'COLLECTOR:list': <CollectorListPage />,
  'COLLECTOR:cash': <CollectorCashPage />,
  'COLLECTOR:account': <CollectorAccountPage />,
};

/** Mỗi vai trò một nhánh route. */
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <RootRedirect /> },
  ...ROLES.map<RouteObject>((role) => ({
    path: ROLE_BASE[role],
    element: (
      <RequireRole roles={[role]}>
        <RoleLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to={homePath(role)} replace /> },
      ...MENU[role].map((entry) => ({
        path: entry.path,
        element: PAGES[`${role}:${entry.path}`] ?? <UnderConstructionPage title={entry.label} />,
      })),
      { path: 'notifications', element: <NotificationCenterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  })),
  { path: '*', element: <NotFoundPage /> },
];
