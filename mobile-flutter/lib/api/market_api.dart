import 'client.dart';
import 'models.dart';

/// Bộ lọc feed chợ: tìm caption, nhiều nhãn (OR), một danh mục, một tổ.
class FeedFilter {
  const FeedFilter({this.q = '', this.tags = const {}, this.category, this.areaId});

  final String q;
  final Set<String> tags;
  final String? category;
  final int? areaId;

  /// Số điều kiện lọc (không tính ô tìm) để hiện trên nút "Lọc".
  int get count => tags.length + (category == null ? 0 : 1) + (areaId == null ? 0 : 1);

  FeedFilter copyWith({String? q, Set<String>? tags, String? Function()? category, int? Function()? areaId}) =>
      FeedFilter(
        q: q ?? this.q,
        tags: tags ?? this.tags,
        category: category == null ? this.category : category(),
        areaId: areaId == null ? this.areaId : areaId(),
      );
}

/// Lọc tin của tôi: Đang đăng / Đã xong (không ẩn) và Đã ẩn.
enum MineFilter { open, closed, hidden }

/// API chợ đồ cũ: đọc chung `/api/market/*`, thao tác của người dân `/api/citizen/market/*`.
class MarketApi {
  const MarketApi(this._api);

  final ApiClient _api;
  static const pageSize = 20;
  static const _w = '/api/citizen/market';

  Future<MarketMetadata> metadata() async => MarketMetadata.fromJson(await _api.get('/api/market/metadata') as Json);

  Future<PageResult<MarketPost>> feed(FeedFilter f, int page) async => PageResult.fromJson(
        await _api.get('/api/market/posts', params: {
          'q': f.q.trim(),
          'tags': f.tags.join(','),
          'category': f.category,
          'areaId': f.areaId,
          'page': page,
          'size': pageSize,
        }) as Json,
        MarketPost.fromJson,
      );

  Future<MarketPost> post(int id) async => MarketPost.fromJson(await _api.get('/api/market/posts/$id') as Json);

  Future<PageResult<MarketComment>> comments(int id, int page) async => PageResult.fromJson(
        await _api.get('/api/market/posts/$id/comments', params: {'page': page, 'size': pageSize}) as Json,
        MarketComment.fromJson,
      );

  Future<PageResult<MarketPost>> mine(MineFilter f, int page) async => PageResult.fromJson(
        await _api.get('$_w/posts/mine', params: {
          ...switch (f) {
            MineFilter.open => {'status': 'OPEN', 'hidden': false},
            MineFilter.closed => {'status': 'CLOSED', 'hidden': false},
            MineFilter.hidden => {'hidden': true},
          },
          'page': page,
          'size': pageSize,
        }) as Json,
        MarketPost.fromJson,
      );

  Future<MarketPost> create(Json body) async => MarketPost.fromJson(await _api.post('$_w/posts', body) as Json);

  Future<MarketEdit> edit(int id) async => MarketEdit.fromJson(await _api.get('$_w/posts/$id/edit') as Json);

  Future<MarketPost> update(int id, Json body) async =>
      MarketPost.fromJson(await _api.patch('$_w/posts/$id', body) as Json);

  Future<MarketPost> setStatus(int id, String status, int version) async =>
      MarketPost.fromJson(await _api.post('$_w/posts/$id/status', {'status': status, 'version': version}) as Json);

  Future<MarketPost> setHidden(int id, bool hidden, int version) async =>
      MarketPost.fromJson(await _api.put('$_w/posts/$id/visibility', {'hidden': hidden, 'version': version}) as Json);

  Future<MarketComment> comment(int id, String content, String clientRequestId) async => MarketComment.fromJson(
      await _api.post('$_w/posts/$id/comments', {'content': content, 'clientRequestId': clientRequestId}) as Json);

  Future<String> contact(int id) async => ((await _api.get('$_w/posts/$id/contact')) as Json)['phone'].toString();

  Future<void> report(int id, String reason, String? note) =>
      _api.post('$_w/posts/$id/reports', {'reason': reason, 'note': ?note});

  Future<UploadedPhoto> uploadImage(String filePath) async {
    final r = await _api.upload('$_w/images', filePath) as Json;
    return UploadedPhoto(name: r['id'].toString(), url: r['previewUrl'].toString());
  }

  Future<PageResult<MarketSaved>> saved(int page) async => PageResult.fromJson(
        await _api.get('$_w/saved', params: {'page': page, 'size': pageSize}) as Json,
        MarketSaved.fromJson,
      );

  Future<void> save(int postId, bool on) => on ? _api.put('$_w/saved/$postId') : _api.delete('$_w/saved/$postId');

  Future<PageResult<MarketBlock>> blocks(int page) async => PageResult.fromJson(
        await _api.get('$_w/blocks', params: {'page': page, 'size': pageSize}) as Json,
        MarketBlock.fromJson,
      );

  Future<void> block(int citizenId, bool on) =>
      on ? _api.put('$_w/blocks/$citizenId') : _api.delete('$_w/blocks/$citizenId');
}

final marketApi = MarketApi(api);
