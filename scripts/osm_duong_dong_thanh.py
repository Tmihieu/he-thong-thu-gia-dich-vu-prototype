"""Bản nháp danh mục đường/hẻm xã Đông Thạnh từ OpenStreetMap, xuất Excel để xã duyệt.

Chạy: python scripts/osm_duong_dong_thanh.py [đường-dẫn-ra.xlsx | seed.sql] [csv-overpass-đã-tải]
(.sql: sinh seed demo, giả định xã đã duyệt bản nháp.)
Nguồn: © OpenStreetMap contributors (ODbL). Ranh giới 52 ấp: relation 21383875–21383913, 21386184–21386196
(cùng nguồn với seed V40_1). OSM có thể còn tên đường cũ (vd. chưa cập nhật NQ 380/NQ-HĐND ngày 24/7/2025).
Chỉ dùng thư viện chuẩn: .xlsx là gói zip chứa XML.
"""
import collections
import datetime
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from xml.sax.saxutils import escape

AP_IDS = list(range(21383875, 21383914)) + list(range(21386184, 21386197))
# Xã cũ chứa ấp (đối chiếu ranh giới trước 01/7/2025, như seed V40_1).
def xa_cu(ap):
    return 'Thới Tam Thôn' if ap <= 23 else 'Đông Thạnh' if ap <= 47 else 'Nhị Bình'

# 18 tuyến ở Đông Thạnh theo NQ 380/NQ-HĐND 24/7/2025, chép từ bảng báo Thanh Niên (chưa có bản Công báo):
# thanhnien.vn/tphcm-dat-ten-moi-cho-60-tuyen-duong-185250724100127187.htm. Xã đối chiếu văn bản gốc.
NQ380 = {
    'đông thạnh 8': 'Nguyễn Thị Mực',
    # Báo ghi 2 dòng cùng tên cũ "Đông Thạnh 6", lý trình khác nhau.
    'đông thạnh 6': 'Trương Thị Trưng hoặc Nguyễn Thị Dễ (báo ghi 2 dòng, cần văn bản gốc)',
    'đông thạnh 6-1': 'Nguyễn Thị Dễ',
    'đông thạnh 3': 'Nguyễn Thị Út',
    'đông thạnh 7': 'Lê Thị Thìn',
    'đông thạnh 4': 'Võ Thị Tới',
    'đông thạnh 2-1': 'Võ Thị Lùng',
    'đông thạnh 2-5': 'Nguyễn Thị Chồn',
    'đông thạnh 4-1': 'Nguyễn Thị Tạo',
    'đông thạnh 5': 'Nguyễn Thị Tạo',
    'đông thạnh 7-3': 'Phạm Thị Tôm',
    'đông thạnh 7-4': 'Nguyễn Thị Đẹt',
    'nhị bình 15': 'Trần Thị Hơn',
    'nhị bình 3': 'Thái Thị Mén',
    'nhị bình 18': 'Đặng Thị Son',
    'nhị bình 6': 'Huỳnh Thị Xe',
    'thới tam thôn 12': 'Phùng Thị Chuyện',
    'thới tam thôn 7': 'Nguyễn Thị Nghé',
}
# Lối đi bộ/xe đạp không phải địa chỉ nhà.
SKIP_HIGHWAY = {'footway', 'path', 'cycleway', 'steps', 'bridleway', 'construction', 'proposed', 'platform'}


def fetch():
    q = ("[out:csv(::type,::id,name,highway;true;'|')][timeout:240];"
         f"rel(id:{','.join(map(str, AP_IDS))})->.aps;"
         'foreach.aps->.ap(.ap out;.ap map_to_area->.a;way(area.a)["highway"]["name"];out;);')
    req = urllib.request.Request('https://overpass-api.de/api/interpreter',
                                 urllib.parse.urlencode({'data': q}).encode(),
                                 {'User-Agent': 'vsmt-dong-thanh/1.0'})
    return urllib.request.urlopen(req, timeout=300).read().decode('utf-8')


def key(name):
    n = re.sub(r'\s+', ' ', name).strip().lower()
    n = re.sub(r'^(đường|đ\.)\s+', '', n)
    # Lỗi gõ/viết tắt thấy trên OSM: "ĐT 2-6" = "Đông Thạnh 2-6", "Thời Tam Thôn", "hẽm".
    n = re.sub(r'^đt\s*(?=\d)', 'đông thạnh ', n)
    return n.replace('thời tam thôn', 'thới tam thôn').replace('hẽm', 'hẻm')


def display(name):
    n = re.sub(r'\s+', ' ', name).strip()
    return re.sub(r'^(Đường|đường|Đ\.)\s+', '', n)


def build(csv_text):
    streets = {}  # key -> dict
    ap = None
    for line in csv_text.splitlines()[1:]:
        typ, oid, name, hw = (line.split('|') + ['', '', '', ''])[:4]
        if typ == 'relation':
            ap = int(re.search(r'\d+', name).group())
            continue
        if typ != 'way' or not name.strip() or hw in SKIP_HIGHWAY:
            continue
        s = streets.setdefault(key(name), {'names': collections.Counter(), 'aps': set(), 'hw': set(), 'ids': set()})
        s['names'][display(name)] += 1
        s['aps'].add(ap)
        s['hw'].add(hw)
        s['ids'].add(oid)

    rows = []
    for k, s in streets.items():
        # Ưu tiên cách viết đầy đủ ("Đông Thạnh 2-6" hơn "ĐT 2-6").
        name = next((v for v, _ in s['names'].most_common() if v.lower() == k), s['names'].most_common(1)[0][0])
        name = re.sub(r'^(ĐT|Đt|đt)\s*(?=\d)', 'Đông Thạnh ', name)
        m = re.match(r'^hẻm\s+([\w/]+)\s+(.+)$', k)
        parent = ''
        if m:
            pk = key(m.group(2))
            parent = display(streets[pk]['names'].most_common(1)[0][0]) if pk in streets else display(m.group(2)) + ' (?)'
        # Tên đánh số theo xã cũ hoặc ấp cũ trước 2024 (Tam Đông, Trung Đông, Ấp Đông, Thới Tứ): dễ đã đổi tên.
        numbered = re.match(r'^(đông thạnh|nhị bình|thới tam thôn|tam đông|trung đông|ấp đông|ấp tam đông|thới tứ)\s+\d', k)
        aps = sorted(s['aps'])
        rows.append({
            'name': name, 'parent': parent,
            'kind': 'Hẻm' if k.startswith('hẻm') else 'Cầu' if k.startswith('cầu ') else 'Đường',
            'aps': ', '.join(f'Ấp {a}' for a in aps),
            'xa': ', '.join(sorted({xa_cu(a) for a in aps})),
            'hw': ', '.join(sorted(s['hw'])), 'n': len(s['ids']),
            'check': ('Có (NQ 380, theo báo)' if k in NQ380 else 'Nên kiểm (tên đánh số)' if numbered else ''),
            'new': NQ380.get(k, ''),
            'variants': '; '.join(v for v in s['names'] if v != name),
            'osm': ' '.join(sorted(s['ids'])[:6]) + (' …' if len(s['ids']) > 6 else ''),
            'ap_list': aps,
        })
    rows.sort(key=lambda r: (['Đường', 'Hẻm', 'Cầu'].index(r['kind']), r['parent'].lower(), r['name'].lower()))
    by_ap = collections.defaultdict(list)
    for r in rows:
        for a in r['aps'].split(', '):
            by_ap[int(a.split()[1])].append(r['name'])
    return rows, by_ap


# ---- seed demo: giả định xã đã duyệt bản nháp ----
# Bỏ khi xã duyệt: đường của phường bên cạnh lọt vào do cắt ranh ấp, tên không rõ là đường nào.
SEED_SKIP = {'tân chánh hiệp 39', 'tân xuân - trung chánh 1', 'nhánh 1'}
# Hai tuyến NQ 380 không có tên cũ trên OSM (OSM đã ghi tên mới / chưa vẽ đường).
SEED_EXTRA_OLD = {'Võ Thị Lùng': ['Đông Thạnh 2-1'], 'Nguyễn Thị Be': ['Đường vào trường Trần Văn Danh']}
NQ380_NOTE = 'NQ 380/NQ-HĐND ngày 24/7/2025'


def street_key(text):
    """Như AddressText.streetKey ở backend: bỏ dấu, chữ thường, đ→d, gộp khoảng trắng, bỏ tiền tố "duong "."""
    t = unicodedata.normalize('NFD', text.strip().lower().replace('đ', 'd'))
    t = re.sub(r'\s+', ' ', ''.join(c for c in t if unicodedata.category(c) != 'Mn')).strip()
    return t[6:].strip() if t.startswith('duong ') else t


def seed_sql(rows):
    def q(v):
        return "'" + v.replace("'", "''") + "'"

    streets = {}  # tên dùng -> {'aps', 'old'}
    by_osm = {}   # khóa tên OSM -> tên dùng
    for r in rows:
        k = key(r['name'])
        if r['kind'] != 'Đường' or k in SEED_SKIP:
            continue
        # "Đông Thạnh 6": báo ghi 2 dòng; dòng lý trình Đông Thạnh 4 → 6-2 là Trương Thị Trưng.
        name = NQ380.get(k, '').split(' hoặc ')[0] or r['name']
        s = streets.setdefault(name, {'aps': set(), 'old': set()})
        s['aps'].update(r['ap_list'])
        if name != r['name']:
            s['old'].add(r['name'])
        by_osm[k] = name
    for name, olds in SEED_EXTRA_OLD.items():
        streets.setdefault(name, {'aps': set(), 'old': set()})['old'].update(olds)
    # Nguyễn Thị Be nối Đông Thạnh 2-5 (Nguyễn Thị Chồn) với Đông Thạnh 3-1: tạm lấy ấp của hai đường đó.
    be_aps = streets['Nguyễn Thị Chồn']['aps'] | streets['Đông Thạnh 3-1']['aps']
    streets['Nguyễn Thị Be']['aps'] |= be_aps

    alleys = []
    for r in rows:
        parent = by_osm.get(key(r['parent'])) if r['kind'] == 'Hẻm' and not r['parent'].endswith('(?)') else None
        if not parent:
            continue
        # Tên ngắn: bỏ tên đường (theo OSM) ở cuối, như StreetService.shortAlleyName.
        words, short = r['name'].split(), r['name']
        for i in range(1, len(words)):
            if key(' '.join(words[i:])) == key(r['parent']):
                short = re.sub(r'\s+(đường|Đường)$', '', ' '.join(words[:i]))
                break
        alleys.append((parent, short, r['ap_list']))

    nl = ',\n'
    out = ['-- Seed demo (chỉ profile demo): danh mục đường/hẻm xã Đông Thạnh, sinh bởi scripts/osm_duong_dong_thanh.py',
           '-- từ bản nháp docs/dia-chi/danh-sach-duong-dong-thanh-nhap.xlsx, GIẢ ĐỊNH xã đã duyệt: đổi tên 18 tuyến theo',
           f'-- {NQ380_NOTE} (giữ tên cũ), bỏ cầu, đường phường bên cạnh, hẻm không rõ đường cha.',
           '-- Nguồn: © OpenStreetMap contributors (ODbL). Khi có danh mục chính thức, quản trị viên nhập lại bằng Excel.',
           '',
           'insert into streets (kind, name, name_key) values',
           nl.join(f"    ('STREET', {q(n)}, {q(street_key(n))})" for n in sorted(streets)) + ';',
           '',
           'insert into streets (kind, parent_id, name, name_key)',
           "select 'ALLEY', p.id, v.name, v.name_key from (values",
           nl.join(f'    ({q(street_key(p))}, {q(a)}, {q(street_key(a))})' for p, a, _ in alleys),
           ') v (parent_key, name, name_key)',
           'join streets p on p.parent_id is null and p.name_key = v.parent_key;',
           '']
    pairs = [(street_key(n), '', ap) for n, s in sorted(streets.items()) for ap in sorted(s['aps'])]
    pairs += [(street_key(a), street_key(p), ap) for p, a, aps in alleys for ap in aps]
    out += ['insert into street_areas (street_id, area_id)',
            'select s.id, a.id from (values',
            nl.join(f"    ({q(k)}, {q(pk)}, 'AP{ap:02d}')" for k, pk, ap in pairs),
            ') v (name_key, parent_key, area_code)',
            "join streets s on s.name_key = v.name_key and ((v.parent_key = '' and s.parent_id is null)",
            '    or s.parent_id = (select p.id from streets p where p.parent_id is null and p.name_key = v.parent_key))',
            'join areas a on a.code = v.area_code;',
            '']
    olds = [(street_key(n), o) for n, s in sorted(streets.items()) for o in sorted(s['old'])]
    out += ['insert into street_old_names (street_id, name, name_key, note)',
            f'select s.id, v.name, v.old_key, {q(NQ380_NOTE)} from (values',
            nl.join(f'    ({q(k)}, {q(o)}, {q(street_key(o))})' for k, o in olds),
            ') v (name_key, name, old_key)',
            'join streets s on s.parent_id is null and s.name_key = v.name_key;']
    return '\n'.join(out) + '\n', len(streets), len(alleys)


# ---- .xlsx tối giản (inlineStr, 1 kiểu chữ đậm cho dòng tiêu đề) ----
def col(i):
    s = ''
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def sheet_xml(data, widths):
    out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
           '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
           '</sheetView></sheetViews><cols>']
    out += [f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths, 1)]
    out.append('</cols><sheetData>')
    for ri, row in enumerate(data, 1):
        out.append(f'<row r="{ri}">')
        for ci, v in enumerate(row, 1):
            ref, st = f'{col(ci)}{ri}', ' s="1"' if ri == 1 else ''
            if isinstance(v, int):
                out.append(f'<c r="{ref}"{st}><v>{v}</v></c>')
            else:
                out.append(f'<c r="{ref}" t="inlineStr"{st}><is><t xml:space="preserve">{escape(str(v))}</t></is></c>')
        out.append('</row>')
    out.append(f'</sheetData><autoFilter ref="A1:{col(len(widths))}{len(data)}"/></worksheet>')
    return ''.join(out)


def write_xlsx(path, sheets):
    ct = ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
                 'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                 for i in range(1, len(sheets) + 1))
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',
                   '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                   f'{ct}</Types>')
        z.writestr('_rels/.rels',
                   '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                   '</Relationships>')
        z.writestr('xl/workbook.xml',
                   '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                   + ''.join(f'<sheet name="{escape(n)}" sheetId="{i}" r:id="s{i}"/>' for i, (n, _, _) in enumerate(sheets, 1))
                   + '</sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels',
                   '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   + ''.join(f'<Relationship Id="s{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                             f'Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets) + 1))
                   + '<Relationship Id="st" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                   '</Relationships>')
        z.writestr('xl/styles.xml',
                   '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                   '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
                   '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
                   '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>'
                   '<cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>')
        for i, (_, data, widths) in enumerate(sheets, 1):
            z.writestr(f'xl/worksheets/sheet{i}.xml', sheet_xml(data, widths))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'danh-sach-duong-dong-thanh-nhap.xlsx'
    # Overpass hay quá tải: cho đọc lại CSV đã tải trước (tham số thứ 2).
    csv_text = open(sys.argv[2], encoding='utf-8').read() if len(sys.argv) > 2 else fetch()
    rows, by_ap = build(csv_text)
    if out.endswith('.sql'):
        sql, n_streets, n_alleys = seed_sql(rows)
        with open(out, 'w', encoding='utf-8', newline='\n') as f:
            f.write(sql)
        print(f'{out}: {n_streets} đường, {n_alleys} hẻm')
        return
    today = datetime.date.today().strftime('%d/%m/%Y')
    guide = [
        ['Mục', 'Nội dung'],
        ['Là gì', 'Bản NHÁP danh mục đường/hẻm trong xã Đông Thạnh, tự lấy từ OpenStreetMap ngày ' + today + '. Chưa phải danh mục chính thức.'],
        ['Xã cần làm', 'Ở trang "Danh sach duong": cột "Xã xác nhận" ghi Đúng / Sửa / Bỏ; ghi tên đúng vào "Tên mới / tên đúng"; bổ sung dòng mới cho đường/hẻm còn thiếu.'],
        ['Đổi tên NQ 380/2025', 'HĐND TP đặt tên 18 tuyến ở Đông Thạnh (NQ 380/NQ-HĐND 24/7/2025). Tên mới đã điền sẵn theo bảng báo Thanh Niên (chưa có bản Công báo) - xã đối chiếu văn bản gốc. "Đông Thạnh 6" bị báo ghi 2 dòng. Tên đánh số khác đánh dấu "Nên kiểm".'],
        ['Ấp', 'Theo ranh giới 52 ấp trên OpenStreetMap (vẽ 9/2026, nguồn là một bài Facebook, chưa phải văn bản). Đợt sắp xếp ấp 6/2026 do HĐND xã quyết. Một đường dài có thể đi qua nhiều ấp. Xã kiểm lại số ấp và ranh giới.'],
        ['Không có trong file', 'Hẻm nhỏ chưa ai vẽ trên bản đồ, hẻm trong hẻm, số nhà, tên gọi dân gian. Đã bỏ lối đi bộ/xe đạp.'],
        ['Nguồn', '© OpenStreetMap contributors, giấy phép ODbL (openstreetmap.org/copyright).'],
        ['Thống kê', f'{sum(r["kind"] == "Đường" for r in rows)} đường, {sum(r["kind"] == "Hẻm" for r in rows)} hẻm, {len(by_ap)} ấp có dữ liệu.'],
    ]
    head = ['STT', 'Tên (theo OSM)', 'Loại', 'Thuộc đường (với hẻm)', 'Ấp đi qua', 'Xã cũ', 'Cần kiểm đổi tên NQ 380',
            'Tên mới / tên đúng (xã điền)', 'Xã xác nhận (Đúng/Sửa/Bỏ)', 'Ghi chú của xã', 'Cách viết khác trên OSM',
            'Loại đường OSM', 'Số đoạn OSM', 'Mã OSM (way)']
    data = [head] + [[i, r['name'], r['kind'], r['parent'], r['aps'], r['xa'], r['check'], r['new'], '', '',
                      r['variants'], r['hw'], r['n'], r['osm']] for i, r in enumerate(rows, 1)]
    ap_data = [['Ấp', 'Xã cũ', 'Số đường/hẻm', 'Danh sách']] + [
        [f'Ấp {a}', xa_cu(a), len(n), '; '.join(sorted(n, key=str.lower))] for a, n in sorted(by_ap.items())]
    write_xlsx(out, [('Huong dan', guide, [22, 120]),
                     ('Danh sach duong', data, [6, 34, 8, 28, 30, 26, 22, 28, 18, 24, 30, 18, 8, 40]),
                     ('Theo ap', ap_data, [9, 15, 10, 150])])
    print(f'{out}: {len(rows)} dòng, {len(by_ap)} ấp')


if __name__ == '__main__':
    main()
