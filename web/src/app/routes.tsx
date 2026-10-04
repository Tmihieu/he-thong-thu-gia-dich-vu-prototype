import type { ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router';

import { ChargesHubPage } from '../features/billing/ChargesHubPage';
import { CollectorAccountPage } from '../features/collection/CollectorAccountPage';
import { CollectorCashPage } from '../features/collection/CollectorCashPage';
import { CollectorAccountsPage } from '../features/collection/CollectorAccountsPage/CollectorAccountsPage';
import { CollectorListPage } from '../features/collection/CollectorListPage/CollectorListPage';
import { CompanyHubPage } from '../features/collection/CompanyHubPage';
import { CommuneComplaintsPage } from '../features/complaints/CommuneComplaintsPage';
import { CompanyComplaintsPage } from '../features/complaints/CompanyComplaintsPage';
import { MarketModerationPage, MarketModerationPostPage } from '../features/market/MarketPages';
import { AreasPage } from '../features/masterdata/AreasPage/AreasPage';
import { ApprovalsPage } from '../features/leadership/ApprovalsPage';
import { LeaderDashboardPage } from '../features/leadership/LeaderDashboardPage';
import { LeaderReportPage } from '../features/leadership/LeaderReportPage';
import { CompaniesPage } from '../features/masterdata/CompaniesPage/CompaniesPage';
import { ConfigPage } from '../features/masterdata/ConfigPage';
import { SubjectsPage } from '../features/masterdata/SubjectsPage/SubjectsPage';
import { NotificationCenterPage } from '../features/notifications/NotificationCenterPage';
import { AccountsPage } from '../features/platform/AccountsPage/AccountsPage';
import { DataAdminPage } from '../features/platform/DataAdminPage';
import { AuditLogPage } from '../features/platform/AuditLogPage/AuditLogPage';
import { ProgressPage } from '../features/remittance/ProgressPage/ProgressPage';
import { ReconciliationPage } from '../features/remittance/ReconciliationPage/ReconciliationPage';
import { LoginPage } from './auth/LoginPage';
import { RequireRole } from './auth/RequireRole';
import type { Role } from './auth/authContext';
import { homePath, MENU, ROLE_BASE, ROLES } from './layout/menuConfig';
import { RoleLayout } from './layout/RoleLayout';
import { NotFoundPage, RootRedirect } from './pages/StatusPages';

/** Màn theo `vai trò:đường dẫn menu`. */
const PAGES: Partial<Record<`${Role}:${string}`, ReactNode>> = {
  'ADMIN:accounts': <AccountsPage />,
  'ADMIN:config': <ConfigPage />,
  'ADMIN:logs': <AuditLogPage />,
  'ADMIN:data': <DataAdminPage />,
  'COMMUNE_OFFICER:areas': <AreasPage />,
  'COMMUNE_OFFICER:companies': <CompaniesPage />,
  'COMMUNE_OFFICER:subjects': <SubjectsPage />,
  'COMMUNE_OFFICER:charges': <ChargesHubPage />,
  'COMMUNE_OFFICER:progress': <ProgressPage />,
  'COMMUNE_OFFICER:reconciliation': <ReconciliationPage />,
  'COMMUNE_OFFICER:complaints': <CommuneComplaintsPage />,
  'COMMUNE_OFFICER:approvals': <ApprovalsPage />,
  'COMMUNE_OFFICER:market': <MarketModerationPage />,
  'LEADER:dashboard': <LeaderDashboardPage />,
  'LEADER:report': <LeaderReportPage />,
  'LEADER:progress': <ProgressPage />,
  'LEADER:reconciliation': <ReconciliationPage />,
  'COMPANY_MANAGER:complaints': <CompanyComplaintsPage />,
  'COMPANY_MANAGER:assigned': <CompanyHubPage />,
  'COMPANY_MANAGER:collectors': <CollectorAccountsPage />,
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
        element: PAGES[`${role}:${entry.path}`] ?? <NotFoundPage />,
      })),
      // Chợ cộng đồng: chỉ cán bộ xã quản lý (người dân dùng app), chi tiết bài là deep link từ thông báo.
      ...(role === 'COMMUNE_OFFICER' ? [{ path: 'market/:id', element: <MarketModerationPostPage /> }] : []),
      { path: 'notifications', element: <NotificationCenterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  })),
  { path: '*', element: <NotFoundPage /> },
];
