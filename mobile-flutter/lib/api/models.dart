/// Kiểu dữ liệu theo DTO của backend (`/v3/api-docs`). Enum giữ dạng chuỗi như backend, nhãn ở `labels.dart`.
library;

typedef Json = Map<String, dynamic>;

int _int(Object? v) => (v as num).toInt();
int? _intOrNull(Object? v) => v == null ? null : (v as num).toInt();
String _str(Object? v) => v?.toString() ?? '';
String? _strOrNull(Object? v) => v?.toString();
List<String> _strings(Object? v) => [for (final x in (v as List? ?? const [])) x.toString()];
List<T> _list<T>(Object? v, T Function(Json) f) => [for (final x in (v as List? ?? const [])) f(x as Json)];

class PageResult<T> {
  const PageResult({required this.items, required this.total, required this.page, required this.hasMore});

  factory PageResult.fromJson(Json j, T Function(Json) f) => PageResult(
        items: _list(j['items'], f),
        total: _int(j['total'] ?? 0),
        page: _int(j['page'] ?? 0),
        hasMore: j['hasMore'] == true,
      );

  final List<T> items;
  final int total;
  final int page;
  final bool hasMore;
}

// ---------- Tài khoản ----------

class CitizenAccount {
  const CitizenAccount({
    required this.id,
    required this.phone,
    required this.displayName,
    required this.subjectCode,
    required this.subjectName,
  });

  factory CitizenAccount.fromJson(Json j) => CitizenAccount(
        id: _int(j['id']),
        phone: _str(j['phone']),
        displayName: _str(j['displayName']),
        subjectCode: _str(j['subjectCode']),
        subjectName: _str(j['subjectName']),
      );

  final int id;
  final String phone;
  final String displayName;
  final String subjectCode;
  final String subjectName;

  Json toJson() => {
        'id': id,
        'phone': phone,
        'displayName': displayName,
        'subjectCode': subjectCode,
        'subjectName': subjectName,
      };
}

class LoginResult {
  const LoginResult({required this.accessToken, required this.expiresAt, required this.account});

  factory LoginResult.fromJson(Json j) => LoginResult(
        accessToken: _str(j['accessToken']),
        expiresAt: _str(j['expiresAt']),
        account: CitizenAccount.fromJson(j['account'] as Json),
      );

  final String accessToken;
  final String expiresAt;
  final CitizenAccount account;

  Json toJson() => {'accessToken': accessToken, 'expiresAt': expiresAt, 'account': account.toJson()};
}

class Household {
  const Household({
    required this.code,
    required this.name,
    required this.subjectType,
    required this.address,
    required this.phone,
    required this.status,
    required this.memberCount,
    required this.areaCode,
    required this.areaName,
    required this.districtName,
  });

  factory Household.fromJson(Json j) => Household(
        code: _str(j['code']),
        name: _str(j['name']),
        subjectType: _str(j['subjectType']),
        address: _str(j['address']),
        phone: _strOrNull(j['phone']),
        status: _str(j['status']),
        memberCount: _intOrNull(j['memberCount']),
        areaCode: _str(j['areaCode']),
        areaName: _str(j['areaName']),
        districtName: _str(j['districtName']),
      );

  final String code;
  final String name;
  final String subjectType;
  final String address;
  final String? phone;
  final String status;
  final int? memberCount;
  final String areaCode;
  final String areaName;
  final String districtName;
}

class HouseholdContract {
  const HouseholdContract({
    required this.contractNo,
    required this.tariffGroup,
    required this.validFrom,
    required this.validTo,
    required this.exempt,
    required this.exemptReason,
  });

  factory HouseholdContract.fromJson(Json j) => HouseholdContract(
        contractNo: _str(j['contractNo']),
        tariffGroup: _str(j['tariffGroup']),
        validFrom: _str(j['validFrom']),
        validTo: _strOrNull(j['validTo']),
        exempt: j['exempt'] == true,
        exemptReason: _strOrNull(j['exemptReason']),
      );

  final String contractNo;
  final String tariffGroup;
  final String validFrom;
  final String? validTo;
  final bool exempt;
  final String? exemptReason;
}

class ServingCompany {
  const ServingCompany({required this.name, required this.contactName, required this.contactPhone});

  factory ServingCompany.fromJson(Json j) => ServingCompany(
        name: _str(j['name']),
        contactName: _str(j['contactName']),
        contactPhone: _str(j['contactPhone']),
      );

  final String name;
  final String contactName;
  final String contactPhone;
}

ServingCompany? _company(Object? v) => v == null ? null : ServingCompany.fromJson(v as Json);

class CitizenProfile {
  const CitizenProfile({
    required this.phone,
    required this.displayName,
    required this.subject,
    required this.contract,
    required this.company,
  });

  factory CitizenProfile.fromJson(Json j) => CitizenProfile(
        phone: _str(j['phone']),
        displayName: _str(j['displayName']),
        subject: Household.fromJson(j['subject'] as Json),
        contract: j['contract'] == null ? null : HouseholdContract.fromJson(j['contract'] as Json),
        company: _company(j['company']),
      );

  final String phone;
  final String displayName;
  final Household subject;
  final HouseholdContract? contract;
  final ServingCompany? company;
}

// ---------- Khoản phí, thanh toán ----------

class CitizenCharge {
  const CitizenCharge({
    required this.id,
    required this.code,
    required this.periodLabel,
    required this.feeTypeName,
    required this.amount,
    required this.paidAmount,
    required this.remainingAmount,
    required this.dueDate,
    required this.status,
    required this.overdue,
    required this.paidAt,
  });

  factory CitizenCharge.fromJson(Json j) => CitizenCharge(
        id: _int(j['id']),
        code: _str(j['code']),
        periodLabel: _str(j['periodLabel']),
        feeTypeName: _str(j['feeTypeName']),
        amount: _int(j['amount'] ?? 0),
        paidAmount: _int(j['paidAmount'] ?? 0),
        remainingAmount: _int(j['remainingAmount'] ?? 0),
        dueDate: _str(j['dueDate']),
        status: _str(j['status']),
        overdue: j['overdue'] == true,
        paidAt: _strOrNull(j['paidAt']),
      );

  final int id;
  final String code;
  final String periodLabel;
  final String feeTypeName;
  final int amount;
  final int paidAmount;
  final int remainingAmount;
  final String dueDate;
  final String status;
  final bool overdue;
  final String? paidAt;
}

/// Thông tin chuyển khoản của một khoản: tài khoản công ty thu gom, số còn thiếu, mã ghi trong nội dung.
class TransferInfo {
  const TransferInfo({
    required this.configured,
    required this.bankName,
    required this.bankAccount,
    required this.accountHolder,
    required this.amount,
    required this.code,
  });

  factory TransferInfo.fromJson(Json j) => TransferInfo(
        configured: j['configured'] == true,
        bankName: _str(j['bankName']),
        bankAccount: _str(j['bankAccount']),
        accountHolder: _str(j['accountHolder']),
        amount: _int(j['amount'] ?? 0),
        code: _str(j['code']),
      );

  final bool configured;
  final String bankName;
  final String bankAccount;
  final String accountHolder;
  final int amount;
  final String code;

  /// Ảnh VietQR của SePay: quét bằng app ngân hàng bất kỳ là có sẵn tài khoản, số tiền và nội dung.
  String get qrImageUrl => Uri.https('qr.sepay.vn', '/img', {
        'acc': bankAccount,
        'bank': bankName,
        'amount': '$amount',
        'des': code,
      }).toString();
}

class PaymentConfirmation {
  const PaymentConfirmation({
    required this.id,
    required this.code,
    required this.paidAt,
    required this.amount,
    required this.method,
    required this.chargeCode,
    required this.chargeStatus,
    required this.periodLabel,
    required this.feeTypeName,
    required this.subjectCode,
    required this.subjectName,
    required this.subjectAddress,
    required this.companyName,
  });

  factory PaymentConfirmation.fromJson(Json j) => PaymentConfirmation(
        id: _int(j['id']),
        code: _str(j['code']),
        paidAt: _str(j['paidAt']),
        amount: _int(j['amount'] ?? 0),
        method: _str(j['method']),
        chargeCode: _str(j['chargeCode']),
        chargeStatus: _str(j['chargeStatus']),
        periodLabel: _str(j['periodLabel']),
        feeTypeName: _str(j['feeTypeName']),
        subjectCode: _str(j['subjectCode']),
        subjectName: _str(j['subjectName']),
        subjectAddress: _str(j['subjectAddress']),
        companyName: _str(j['companyName']),
      );

  final int id;
  final String code;
  final String paidAt;
  final int amount;
  final String method;
  final String chargeCode;
  final String chargeStatus;
  final String periodLabel;
  final String feeTypeName;
  final String subjectCode;
  final String subjectName;
  final String subjectAddress;
  final String companyName;
}

// ---------- Lịch thu gom ----------

class ScheduleLine {
  const ScheduleLine({
    required this.weekday,
    required this.weekOfMonth,
    required this.startTime,
    required this.endTime,
    required this.wasteType,
    required this.note,
  });

  factory ScheduleLine.fromJson(Json j) => ScheduleLine(
        weekday: _int(j['weekday']),
        weekOfMonth: _intOrNull(j['weekOfMonth']),
        startTime: _str(j['startTime']),
        endTime: _str(j['endTime']),
        wasteType: _str(j['wasteType']),
        note: _strOrNull(j['note']),
      );

  final int weekday;
  final int? weekOfMonth;
  final String startTime;
  final String endTime;
  final String wasteType;
  final String? note;
}

class CitizenSchedule {
  const CitizenSchedule({required this.areaName, required this.districtName, required this.company, required this.lines});

  factory CitizenSchedule.fromJson(Json j) => CitizenSchedule(
        areaName: _str(j['areaName']),
        districtName: _str(j['districtName']),
        company: _company(j['company']),
        lines: _list(j['lines'], ScheduleLine.fromJson),
      );

  final String areaName;
  final String districtName;
  final ServingCompany? company;
  final List<ScheduleLine> lines;
}

// ---------- Phản ánh ----------

class Complaint {
  const Complaint({
    required this.id,
    required this.code,
    required this.receivedDate,
    required this.category,
    required this.summary,
    required this.content,
    required this.location,
    required this.status,
    required this.forwardedCompanyName,
    required this.deadline,
    required this.overdue,
    required this.resolution,
  });

  factory Complaint.fromJson(Json j) => Complaint(
        id: _int(j['id']),
        code: _str(j['code']),
        receivedDate: _str(j['receivedDate']),
        category: _str(j['category']),
        summary: _str(j['summary']),
        content: _str(j['content']),
        location: _strOrNull(j['location']),
        status: _str(j['status']),
        forwardedCompanyName: _strOrNull(j['forwardedCompanyName']),
        deadline: _strOrNull(j['deadline']),
        overdue: j['overdue'] == true,
        resolution: _strOrNull(j['resolution']),
      );

  final int id;
  final String code;
  final String receivedDate;
  final String category;
  final String summary;
  final String content;
  final String? location;
  final String status;
  final String? forwardedCompanyName;
  final String? deadline;
  final bool overdue;
  final String? resolution;
}

class ComplaintEvent {
  const ComplaintEvent({
    required this.id,
    required this.eventType,
    required this.occurredAt,
    required this.actorLabel,
    required this.content,
  });

  factory ComplaintEvent.fromJson(Json j) => ComplaintEvent(
        id: _int(j['id']),
        eventType: _str(j['eventType']),
        occurredAt: _str(j['occurredAt']),
        actorLabel: _str(j['actorLabel']),
        content: _str(j['content']),
      );

  final int id;
  final String eventType;
  final String occurredAt;
  final String actorLabel;
  final String content;
}

class ComplaintDetail {
  const ComplaintDetail({required this.complaint, required this.events});

  factory ComplaintDetail.fromJson(Json j) => ComplaintDetail(
        complaint: Complaint.fromJson(j['complaint'] as Json),
        events: _list(j['events'], ComplaintEvent.fromJson),
      );

  final Complaint complaint;
  final List<ComplaintEvent> events;
}

// ---------- Thông báo ----------

class NotificationLink {
  const NotificationLink({required this.screen, required this.params});

  factory NotificationLink.fromJson(Json j) =>
      NotificationLink(screen: _strOrNull(j['screen']), params: (j['params'] as Json?) ?? const {});

  final String? screen;
  final Json params;
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.link,
    required this.createdAt,
    required this.readAt,
  });

  factory AppNotification.fromJson(Json j) => AppNotification(
        id: _int(j['id']),
        kind: _str(j['kind']),
        title: _str(j['title']),
        body: _str(j['body']),
        link: j['link'] == null ? null : NotificationLink.fromJson(j['link'] as Json),
        createdAt: _str(j['createdAt']),
        readAt: _strOrNull(j['readAt']),
      );

  final int id;
  final String kind;
  final String title;
  final String body;
  final NotificationLink? link;
  final String createdAt;
  final String? readAt;
}

class NotificationPage {
  const NotificationPage({required this.items, required this.unreadCount});

  factory NotificationPage.fromJson(Json j) => NotificationPage(
        items: _list(j['items'], AppNotification.fromJson),
        unreadCount: _int(j['unreadCount'] ?? 0),
      );

  final List<AppNotification> items;
  final int unreadCount;
}

// ---------- Chợ đồ cũ ----------

class MarketPost {
  const MarketPost({
    required this.id,
    required this.code,
    required this.caption,
    required this.tags,
    required this.category,
    required this.areaName,
    required this.photoUrls,
    required this.status,
    required this.hidden,
    required this.moderation,
    required this.moderationNote,
    required this.authorId,
    required this.authorName,
    required this.createdAt,
    required this.editedAt,
    required this.version,
    required this.commentCount,
    required this.canComment,
    required this.canCall,
    required this.mine,
    required this.saved,
  });

  factory MarketPost.fromJson(Json j) {
    final author = (j['author'] as Json?) ?? const {};
    final area = (j['area'] as Json?) ?? const {};
    return MarketPost(
      id: _int(j['id']),
      code: _str(j['code']),
      caption: _str(j['caption']),
      tags: _strings(j['tags']),
      category: _str(j['category']),
      areaName: _str(area['name']),
      photoUrls: _strings(j['photoUrls']),
      status: _str(j['status']),
      hidden: j['hidden'] == true,
      moderation: _strOrNull(j['moderation']) ?? 'PUBLISHED',
      moderationNote: _strOrNull(j['moderationNote']),
      authorId: _int(author['citizenId'] ?? 0),
      authorName: _str(author['displayName']),
      createdAt: _str(j['createdAt']),
      editedAt: _strOrNull(j['editedAt']),
      version: _intOrNull(j['version']),
      commentCount: _int(j['commentCount'] ?? 0),
      canComment: j['canComment'] == true,
      canCall: j['canCall'] == true,
      mine: j['mine'] == true,
      saved: j['saved'] == true,
    );
  }

  final int id;
  final String code;
  final String caption;
  final List<String> tags;
  final String category;
  final String areaName;
  final List<String> photoUrls;
  final String status;
  final bool hidden;

  /// PUBLISHED | PENDING_REVIEW | REJECTED (bộ lọc từ khóa / báo cáo / cán bộ xã gỡ).
  final String moderation;
  final String? moderationNote;
  final int authorId;
  final String authorName;
  final String createdAt;
  final String? editedAt;
  final int? version;
  final int commentCount;
  final bool canComment;
  final bool canCall;
  final bool mine;
  final bool saved;

  bool get closed => status == 'CLOSED';

  /// Dòng đầu của caption làm tiêu đề tin (kiểu Chợ Tốt).
  String get title {
    final first = caption.trim().split('\n').first.trim();
    return first.isEmpty ? code : first;
  }
}

class MarketComment {
  const MarketComment({
    required this.id,
    required this.content,
    required this.authorName,
    required this.mine,
    required this.createdAt,
  });

  factory MarketComment.fromJson(Json j) => MarketComment(
        id: _int(j['id']),
        content: _str(j['content']),
        authorName: _str(((j['author'] as Json?) ?? const {})['displayName']),
        mine: j['mine'] == true,
        createdAt: _str(j['createdAt']),
      );

  final int id;
  final String content;
  final String authorName;
  final bool mine;
  final String createdAt;
}

class MarketEditImage {
  const MarketEditImage({required this.id, required this.previewUrl});

  factory MarketEditImage.fromJson(Json j) => MarketEditImage(id: _int(j['id']), previewUrl: _str(j['previewUrl']));

  final int id;
  final String previewUrl;
}

class MarketEdit {
  const MarketEdit({
    required this.post,
    required this.images,
    required this.sharePhone,
    required this.contactPhone,
    required this.version,
  });

  factory MarketEdit.fromJson(Json j) => MarketEdit(
        post: MarketPost.fromJson(j['post'] as Json),
        images: _list(j['images'], MarketEditImage.fromJson),
        sharePhone: j['sharePhone'] == true,
        contactPhone: _strOrNull(j['contactPhone']),
        version: _int(j['version'] ?? 0),
      );

  final MarketPost post;
  final List<MarketEditImage> images;
  final bool sharePhone;
  final String? contactPhone;
  final int version;
}

class MarketSaved {
  const MarketSaved({required this.postId, required this.post});

  factory MarketSaved.fromJson(Json j) => MarketSaved(
        postId: _int(j['postId']),
        post: j['post'] == null ? null : MarketPost.fromJson(j['post'] as Json),
      );

  final int postId;

  /// null khi bài đã bị ẩn / chặn / gỡ.
  final MarketPost? post;
}

class MarketBlock {
  const MarketBlock({required this.citizenId, required this.displayName});

  factory MarketBlock.fromJson(Json j) =>
      MarketBlock(citizenId: _int(j['citizenId']), displayName: _str(j['displayName']));

  final int citizenId;
  final String displayName;
}

class MarketArea {
  const MarketArea({required this.id, required this.name});

  final int id;
  final String name;
}

class MarketMetadata {
  const MarketMetadata({required this.categories, required this.areas});

  factory MarketMetadata.fromJson(Json j) => MarketMetadata(
        categories: _strings(j['categories']),
        areas: _list(j['areas'], (a) => MarketArea(id: _int(a['id']), name: _str(a['name']))),
      );

  final List<String> categories;
  final List<MarketArea> areas;
}

/// Ảnh đã tải lên: `name` gửi kèm yêu cầu (tên tệp, hoặc id ảnh chợ), `url` tương đối để hiện ảnh.
class UploadedPhoto {
  const UploadedPhoto({required this.name, required this.url});

  final String name;
  final String url;
}
