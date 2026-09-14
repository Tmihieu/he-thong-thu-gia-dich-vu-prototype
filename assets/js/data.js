"use strict";

const APP_DATA = {
  period: {
    id: "2026-09",
    label: "Tháng 09/2026",
    status: "Đang thu",
    openedAt: "01/09/2026",
    dueAt: "30/09/2026",
    legalBasis: "QĐ 65/2026/QĐ-UBND",
    note: "Biểu giá minh họa; cơ chế chuyển tiếp cần BA xác nhận"
  },
  summary: {
    subjects: 50284,
    activeContracts: 48672,
    billed: 3824000000,
    collected: 2791520000,
    debt: 1032480000,
    collectionRate: 73,
    unmatched: 12,
    cashPending: 18420000
  },
  areas: [
    { name: "Đông Thạnh", subjects: 18942, rate: 78, debt: "312,4 triệu", risk: "Tốt" },
    { name: "Thới Tam Thôn", subjects: 17416, rate: 71, debt: "388,7 triệu", risk: "Theo dõi" },
    { name: "Nhị Bình", subjects: 13926, rate: 68, debt: "331,4 triệu", risk: "Cảnh báo" }
  ],
  subjects: [
    { code: "DTH-H000128", name: "Nguyễn Văn Minh", type: "Hộ gia đình", address: "12/5 Đặng Thúc Vịnh, ấp 7", people: 4, contract: "HĐ-DTH-0128", tariff: "HGĐ ≥ 3 người", amount: 80000, unit: "ĐV Đông Thạnh", route: "DTH-T07", serviceStatus: "Đang cung cấp", status: "Đang hoạt động" },
    { code: "DTH-H000305", name: "Trần Thị Hồng", type: "Hộ gia đình", address: "41/2 Nguyễn Ảnh Thủ, ấp 4", people: 2, contract: "HĐ-DTH-0305", tariff: "HGĐ ≤ 2 người", amount: 40000, unit: "ĐV Đông Thạnh", route: "DTH-T04", serviceStatus: "Đang cung cấp", status: "Đang hoạt động" },
    { code: "DTH-H000662", name: "Phan Văn Thắng", type: "Hộ gia đình", address: "22/9 Đặng Thúc Vịnh, ấp 7", people: 4, contract: "HĐ-DTH-0662", tariff: "HGĐ ≥ 3 người", amount: 240000, unit: "Công ty MTĐT Đông Thạnh", route: "DTH-T07", serviceStatus: "Đề nghị tạm ngưng", status: "Nợ 3 kỳ", suspensionRequest: true },
    { code: "TTT-KD00142", name: "Tạp hóa Minh Châu", type: "Hộ kinh doanh", address: "96 Trịnh Thị Miếng", people: null, contract: "HĐ-TTT-142", tariff: "Chủ nguồn thải nhỏ", amount: 119000, unit: "Chưa phân công", route: "—", serviceStatus: "Chờ phân loại", status: "Chờ xác minh" },
    { code: "NB-DN00038", name: "Công ty TNHH Nam An", type: "Doanh nghiệp", address: "18 Hà Huy Giáp, ấp 2", people: null, contract: "HĐ-NB-0038", tariff: "Theo khối lượng", amount: 1266000, unit: "ĐV Nhị Bình", route: "NB-T03", serviceStatus: "Đang cung cấp", status: "Đang hoạt động" },
    { code: "DTH-H001152", name: "Lê Quốc Bảo", type: "Hộ gia đình", address: "7/11 Lê Văn Khương, ấp 6", people: 5, contract: "HĐ-DTH-1152", tariff: "HGĐ ≥ 3 người", amount: 80000, unit: "ĐV Đông Thạnh", route: "DTH-T06", serviceStatus: "Đã chấm dứt 31/08", status: "Tạm ngưng" }
  ],
  collectionProgress: [
    { collector: "Nguyễn Thành Long", route: "DTH-T07", company: "Công ty MTĐT Đông Thạnh", manager: "Trần Hoàng Phúc · 0903 218 665", assigned: 426, visited: 349, paid: 332, debt: 94, progress: 78, updated: "10:24 hôm nay", status: "Đúng tiến độ" },
    { collector: "Phạm Minh Tuấn", route: "DTH-T04", company: "HTX Môi trường An Phú", manager: "Ngô Thị Thanh · 0908 114 220", assigned: 389, visited: 364, paid: 354, debt: 35, progress: 91, updated: "10:18 hôm nay", status: "Đúng tiến độ" },
    { collector: "Võ Thị Lan", route: "TTT-T11", company: "Công ty Dịch vụ Hóc Môn", manager: "Lê Minh Hải · 0917 602 311", assigned: 512, visited: 371, paid: 353, debt: 159, progress: 69, updated: "09:42 hôm nay", status: "Cần đôn đốc" },
    { collector: "Trần Quốc Huy", route: "NB-T03", company: "HTX Xanh Nhị Bình", manager: "Phạm Văn Tâm · 0902 811 479", assigned: 344, visited: 270, paid: 255, debt: 89, progress: 74, updated: "09:35 hôm nay", status: "Theo dõi" },
    { collector: "Lương Thị Ngọc", route: "TTT-T08", company: "Công ty Công ích Thành Phát", manager: "Nguyễn Quốc Dũng · 0938 447 202", assigned: 468, visited: 276, paid: 261, debt: 207, progress: 56, updated: "Hôm qua · 16:50", status: "Cần đôn đốc" },
    { collector: "Đặng Minh Khoa", route: "DTH-T02", company: "Công ty Môi trường Tân Tiến", manager: "Võ Thanh Bình · 0906 115 772", assigned: 318, visited: 252, paid: 238, debt: 80, progress: 75, updated: "Hôm qua · 17:05", status: "Theo dõi" }
  ],
  householdLedger: [
    { key: "DTH-H000128|2026-09|CTRSH", rowType: "Phải thu", reference: "PT-0926-000128", date: "01/09/2026", debit: 80000, credit: 0, balance: 80000, status: "Đang phải thu" },
    { key: "DTH-H000128|2026-09|CTRSH", rowType: "Đã thu", reference: "VCB2609128471", date: "12/09/2026", debit: 0, credit: 80000, balance: 0, status: "Đã khớp" },
    { key: "DTH-H000131|2026-09|CTRSH", rowType: "Phải thu", reference: "PT-0926-000131", date: "01/09/2026", debit: 80000, credit: 0, balance: 80000, status: "Quá hạn" },
    { key: "DTH-H000131|2026-08|CTRSH", rowType: "Phải thu", reference: "PT-0826-000131", date: "01/08/2026", debit: 80000, credit: 0, balance: 80000, status: "Quá hạn" }
  ],
  imports: [
    { id: "IMP-2609-04", source: "Danh sách Đông Thạnh bổ sung.xlsx", area: "Đông Thạnh", total: 1280, valid: 1247, errors: 23, duplicate: 10, status: "Chờ xử lý lỗi" },
    { id: "IMP-2609-03", source: "Cong-no-Nhi-Binh-cu.xlsx", area: "Nhị Bình", total: 8942, valid: 8904, errors: 0, duplicate: 38, status: "Đã nhập" },
    { id: "IMP-2608-07", source: "Ho-dan-Thoi-Tam-Thon.csv", area: "Thới Tam Thôn", total: 17416, valid: 17382, errors: 0, duplicate: 34, status: "Đã nhập" }
  ],
  periods: [
    { code: "KT-2026-09", label: "Tháng 09/2026", legal: "QĐ 65/2026/QĐ-UBND", contracts: 48672, charges: 48654, errors: 18, status: "Đang thu" },
    { code: "KT-2026-08", label: "Tháng 08/2026", legal: "QĐ 67/2025/QĐ-UBND", contracts: 48105, charges: 48105, errors: 0, status: "Đã khóa" },
    { code: "KT-2026-10", label: "Tháng 10/2026", legal: "Chưa xác định", contracts: 0, charges: 0, errors: 0, status: "Dự thảo" }
  ],
  batches: [
    { code: "DOT-DTH-0926-01", area: "Đông Thạnh", count: 18212, value: "1,456 tỷ", errors: 6, issuedBy: "Nguyễn Thu Hà", status: "Đã phát hành" },
    { code: "DOT-TTT-0926-01", area: "Thới Tam Thôn", count: 16987, value: "1,337 tỷ", errors: 12, issuedBy: "—", status: "Chờ phát hành" },
    { code: "DOT-NB-0926-01", area: "Nhị Bình", count: 13455, value: "1,031 tỷ", errors: 0, issuedBy: "Nguyễn Thu Hà", status: "Đã phát hành" }
  ],
  contractors: [
    "Công ty MTĐT Đông Thạnh", "HTX Môi trường An Phú", "Công ty Dịch vụ Hóc Môn", "HTX Xanh Nhị Bình", "Công ty Môi trường Tân Tiến", "Công ty Công ích Thành Phát", "Công ty Xanh Sài Gòn", "HTX Dịch vụ Phú Thành", "Công ty Môi trường Minh Tâm", "HTX Thu gom Hòa Bình", "Công ty Công ích Gia Định"
  ],
  routes: [
    { code: "DTH-T07", name: "Đặng Thúc Vịnh – ấp 7", area: "Đông Thạnh", coverage: "Số 1–126 và các hẻm nhánh", schedule: "T2 · T4 · T6", unit: "Công ty MTĐT Đông Thạnh", manager: "Trần Hoàng Phúc", households: 642, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T12", name: "Đông Thạnh 3 – ấp 5", area: "Đông Thạnh", coverage: "Đoạn cầu Rạch Tra đến UBND", schedule: "T3 · T5 · T7", unit: "Công ty MTĐT Đông Thạnh", manager: "Trần Hoàng Phúc", households: 518, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T04", name: "Nguyễn Ảnh Thủ – ấp 4", area: "Đông Thạnh", coverage: "Số 312–566 và hẻm 421", schedule: "T2 · T4 · T6", unit: "HTX Môi trường An Phú", manager: "Ngô Thị Thanh", households: 571, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "NB-T12", name: "Đường ven rạch Cầu Dừa", area: "Nhị Bình", coverage: "Từ cầu Cầu Dừa đến bến đò", schedule: "T3 · T5 · T7", unit: "HTX Môi trường An Phú", manager: "Ngô Thị Thanh", households: 486, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T11", name: "Trịnh Thị Miếng – ấp 3", area: "Thới Tam Thôn", coverage: "Số 12–288, gồm 9 hẻm", schedule: "T2 · T4 · T6", unit: "Công ty Dịch vụ Hóc Môn", manager: "Lê Minh Hải", households: 734, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T15", name: "Dương Công Khi – ấp 6", area: "Thới Tam Thôn", coverage: "Đoạn Nguyễn Ảnh Thủ–Song Hành", schedule: "T3 · T5 · T7", unit: "Công ty Dịch vụ Hóc Môn", manager: "Lê Minh Hải", households: 612, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "NB-T03", name: "Hà Huy Giáp – ấp 2", area: "Nhị Bình", coverage: "Số 18–210 và khu dân cư ven sông", schedule: "Hằng ngày", unit: "HTX Xanh Nhị Bình", manager: "Phạm Văn Tâm", households: 608, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "NB-T07", name: "Nhị Bình 8 – ấp 1", area: "Nhị Bình", coverage: "Từ Hà Huy Giáp đến bờ bao", schedule: "T2 · T4 · T6", unit: "HTX Xanh Nhị Bình", manager: "Phạm Văn Tâm", households: 455, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T02", name: "Lê Văn Khương – ấp 6", area: "Đông Thạnh", coverage: "Số 510–892 và 12 hẻm", schedule: "Hằng ngày", unit: "Công ty Môi trường Tân Tiến", manager: "Võ Thanh Bình", households: 796, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T14", name: "Đường ĐT 5 – ấp 6", area: "Đông Thạnh", coverage: "Nhánh phía đông Lê Văn Khương", schedule: "T3 · T5 · T7", unit: "Công ty Môi trường Tân Tiến", manager: "Võ Thanh Bình", households: 533, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T08", name: "Song Hành – ấp 5", area: "Thới Tam Thôn", coverage: "Đoạn QL22–Đặng Công Bỉnh", schedule: "Hằng ngày", unit: "Công ty Công ích Thành Phát", manager: "Nguyễn Quốc Dũng", households: 688, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T17", name: "Tân Thới Nhất 17 – ấp 7", area: "Thới Tam Thôn", coverage: "Khu dân cư phía bắc Song Hành", schedule: "T2 · T4 · T6", unit: "Công ty Công ích Thành Phát", manager: "Nguyễn Quốc Dũng", households: 407, effective: "01/09–31/12/2026", status: "Sắp hết hiệu lực" },
    { code: "NB-T06", name: "Bờ bao sông Sài Gòn", area: "Nhị Bình", coverage: "Từ bến đò đến rạch Trầu", schedule: "T3 · T5 · T7", unit: "Công ty Xanh Sài Gòn", manager: "Trương Thị Mỹ", households: 649, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "NB-T10", name: "Nhị Bình 15 – ấp 3", area: "Nhị Bình", coverage: "Khu dân cư ven rạch Trầu", schedule: "T2 · T4 · T6", unit: "Công ty Xanh Sài Gòn", manager: "Trương Thị Mỹ", households: 592, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T09", name: "Đông Thạnh 4 – ấp 8", area: "Đông Thạnh", coverage: "Khu dân cư Đông Thạnh 4", schedule: "T3 · T5 · T7", unit: "HTX Dịch vụ Phú Thành", manager: "Đỗ Quốc Việt", households: 521, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T16", name: "Rạch Tra – ấp 8", area: "Đông Thạnh", coverage: "Đường ven rạch và 6 hẻm nhánh", schedule: "T2 · T4 · T6", unit: "HTX Dịch vụ Phú Thành", manager: "Đỗ Quốc Việt", households: 478, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T03", name: "Đặng Công Bỉnh – ấp 2", area: "Thới Tam Thôn", coverage: "Số 1–390 và hẻm 117", schedule: "Hằng ngày", unit: "Công ty Môi trường Minh Tâm", manager: "Mai Thị Thu", households: 754, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T13", name: "Bùi Công Trừng – ấp 4", area: "Thới Tam Thôn", coverage: "Đoạn Trịnh Thị Miếng–QL22", schedule: "T3 · T5 · T7", unit: "Công ty Môi trường Minh Tâm", manager: "Mai Thị Thu", households: 569, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "NB-T09", name: "Nguyễn Văn Bứa – ấp 4", area: "Nhị Bình", coverage: "Số 820–1150 và hẻm nhánh", schedule: "T2 · T4 · T6", unit: "HTX Thu gom Hòa Bình", manager: "Lý Thành Công", households: 677, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "NB-T15", name: "Bờ bao Rạch Tra – ấp 5", area: "Nhị Bình", coverage: "Từ cầu sắt đến giáp An Phú Đông", schedule: "T3 · T5 · T7", unit: "HTX Thu gom Hòa Bình", manager: "Lý Thành Công", households: 438, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "TTT-T14", name: "Phan Văn Hớn – ấp 7", area: "Thới Tam Thôn", coverage: "Số 401–795 và 8 hẻm", schedule: "Hằng ngày", unit: "Công ty Công ích Gia Định", manager: "Dương Văn Phú", households: 615, effective: "01/09–31/12/2026", status: "Đã phân công" },
    { code: "DTH-T18", name: "Đông Thạnh 2 – ấp 3", area: "Đông Thạnh", coverage: "Khu vực giáp Thới Tam Thôn", schedule: "T2 · T4 · T6", unit: "Công ty Công ích Gia Định", manager: "Dương Văn Phú", households: 502, effective: "01/09–31/12/2026", status: "Chờ gia hạn" }
  ],
  routeHouseholds: [
    { code: "DTH-H000128", name: "Nguyễn Văn Minh", type: "Hộ gia đình", address: "12/5 Đặng Thúc Vịnh", tariff: "HGĐ ≥ 3 người", amount: 80000, debt: "1 kỳ", service: "Đang cung cấp", collection: "Chưa thu" },
    { code: "DTH-H000131", name: "Trần Thị Ánh", type: "Hộ gia đình", address: "12/8 Đặng Thúc Vịnh", tariff: "HGĐ ≥ 3 người", amount: 160000, debt: "2 kỳ", service: "Đang cung cấp", collection: "Quá hạn" },
    { code: "DTH-KD00024", name: "Tạp hóa Thanh Bình", type: "Hộ kinh doanh", address: "13 Đặng Thúc Vịnh", tariff: "Chủ nguồn thải nhỏ", amount: 119000, debt: "1 kỳ", service: "Đang cung cấp", collection: "Chưa thu" },
    { code: "DTH-H000136", name: "Lê Hoàng Nam", type: "Hộ gia đình", address: "14/1 Đặng Thúc Vịnh", tariff: "HGĐ ≥ 3 người", amount: 80000, debt: "1 kỳ", service: "Đang cung cấp", collection: "Vắng nhà" },
    { code: "DTH-H000142", name: "Phạm Thị Lan", type: "Hộ gia đình", address: "14/7 Đặng Thúc Vịnh", tariff: "HGĐ ≤ 2 người", amount: 0, debt: "0 kỳ", service: "Đang cung cấp", collection: "Đã thu" },
    { code: "DTH-CS00017", name: "Cơ sở may Minh Anh", type: "Cơ sở sản xuất", address: "15/2 Đặng Thúc Vịnh", tariff: "Theo khối lượng", amount: 1266000, debt: "1 kỳ", service: "Đang cung cấp", collection: "Chờ xác minh" },
    { code: "DTH-H000149", name: "Võ Quốc Khánh", type: "Hộ gia đình", address: "16/2 Đặng Thúc Vịnh", tariff: "HGĐ ≥ 3 người", amount: 0, debt: "0 kỳ", service: "Đang cung cấp", collection: "Đã thu tiền mặt" },
    { code: "DTH-H001152", name: "Lê Quốc Bảo", type: "Hộ gia đình", address: "17/11 Đặng Thúc Vịnh", tariff: "HGĐ ≥ 3 người", amount: 0, debt: "0 kỳ", service: "Đã chấm dứt 31/08", collection: "Khóa thu" }
  ],
  debts: [
    { code: "DTH-H000662", name: "Phan Văn Thắng", area: "Đông Thạnh", periods: 3, age: 72, amount: 240000, contact: "10/09 · Không nghe máy", status: "Quá hạn 60 ngày" },
    { code: "TTT-H001921", name: "Nguyễn Thị Mai", area: "Thới Tam Thôn", periods: 2, age: 48, amount: 160000, contact: "11/09 · Hẹn 15/09", status: "Đã hẹn" },
    { code: "NB-H000482", name: "Trần Quốc Phúc", area: "Nhị Bình", periods: 5, age: 131, amount: 400000, contact: "08/09 · Đã chuyển đi", status: "Cần xác minh" },
    { code: "DTH-KD00077", name: "Quán ăn Hương Việt", area: "Đông Thạnh", periods: 2, age: 43, amount: 238000, contact: "09/09 · Tranh chấp giá", status: "Có khiếu nại" }
  ],
  requests: [
    { code: "YC-2609-021", type: "Tạm ngưng DV", subject: "DTH-H000662 · Phan Văn Thắng", amount: 0, reason: "Hộ đề nghị ngưng · đang nợ 3 kỳ", createdBy: "Nguyễn Thu Hà", age: "3 giờ", status: "Chờ duyệt" },
    { code: "YC-2609-018", type: "Miễn giảm", subject: "DTH-H000884 · Nguyễn Thị Sáu", amount: 80000, reason: "Hộ chính sách", createdBy: "Nguyễn Thu Hà", age: "1 ngày", status: "Chờ duyệt" },
    { code: "YC-2609-015", type: "Hoàn tiền", subject: "TTT-H001221 · Lê Minh Hoàng", amount: 80000, reason: "Chuyển khoản trùng", createdBy: "Trần Mỹ Duyên", age: "2 ngày", status: "Chờ duyệt" },
    { code: "YC-2609-011", type: "Xóa nợ", subject: "NB-H000482 · Trần Quốc Phúc", amount: 400000, reason: "Chuyển đi không xác định", createdBy: "Vũ Hoàng Anh", age: "4 ngày", status: "Cần bổ sung" },
    { code: "YC-2609-009", type: "Hủy hóa đơn", subject: "DTH-KD00031 · Cơ sở Tân Tiến", amount: 119000, reason: "Sinh trùng hợp đồng", createdBy: "Nguyễn Thu Hà", age: "5 ngày", status: "Chờ duyệt" }
  ],
  collector: {
    name: "Nguyễn Thành Long",
    route: "DTH-T07",
    area: "Ấp 7 · Đông Thạnh",
    shift: "CA-1209-NTL",
    assigned: 24,
    visited: 17,
    paid: 12,
    absent: 3,
    followup: 2,
    cash: 240000,
    transfer: 720000,
    unsynced: 0
  },
  collectionImports: [
    { code: "KQT-1209-05", method: "Nhập web", source: "Nguyễn Thành Long", rows: 1, accepted: 1, blocked: 0, createdAt: "12/09 · 10:12", status: "Đã ghi nhận" },
    { code: "KQT-1209-04", method: "Excel", source: "ket-qua-tuyen-DTH-T07.xlsx", rows: 24, accepted: 21, blocked: 3, createdAt: "12/09 · 09:58", status: "Có bản ghi bị chặn" },
    { code: "KQT-1109-11", method: "Excel", source: "ket-qua-tuyen-TTT-T11.xlsx", rows: 38, accepted: 38, blocked: 0, createdAt: "11/09 · 17:20", status: "Đã ghi nhận" }
  ],
  assignedHouseholds: [
    { order: 18, code: "DTH-H000128", name: "Nguyễn Văn Minh", phone: "090•••3128", address: "12/5 Đặng Thúc Vịnh", route: "DTH-T07", debt: "09/2026", periods: 1, amount: 80000, dueDate: "30/09/2026", result: "Chưa thu", category: "unpaid", debtState: "Còn trong hạn", note: "Cách vị trí hiện tại 120 m" },
    { order: 19, code: "DTH-H000131", name: "Trần Thị Ánh", phone: "093•••9021", address: "12/8 Đặng Thúc Vịnh", route: "DTH-T07", debt: "08–09/2026", periods: 2, amount: 160000, dueDate: "Quá hạn 18 ngày", result: "Quá hạn", category: "overdue", debtState: "Quá hạn 2 kỳ", note: "Đã hẹn thu lại hôm nay" },
    { order: 20, code: "DTH-H000136", name: "Lê Hoàng Nam", phone: "091•••6784", address: "14/1 Đặng Thúc Vịnh", route: "DTH-T07", debt: "09/2026", periods: 1, amount: 80000, dueDate: "30/09/2026", result: "Vắng nhà", category: "absent", debtState: "Đã ghé 1 lần", note: "Để giấy báo lúc 09:15 · quay lại 15/09" },
    { order: 21, code: "DTH-H000142", name: "Phạm Thị Lan", phone: "098•••1136", address: "14/7 Đặng Thúc Vịnh", route: "DTH-T07", debt: "09/2026", periods: 0, amount: 40000, dueDate: "Đã hoàn tất", result: "Đã thu", category: "paid", debtState: "Hết nợ", note: "Chuyển khoản · 09:32" },
    { order: 22, code: "DTH-H000149", name: "Võ Quốc Khánh", phone: "090•••7712", address: "16/2 Đặng Thúc Vịnh", route: "DTH-T07", debt: "09/2026", periods: 0, amount: 80000, dueDate: "Chờ nộp 17:00", result: "Đã thu tiền mặt", category: "paid", debtState: "Chờ nộp tiền", note: "Nhận tiền mặt · 09:41" },
    { order: 23, code: "DTH-H001152", name: "Lê Quốc Bảo", phone: "097•••4582", address: "7/11 Lê Văn Khương", route: "DTH-T07", debt: "—", periods: 0, amount: 0, dueDate: "Chấm dứt 31/08", result: "Đã chấm dứt", category: "ended", debtState: "Khóa thu", note: "Phát hiện vẫn thu ngoài hệ thống" },
    { order: 24, code: "DTH-H000157", name: "Đỗ Thị Hạnh", phone: "096•••2034", address: "18/3 Đặng Thúc Vịnh", route: "DTH-T07", debt: "07–09/2026", periods: 3, amount: 240000, dueDate: "Quá hạn 49 ngày", result: "Quá hạn", category: "overdue", debtState: "Quá hạn 3 kỳ", note: "Gọi 2 lần chưa liên hệ được" },
    { order: 25, code: "DTH-H000163", name: "Nguyễn Quốc Tuấn", phone: "091•••8840", address: "20 Đặng Thúc Vịnh", route: "DTH-T07", debt: "08–09/2026", periods: 2, amount: 160000, dueDate: "Hẹn 16/09", result: "Đã hẹn", category: "appointment", debtState: "Đã cam kết ngày trả", note: "Hộ đề nghị quay lại sau 18:00" },
    { order: 26, code: "DTH-H000171", name: "Trương Thị Kim", phone: "098•••7319", address: "22/6 Đặng Thúc Vịnh", route: "DTH-T07", debt: "09/2026", periods: 1, amount: 80000, dueDate: "30/09/2026", result: "Chưa thu", category: "unpaid", debtState: "Chưa tiếp cận", note: "Điểm cuối tuyến · cách 1,2 km" }
  ],
  cashCollections: [
    { code: "TM-1209-019", charge: "DTH-0926-H000149", subject: "Võ Quốc Khánh", collectedAt: "12/09 · 09:41", amount: 80000, due: "12/09 · 17:00", age: "48 phút", status: "Chờ nộp" },
    { code: "TM-1209-014", charge: "DTH-0926-H000097", subject: "Nguyễn Hữu Phước", collectedAt: "12/09 · 08:56", amount: 80000, due: "12/09 · 17:00", age: "1 giờ 33 phút", status: "Chờ nộp" },
    { code: "TM-1209-006", charge: "DTH-0926-H000045", subject: "Trần Thị Thu", collectedAt: "12/09 · 07:45", amount: 80000, due: "12/09 · 17:00", age: "2 giờ 44 phút", status: "Chờ nộp" }
  ],
  statements: [
    { tx: "VCB2609128492", time: "12/09 · 09:32", content: "DTH0926H000142", sender: "PHAM THI LAN", amount: 40000, match: "DTH-0926-H000142", confidence: "100%", status: "Đã khớp" },
    { tx: "VCB2609128471", time: "12/09 · 09:21", content: "DTH0926H000128", sender: "NGUYEN VAN MINH", amount: 80000, match: "DTH-0926-H000128", confidence: "100%", status: "Đã khớp" },
    { tx: "VCB2609128419", time: "12/09 · 08:55", content: "NOP TIEN RAC T9", sender: "LE THI MY", amount: 80000, match: "—", confidence: "0%", status: "Dòng treo" },
    { tx: "VCB2609128398", time: "12/09 · 08:43", content: "TTT0926H001092", sender: "TRAN VAN HAI", amount: 160000, match: "2 khoản", confidence: "96%", status: "Chờ xác nhận" },
    { tx: "VCB2609128301", time: "12/09 · 08:14", content: "DTH0926H000077", sender: "HUONG VIET", amount: 119000, match: "DTH-0926-KD00077", confidence: "100%", status: "Đã khớp" }
  ],
  unmatched: [
    { tx: "VCB2609128419", time: "12/09 · 08:55", sender: "LE THI MY", content: "NOP TIEN RAC T9", amount: 80000, candidates: 3, age: "1 giờ 34 phút", reason: "Thiếu mã khoản" },
    { tx: "VCB2609111294", time: "11/09 · 16:20", sender: "NGUYEN VAN AN", content: "DONG TIEN RAC", amount: 160000, candidates: 8, age: "18 giờ", reason: "Thiếu mã khoản" },
    { tx: "VCB2609109721", time: "10/09 · 11:08", sender: "CTY NAM PHAT", content: "NB0926DN0091", amount: 1250000, candidates: 1, age: "47 giờ", reason: "Lệch số tiền" }
  ],
  receipts: [
    { number: "BL-2609-003942", subject: "Phạm Thị Lan", charge: "DTH-0926-H000142", issued: "12/09 · 09:34", amount: 40000, channel: "Zalo", status: "Đã phát hành" },
    { number: "BL-2609-003941", subject: "Nguyễn Văn Minh", charge: "DTH-0926-H000128", issued: "12/09 · 09:23", amount: 80000, channel: "SMS", status: "Đã phát hành" },
    { number: "HĐ-2609-000184", subject: "Quán ăn Hương Việt", charge: "DTH-0926-KD00077", issued: "12/09 · 08:18", amount: 119000, channel: "Email", status: "Đã phát hành" },
    { number: "BL-2609-003918", subject: "Lê Minh Hoàng", charge: "TTT-0926-H001221", issued: "11/09 · 14:02", amount: 80000, channel: "SMS", status: "Chờ điều chỉnh" }
  ],
  cashReconciliations: [
    { collector: "Nguyễn Thành Long", route: "DTH-T07", collected: 1240000, deposited: 1000000, difference: 240000, oldest: "2 giờ 44 phút", status: "Trong hạn" },
    { collector: "Võ Thị Lan", route: "TTT-T11", collected: 2160000, deposited: 1840000, difference: 320000, oldest: "1 ngày 3 giờ", status: "Quá hạn" },
    { collector: "Phạm Minh Tuấn", route: "DTH-T04", collected: 920000, deposited: 920000, difference: 0, oldest: "—", status: "Đã khớp" },
    { collector: "Trần Quốc Huy", route: "NB-T03", collected: 1680000, deposited: 1600000, difference: 80000, oldest: "5 giờ", status: "Trong hạn" }
  ],
  unitReconciliations: [
    { unit: "Tổ thu 03 / ĐV Đông Thạnh", period: "09/2026", assigned: 426, serviceDone: 419, charges: 426, paid: 349, difference: "7 hồ sơ", status: "Cần giải trình" },
    { unit: "Tổ thu 07 / ĐV Thới Tam Thôn", period: "09/2026", assigned: 512, serviceDone: 512, charges: 512, paid: 353, difference: "Khớp dịch vụ", status: "Đang đối soát" },
    { unit: "Tổ thu 09 / ĐV Nhị Bình", period: "09/2026", assigned: 344, serviceDone: 344, charges: 344, paid: 255, difference: "Khớp dịch vụ", status: "Đã khớp" }
  ],
  reports: [
    { code: "BC-THU-0926", name: "Báo cáo thu theo kỳ và địa bàn", period: "09/2026", updated: "12/09 · 10:10", owner: "Trần Mỹ Duyên", status: "Bản nháp" },
    { code: "BC-NO-0926", name: "Báo cáo công nợ theo tuổi nợ", period: "09/2026", updated: "12/09 · 09:48", owner: "Trần Mỹ Duyên", status: "Chờ kiểm tra" },
    { code: "BC-DS-0926", name: "Báo cáo đối soát tiền mặt", period: "09/2026", updated: "12/09 · 09:40", owner: "Lê Quang Huy", status: "Chờ xác nhận" }
  ],
  financeSummary: [
    { label: "Tổng khoản phải thu", amount: 3824000000, ratio: 100, tone: "navy", note: "48.654 khoản đã phát hành" },
    { label: "Tiền đã khớp", amount: 2791520000, ratio: 73, tone: "green", note: "Qua sao kê và phân bổ hợp lệ" },
    { label: "Chi phí tổ chức thu dự kiến", amount: 223000000, ratio: 6, tone: "amber", note: "Minh họa · cần căn cứ/phê duyệt" },
    { label: "Chênh lệch chưa xử lý", amount: 18420000, ratio: 1, tone: "red", note: "Tiền mặt và dòng treo" }
  ],
  unitPerformance: [
    { unit: "ĐV Đông Thạnh", assigned: 18942, attempted: 16780, success: 78, bankMatch: 96, debt: 320320000, offSystem: 1, status: "Đạt" },
    { unit: "ĐV Thới Tam Thôn", assigned: 17416, attempted: 14560, success: 71, bankMatch: 89, debt: 387730000, offSystem: 3, status: "Cần cải thiện" },
    { unit: "ĐV Nhị Bình", assigned: 13926, attempted: 11030, success: 68, bankMatch: 91, debt: 329920000, offSystem: 2, status: "Cảnh báo" }
  ],
  paymentFlows: [
    { code: "FLOW-XA-VA", name: "Tài khoản chính thức của xã + mã/VA", owner: "UBND xã Đông Thạnh", traceability: "Cao nếu mỗi khoản có mã/VA", reconciliation: "Tự động theo sao kê", risk: "Phụ thuộc ngân hàng/API", status: "Khuyến nghị thí điểm" },
    { code: "FLOW-DV-THU", name: "Tài khoản chính thức của đơn vị thu", owner: "Pháp nhân đơn vị thu", traceability: "Trung bình", reconciliation: "Bảng kê + nộp/đối soát định kỳ", risk: "Tăng bước đối soát và nghĩa vụ bàn giao", status: "Cần BA/pháp lý xác nhận" },
    { code: "FLOW-CANHAN", name: "Tài khoản cá nhân người quản lý", owner: "Cá nhân", traceability: "Thấp", reconciliation: "Khó tách tiền cá nhân/nghiệp vụ", risk: "Nhập nhằng sở hữu và sổ sách", status: "Không khuyến nghị" }
  ],
  users: [
    { username: "nguyenthuha", name: "Nguyễn Thu Hà", organization: "Phòng Kinh tế", roles: "Cán bộ xã", lastLogin: "12/09 · 09:55", status: "Hoạt động" },
    { username: "nguyenthanhlong", name: "Nguyễn Thành Long", organization: "Tổ thu 03", roles: "Người thu hộ", lastLogin: "12/09 · 07:12", status: "Hoạt động" },
    { username: "tranmyduyen", name: "Trần Mỹ Duyên", organization: "Phòng Kinh tế", roles: "Kế toán", lastLogin: "12/09 · 08:03", status: "Hoạt động" },
    { username: "levanphuong", name: "Lê Văn Phương", organization: "UBND xã", roles: "Lãnh đạo", lastLogin: "11/09 · 16:42", status: "Hoạt động" },
    { username: "admin.trienkhai", name: "Quản trị triển khai", organization: "Đơn vị triển khai", roles: "Quản trị", lastLogin: "12/09 · 06:30", status: "Bắt buộc 2FA" }
  ],
  tariffVersions: [
    { code: "BG-65-G2-H2", legal: "QĐ 65/2026/QĐ-UBND", scope: "Nhóm 2 · HGĐ ≤ 2 người", collection: "29.000đ", transport: "11.000đ", processing: "0đ", effective: "01/09/2026 – 30/06/2027", status: "Đang áp dụng" },
    { code: "BG-65-G2-H3", legal: "QĐ 65/2026/QĐ-UBND", scope: "Nhóm 2 · HGĐ ≥ 3 người", collection: "57.000đ", transport: "23.000đ", processing: "0đ", effective: "01/09/2026 – 30/06/2027", status: "Đang áp dụng" },
    { code: "BG-67-HM-HGD", legal: "QĐ 67/2025/QĐ-UBND", scope: "Hóc Môn cũ · Hộ gia đình", collection: "57.000đ", transport: "23.000đ", processing: "Theo định mức", effective: "01/06/2025 – 31/08/2026", status: "Hết hiệu lực" }
  ],
  integrations: [
    { name: "VietQR", purpose: "Tạo mã thanh toán", environment: "Mô phỏng", lastSync: "12/09 · 10:00", latency: "—", status: "Chưa kết nối" },
    { name: "Ngân hàng Vietcombank", purpose: "Nhận sao kê", environment: "UAT", lastSync: "12/09 · 10:20", latency: "4 phút", status: "Hoạt động" },
    { name: "Hóa đơn điện tử", purpose: "Biên lai/HĐĐT", environment: "Mô phỏng", lastSync: "—", latency: "—", status: "Chưa cấu hình" },
    { name: "Kho bạc Nhà nước", purpose: "Hạch toán", environment: "Giai đoạn mở rộng", lastSync: "—", latency: "—", status: "Chưa triển khai" }
  ],
  audit: [
    { time: "12/09 · 10:24:18", actor: "tranmyduyen", role: "Kế toán", action: "Gán dòng treo", object: "VCB2609128419", result: "Mở biểu mẫu" },
    { time: "12/09 · 10:19:02", actor: "system", role: "Hệ thống", action: "Đồng bộ sao kê", object: "VCB · 31 giao dịch", result: "27 khớp · 4 treo" },
    { time: "12/09 · 09:56:40", actor: "nguyenthuha", role: "Cán bộ xã", action: "Phát hành đợt", object: "DOT-DTH-0926-01", result: "Thành công" },
    { time: "12/09 · 09:42:11", actor: "nguyenthanhlong", role: "Người thu hộ", action: "Nhận tiền mặt", object: "TM-1209-019", result: "Chờ nộp" },
    { time: "12/09 · 08:30:00", actor: "backup-service", role: "Hệ thống", action: "Sao lưu tự động", object: "backup-20260912-0830", result: "Thành công" }
  ]
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}
