import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'auth/session.dart';
import 'features/account/account_screen.dart';
import 'features/account/household_screen.dart';
import 'features/auth/connection_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/charges/charges_screens.dart';
import 'features/complaints/complaint_screens.dart';
import 'features/home/home_screen.dart';
import 'features/market/market_detail_screen.dart';
import 'features/market/market_feed_screen.dart';
import 'features/market/market_lists.dart';
import 'features/market/post_form_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/schedule/schedule_screen.dart';
import 'features/shell/tab_shell.dart';
import 'shared/theme.dart';

int _id(GoRouterState s, [String name = 'id']) => int.tryParse(s.pathParameters[name] ?? '') ?? 0;

bool _fresh(GoRouterState s) => s.uri.queryParameters['fresh'] == '1';

/// Chưa đăng nhập thì về /login (trừ màn kiểm tra kết nối); đã đăng nhập mà ở /login thì về trang chủ.
String? authRedirect(bool signedIn, String location) {
  final public = location == '/login' || location == '/connection';
  if (!signedIn && !public) return '/login';
  if (signedIn && location == '/login') return '/home';
  return null;
}

GoRouter buildRouter() => GoRouter(
      initialLocation: '/home',
      refreshListenable: session,
      redirect: (context, state) => authRedirect(session.signedIn, state.matchedLocation),
      routes: [
        GoRoute(path: '/', redirect: (_, _) => '/home'),
        GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
        GoRoute(path: '/connection', builder: (_, _) => const ConnectionScreen()),
        StatefulShellRoute.indexedStack(
          builder: (context, state, shell) => TabShell(shell: shell),
          branches: [
            StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/market', builder: (_, _) => const MarketFeedScreen())]),
            StatefulShellBranch(
              routes: [GoRoute(path: '/notifications', builder: (_, _) => const NotificationsScreen())],
            ),
            StatefulShellBranch(routes: [GoRoute(path: '/account', builder: (_, _) => const AccountScreen())]),
          ],
        ),
        GoRoute(path: '/charges', builder: (_, _) => const ChargesScreen()),
        GoRoute(path: '/household', builder: (_, _) => const HouseholdScreen()),
        GoRoute(path: '/pay/:chargeId', builder: (_, s) => PayScreen(chargeId: _id(s, 'chargeId'))),
        GoRoute(path: '/confirmations', builder: (_, _) => const ConfirmationsScreen()),
        GoRoute(
          path: '/confirmations/:id',
          builder: (_, s) => ConfirmationScreen(id: _id(s), fresh: _fresh(s)),
        ),
        GoRoute(path: '/schedule', builder: (_, _) => const ScheduleScreen()),
        GoRoute(path: '/complaints', builder: (_, _) => const ComplaintsScreen()),
        GoRoute(path: '/complaints/new', builder: (_, _) => const NewComplaintScreen()),
        GoRoute(
          path: '/complaints/:id',
          builder: (_, s) => ComplaintDetailScreen(id: _id(s), fresh: _fresh(s)),
        ),
        GoRoute(
          path: '/posts/new',
          builder: (_, s) => PostFormScreen(id: int.tryParse(s.uri.queryParameters['id'] ?? '')),
        ),
        GoRoute(path: '/posts/mine', builder: (_, _) => const MyPostsScreen()),
        GoRoute(path: '/posts/saved', builder: (_, _) => const SavedPostsScreen()),
        GoRoute(path: '/posts/blocks', builder: (_, _) => const BlockedUsersScreen()),
        GoRoute(path: '/posts/:id', builder: (_, s) => MarketDetailScreen(id: _id(s))),
      ],
    );

class CitizenApp extends StatefulWidget {
  const CitizenApp({super.key});

  @override
  State<CitizenApp> createState() => _CitizenAppState();
}

class _CitizenAppState extends State<CitizenApp> {
  final _router = buildRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
        title: 'Thu giá VSMT',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        routerConfig: _router,
      );
}
