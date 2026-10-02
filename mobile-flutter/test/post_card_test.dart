import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vsmt_citizen/api/models.dart';
import 'package:vsmt_citizen/features/market/market_common.dart';
import 'package:vsmt_citizen/shared/labels.dart';
import 'package:vsmt_citizen/shared/theme.dart';

MarketPost _post({bool mine = false, String status = 'OPEN', String moderation = 'PUBLISHED'}) =>
    MarketPost.fromJson({
      'id': 1,
      'code': 'CHO-1',
      'caption': 'Xe đạp trẻ em\nCòn mới 80%',
      'tags': ['GIVE', 'EXCHANGE'],
      'category': 'TOOLS_VEHICLES',
      'area': {'name': 'Tổ 2'},
      'author': {'citizenId': 2, 'displayName': 'Lê Văn C'},
      'status': status,
      'moderation': moderation,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
      'commentCount': 3,
      'mine': mine,
    });

Widget _wrap(Widget child) => MaterialApp(
      theme: buildTheme(),
      home: Scaffold(body: Center(child: SizedBox(width: 180, height: 320, child: child))),
    );

void main() {
  testWidgets('thẻ tin hiện tiêu đề, nhãn, tổ và nút lưu', (tester) async {
    var saves = 0;
    await tester.pumpWidget(_wrap(PostCard(post: _post(), onTap: () {}, onToggleSave: () => saves++)));
    expect(find.text('Xe đạp trẻ em'), findsOneWidget);
    expect(find.text('${marketTagLabels['GIVE']} · ${marketTagLabels['EXCHANGE']}'), findsOneWidget);
    expect(find.textContaining('Tổ 2 · Vừa xong'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.favorite_border));
    expect(saves, 1);
  });

  testWidgets('bài của mình không có nút lưu, hiện trạng thái chờ duyệt', (tester) async {
    await tester.pumpWidget(_wrap(PostCard(
      post: _post(mine: true, moderation: 'PENDING_REVIEW'),
      onTap: () {},
      onToggleSave: () {},
      showStatus: true,
    )));
    expect(find.byIcon(Icons.favorite_border), findsNothing);
    expect(find.text('Chờ duyệt'), findsOneWidget);
  });

  testWidgets('bài đã xong có lớp phủ', (tester) async {
    await tester.pumpWidget(_wrap(PostCard(post: _post(status: 'CLOSED'), onTap: () {})));
    expect(find.text('Đã xong'), findsOneWidget);
  });

  test('withSaved chỉ đổi trạng thái lưu', () {
    final p = _post().withSaved(true);
    expect(p.saved, isTrue);
    expect(p.title, 'Xe đạp trẻ em');
  });
}
