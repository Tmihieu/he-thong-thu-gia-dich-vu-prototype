import 'client.dart';
import 'models.dart';

/// API người dân `/api/citizen/*` (giống `citizenApi` của app Expo).
class CitizenApi {
  const CitizenApi(this._api);

  final ApiClient _api;

  Future<String> requestOtp(String phone) async =>
      ((await _api.post('/api/citizen/auth/otp/request', {'phone': phone})) as Json)['message'].toString();

  Future<LoginResult> verifyOtp(String phone, String otp) async =>
      LoginResult.fromJson(await _api.post('/api/citizen/auth/otp/verify', {'phone': phone, 'otp': otp}) as Json);

  Future<CitizenProfile> me() async => CitizenProfile.fromJson(await _api.get('/api/citizen/me') as Json);

  Future<List<CitizenCharge>> charges() async =>
      [for (final c in await _api.get('/api/citizen/charges') as List) CitizenCharge.fromJson(c as Json)];

  Future<CitizenCharge> charge(int id) async =>
      CitizenCharge.fromJson(await _api.get('/api/citizen/charges/$id') as Json);

  /// Trả về xác nhận thanh toán (backend trả lại bản cũ nếu `clientRequestId` đã dùng).
  Future<PaymentConfirmation> pay(int chargeId, int amount, String clientRequestId) async {
    final res = await _api.post('/api/citizen/payments', {
      'chargeId': chargeId,
      'amount': amount,
      'clientRequestId': clientRequestId,
    }) as Json;
    return PaymentConfirmation.fromJson(res['confirmation'] as Json);
  }

  Future<List<PaymentConfirmation>> confirmations() async =>
      [for (final p in await _api.get('/api/citizen/payments') as List) PaymentConfirmation.fromJson(p as Json)];

  Future<PaymentConfirmation> confirmation(int id) async =>
      PaymentConfirmation.fromJson(await _api.get('/api/citizen/payments/$id/confirmation') as Json);

  Future<CitizenSchedule> schedule() async =>
      CitizenSchedule.fromJson(await _api.get('/api/citizen/schedule') as Json);

  Future<List<Complaint>> complaints() async =>
      [for (final c in await _api.get('/api/citizen/complaints') as List) Complaint.fromJson(c as Json)];

  Future<ComplaintDetail> complaint(int id) async =>
      ComplaintDetail.fromJson(await _api.get('/api/citizen/complaints/$id') as Json);

  Future<ComplaintDetail> submitComplaint({required String category, required String content, String? location}) async =>
      ComplaintDetail.fromJson(await _api.post('/api/citizen/complaints', {
        'category': category,
        'content': content,
        'location': ?location,
      }) as Json);

  Future<NotificationPage> notifications({String? kind}) async => NotificationPage.fromJson(
      await _api.get('/api/citizen/notifications', params: {'kind': kind, 'size': 100}) as Json);

  Future<int> unreadCount() async =>
      ((await _api.get('/api/citizen/notifications/unread-count')) as Json)['unreadCount'] as int;

  Future<void> markRead(int id) => _api.post('/api/citizen/notifications/$id/read');

  Future<void> markAllRead() => _api.post('/api/citizen/notifications/read-all');

}

final citizenApi = CitizenApi(api);
