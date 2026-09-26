import { Navigate, type RouteObject } from 'react-router';

import { LoginPage } from './auth/LoginPage';
import { RequireRole } from './auth/RequireRole';
import { homePath, MENU, ROLE_BASE, ROLES } from './layout/menuConfig';
import { RoleLayout } from './layout/RoleLayout';
import { NotFoundPage, RootRedirect, UnderConstructionPage } from './pages/StatusPages';

/** Mỗi vai trò một nhánh route; màn chưa làm hiển thị "Đang xây dựng". */
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
      ...MENU[role].map((entry) => ({ path: entry.path, element: <UnderConstructionPage title={entry.label} /> })),
      { path: '*', element: <NotFoundPage /> },
    ],
  })),
  { path: '*', element: <NotFoundPage /> },
];
