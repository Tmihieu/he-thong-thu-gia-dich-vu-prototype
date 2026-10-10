import 'package:flutter_test/flutter_test.dart';
import 'package:vsmt_citizen/api/models.dart';

void main() {
  Map<String, Object?> json(Object? photoUrls) => {
        'id': 1,
        'code': 'KN-1026-001',
        'receivedDate': '2026-10-14',
        'category': 'LATE_COLLECTION',
        'summary': 's',
        'content': 'c',
        'status': 'NEW',
        'overdue': false,
        'photoUrls': photoUrls,
      };

  test('Complaint đọc danh sách URL ảnh đính kèm', () {
    final c = Complaint.fromJson(json(['https://res.cloudinary.com/demo/image/upload/a.jpg']));
    expect(c.photoUrls, ['https://res.cloudinary.com/demo/image/upload/a.jpg']);
  });

  test('Complaint không có ảnh thì photoUrls rỗng', () {
    expect(Complaint.fromJson(json(null)).photoUrls, isEmpty);
    expect(Complaint.fromJson(json(<String>[])).photoUrls, isEmpty);
  });
}
