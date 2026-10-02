import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/unread.dart';

/// Thanh tab dưới: Trang chủ / Chợ đồ cũ / Thông báo (huy hiệu chưa đọc) / Tài khoản.
class TabShell extends StatelessWidget {
  const TabShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: shell,
        bottomNavigationBar: ListenableBuilder(
          listenable: unread,
          builder: (context, _) => NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Trang chủ',
              ),
              const NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: 'Chợ đồ cũ',
              ),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: unread.value > 0,
                  label: Text(unread.value > 99 ? '99+' : '${unread.value}'),
                  child: const Icon(Icons.notifications_outlined),
                ),
                selectedIcon: Badge(
                  isLabelVisible: unread.value > 0,
                  label: Text(unread.value > 99 ? '99+' : '${unread.value}'),
                  child: const Icon(Icons.notifications),
                ),
                label: 'Thông báo',
              ),
              const NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Tài khoản',
              ),
            ],
          ),
        ),
      );
}
