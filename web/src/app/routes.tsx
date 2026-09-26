import type { ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router';

import { AreasPage } from '../features/masterdata/AreasPage/AreasPage';
import { ConfigPage } from '../features/masterdata/ConfigPage';
import { SubjectsPage } from '../features/masterdata/SubjectsPage/SubjectsPage';
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
      { path: '*', element: <NotFoundPage /> },
    ],
  })),
  { path: '*', element: <NotFoundPage /> },
];
