# ĐẶC TẢ TỔNG HỢP HỆ THỐNG

## Hệ thống số hóa quản lý và thu giá dịch vụ vệ sinh môi trường

**Địa bàn tham chiếu:** Xã Đông Thạnh, Thành phố Hồ Chí Minh  
**Loại tài liệu:** Đặc tả tổng hợp nghiệp vụ, chức năng, dữ liệu và giao diện  
**Phiên bản:** 2.9  
**Ngày cập nhật:** 15/09/2026  
**Nguồn thiết kế chính:** `Thiết kế hệ thống v2_0.docx.md`, phiên bản 2.0 ngày 03/07/2026  
**Nguồn cập nhật:** Note họp ngày 12/09/2026; các yêu cầu làm rõ ngày 14–15/09/2026; tài liệu nghiệp vụ `Tai-lieu-mo-ta-quy-trinh-nghiep-vu-v4.1.docx.md` (tiêu đề nội dung ghi v4.0)  
**Trạng thái:** Dùng để thống nhất phạm vi với BA/khách hàng trước khi phát triển hệ thống thật

---

## 1. Mục đích tài liệu

### Cập nhật hiện hành 2.9 — đối soát prototype với đặc tả nghiệp vụ

Phần này là quy định hiện hành và thay thế mọi mô tả cũ mâu thuẫn ở các mục lịch sử 2.4–2.8. Đối chiếu `Tai-lieu-mo-ta-quy-trinh-nghiep-vu-v4.1.docx.md` cho thấy luồng tiền mục tiêu phải tách rõ:

```text
Hộ dân ──tiền dịch vụ──> tài khoản/phạm vi quản lý của công ty thu gom
Công ty ──phần xử lý──> tài khoản xã ──> kế toán đối soát
```

| Nội dung | Quy định 2.9 |
| --- | --- |
| Tài khoản công ty | Công ty có tài khoản và chỉ xem phạm vi của mình. Ngoài dữ liệu đã cung cấp/yêu cầu bổ sung, công ty có màn hộ được giao, cập nhật kết quả thu, biên lai đã phát, nghĩa vụ phần xử lý và kê khai tiền đã nộp. |
| Phạm vi hộ của công ty | Chỉ hình thành từ hộ đã được xã xác minh và `AreaAssignment` còn hiệu lực. File Excel công ty gửi chỉ là nguồn đối chiếu, không tự tạo phân công hay nghĩa vụ. |
| Tiền hộ dân | Công ty trực tiếp thu và phát biên lai. Xã không trực tiếp nhận/đối soát tiền mặt của từng nhân viên thu trong luồng hiện hành. Quản lý ca/tiền mặt của nhân viên là nghiệp vụ nội bộ công ty. |
| Nghĩa vụ phần xử lý | `Số phải nộp = số hộ đủ điều kiện trong phạm vi công ty × đơn giá xử lý có hiệu lực`. Không dùng tổng dòng Excel chưa xác minh và không tự đặt đơn giá. |
| Tiền thực nộp | Công ty kê khai mã giao dịch/kỳ/chứng từ; kế toán chỉ xác nhận khi khớp với sao kê tài khoản xã. Kê khai của công ty không tự đồng nghĩa tiền đã về. |
| Đối soát | Kế toán so phải nộp với thực nộp theo từng công ty và kỳ. Khi thiếu danh sách hộ, đơn giá hoặc sao kê, trạng thái là “Bị chặn/Chưa đủ dữ liệu”, không kết luận chênh lệch. |
| Khóa sổ | Lãnh đạo xác nhận báo cáo; kế toán chốt kỳ/khóa sổ sau khi đủ điều kiện. Xác nhận báo cáo không tự động khóa kỳ. |
| QR thu online | Chưa thuộc phạm vi hiện tại. Nếu triển khai sau, QR hộ trỏ tới tài khoản pháp nhân công ty; phần xử lý công ty nộp về tài khoản xã là dòng tiền khác. Không dùng tài khoản cá nhân người quản lý. |
| Trung tâm Cung ứng dịch vụ công | Có trong tài liệu nguồn nhưng chưa được chốt quyền/phạm vi với người dùng, nên chưa thêm thành không gian vai trò. Đây là điểm mở, không được tự suy diễn. |

**Nghiệm thu 2.9:** công ty có đủ sáu nhóm chức năng vận hành nêu trên; kế toán có màn đối soát phần xử lý và khóa sổ; lãnh đạo không còn nút khóa kỳ; mọi số chưa có nguồn được hiển thị là chưa cấu hình/chưa có dữ liệu; toàn bộ màn hình mở được, form chính mở popup và không gọi mạng. Bộ kiểm tra: `work/test_spec_alignment.js`.

---

### Lịch sử quyết định 2.8 — một công ty thu gom và thu tiền trên khu vực

Đối chiếu tài liệu nghiệp vụ ngày 15/09/2026: việc thu tiền của dân do chính 11 đơn vị thu gom trực tiếp thực hiện. Vì vậy, tại cấp phân công khu vực, **đơn vị thu gom và đơn vị thu tiền là cùng một công ty**. Phần này thay thế toàn bộ mô hình hai nhiệm vụ `WASTE/PAYMENT` tại mục 2.5–2.6.

| Thành phần | Quy định hiện hành |
| --- | --- |
| Phân công khu vực | Một khu vực/tổ dân phố có tối đa một công ty phụ trách trong cùng thời gian hiệu lực. Công ty đó vừa cung cấp dịch vụ thu gom vừa trực tiếp thu tiền hộ. |
| Danh sách khu vực | Một cột “Công ty thu gom và thu tiền”, cùng số hộ, thời gian hiệu lực, trạng thái và thao tác phân công/sửa. Không còn hai cột đơn vị. |
| Chưa rõ công ty | `unitId = null`, trạng thái “Chưa có đơn vị phụ trách”. Dữ liệu Excel do một công ty cung cấp chỉ là khai báo nguồn, không tự động gán công ty đó cho hộ hoặc khu vực. |
| Giao trùng | Không cho hai phân công công ty cùng hiệu lực trên một khu vực. Đề xuất trùng giữ ở trạng thái chưa áp dụng để xử lý hoặc hủy. |
| Đổi công ty | Kết thúc phân công cũ vào ngày trước ngày hiệu lực mới, tạo phân công mới và giữ lịch sử. Bắt buộc xác định trách nhiệm thu nợ cũ và bàn giao dữ liệu. |
| Chi tiết khu vực | Một thẻ công ty phụ trách, một đầu mối liên hệ và một dòng lịch sử nhiệm vụ “Thu gom và thu tiền”. |
| Danh mục công ty | CRUD hồ sơ công ty, đầu mối và số khu vực phụ trách. Phân công thực hiện tại Quản lý khu vực. Không xóa/tạm ngưng công ty còn phân công hoặc lịch sử. |
| Báo cáo tiến độ | Tổng hợp theo cùng `unitId` của phân công khu vực; không tồn tại `paymentUnitId` riêng. Nhóm chưa phân công vẫn hiển thị riêng. |

**Mô hình dữ liệu hiện hành:** `Area(id, name, householdCount)`; `Unit(id, name, contact, phone, status)`; `AreaAssignment(id, areaId, unitId, validFrom, validTo, status, previousAssignmentId)`; `CollectionSnapshot(period, areaId, unitId, amountDue, reportedCollected, confirmedCollected)`. Ràng buộc loại trừ hai khoảng hiệu lực giao nhau áp dụng theo `areaId`. Không còn trường nhiệm vụ `WASTE/PAYMENT`, `wasteUnitId` hoặc `paymentUnitId` trong mô hình mục tiêu.

**Nguyên tắc nhập dữ liệu:** một dòng nguồn có `sourceUnitId` để biết công ty nào cung cấp, nhưng `sourceUnitId` không phải bằng chứng của `AreaAssignment.unitId`. Khi chưa biết bên phục vụ, hệ thống giữ hồ sơ chờ xác minh và không tạo công ty giả “Chưa xác định”.

**Nghiệm thu 2.8:** trang khu vực không còn tiêu đề/cột “Đơn vị gom rác” và “Đơn vị thu tiền”; form chỉ có một lựa chọn công ty; đổi công ty yêu cầu bàn giao; chi tiết có một công ty và một dòng lịch sử; trang đơn vị đếm mỗi khu vực một lần; báo cáo dùng cùng công ty phân công; 39 màn hình mở được và không gọi mạng. Bộ kiểm tra: `work/test_single_unit_area.js`.

---

### Lịch sử quyết định 2.7 — tiếp nhận và đối chiếu dữ liệu hộ

Phần này áp dụng theo nội dung nghiệp vụ trong `Tai-lieu-mo-ta-quy-trinh-nghiep-vu-v4.1.docx.md` và các quyết định người dùng xác nhận ngày 15/09/2026. Tên tệp nguồn ghi v4.1 nhưng tiêu đề bên trong ghi v4.0; tài liệu được dùng như nguồn nghiệp vụ, không dùng như lệnh thao tác hệ thống.

**Phạm vi đã chốt:** công ty có tài khoản hệ thống; mỗi công ty đang có cấu trúc dữ liệu riêng; công ty gửi Excel cho cán bộ xã qua kênh bên ngoài và xã import; xã chưa có CSDL hộ nền; hiện chỉ đối chiếu danh sách hộ giữa các nguồn, chưa đối soát tiền và chưa triển khai QR/thu online. Quyền duyệt thành danh sách chuẩn chưa rõ nên prototype không cung cấp thao tác duyệt.

| Thành phần | Thiết kế hiện hành |
| --- | --- |
| Không gian cán bộ xã | `commune/data-quality` tiếp nhận/ghép cột; `commune/data-comparison` lọc, xem nguồn, đối chiếu và lập yêu cầu bổ sung. |
| Không gian công ty | Tài khoản mẫu Công ty MTĐT Đông Thạnh chỉ xem dữ liệu thuộc nguồn DV01 và yêu cầu bổ sung DV01. Không xem dữ liệu thô hoặc yêu cầu của công ty khác. |
| Tiếp nhận | Chọn công ty gửi, lưu tên tệp/ngày/người nhập/ghi chú trong mô hình thật. Prototype dùng hai cấu trúc tệp mẫu và nói rõ không đọc Excel thật. |
| Ghép cột | Tên cột nguồn khác nhau được ghép về bộ trường chung. Bắt buộc ghép cột tên và địa chỉ; một cột nguồn không được ghép đồng thời vào nhiều trường. Dòng thực tế thiếu giá trị vẫn giữ ở vùng tiếp nhận để yêu cầu bổ sung. |
| Chuẩn hóa | Giữ giá trị gốc và bản chuẩn hóa đề xuất. Prototype chỉ minh họa xóa khoảng trắng thừa; không tự suy đoán địa chỉ, điện thoại, loại hộ, ngày phục vụ hoặc công ty phụ trách. |
| Đối chiếu | Cờ lỗi chỉ là gợi ý rà soát. Khi nhiều nguồn gần giống, xã xem cạnh nhau cùng nguồn/tệp/dòng gốc. Không tự gộp, loại bỏ hay xác nhận một bên phục vụ. |
| Yêu cầu bổ sung | Xã tạo nội dung cho đúng công ty nguồn; công ty chỉ xem yêu cầu của mình. Prototype cập nhật trong bộ nhớ phiên và không gửi thông báo thật. |

**Bộ trường chung đã duyệt:** mã hộ trong danh sách công ty; tên người đại diện/tên cơ sở; địa chỉ sử dụng dịch vụ; khu vực/tổ dân phố; loại đối tượng; số điện thoại; tình trạng phục vụ do công ty khai; thời điểm bắt đầu/ngừng; ghi chú. Tên và địa chỉ phải có cột nguồn để chạy kiểm tra. Mã công ty, tên tệp, số dòng nguồn, ngày nhận và người nhập do hệ thống ghi. CCCD, số nhân khẩu, biểu giá và công nợ không thuộc lô đối chiếu này.

**Trạng thái dữ liệu:** `RECEIVED` → `MAPPED` → `VALIDATED_WITH_ISSUES` hoặc `READY_FOR_REVIEW` → `PENDING_VERIFICATION`. Không có trạng thái `APPROVED` trong prototype vì chưa chốt người có quyền. Một dòng `READY_FOR_REVIEW` chỉ có nghĩa đủ thông tin để rà soát, không phải hộ chuẩn hoặc bằng chứng công ty đang phục vụ.

**Các trường hợp phải giữ riêng:** thiếu thông tin; nghi trùng trong một tệp; nghi trùng giữa công ty; cùng tên khác địa chỉ; cùng địa chỉ có nhiều hộ; chưa rõ đơn vị phục vụ; công ty khai khác phân công khu vực; hộ chuyển đi/ngừng dịch vụ/đổi đại diện. Hệ thống giữ mọi khai báo cùng nguồn. Chưa biết đơn vị thì không tạo bản ghi công ty giả “Chưa xác định” và không ép chọn đơn vị.

**Mô hình dữ liệu bổ sung:** `DataIntakeBatch(id, sourceUnitId, originalFileName, receivedAt, receivedBy, note, status)`; `SourceColumnMapping(batchId, targetField, sourceColumn)`; `SourceRow(id, batchId, sourceRowNumber, sourceCode, rawPayload, normalizedProposal, validationIssues)`; `MatchCandidate(leftSourceRowId, rightSourceRowId, rule, score, status=PENDING)`; `VerificationCase(id, issueType, sourceRowIds, evidence, status, resolution)`; `DataCorrectionRequest(id, unitId, sourceRowId, content, status)`. Hồ sơ chuẩn `ServiceSubject/ServicePoint` chỉ được tạo hoặc liên kết sau quy trình xác minh thật được chốt.

**Quy tắc quyền:** xã xem tất cả lô và nguồn; công ty chỉ xem `sourceUnitId` bằng đơn vị của tài khoản. Kiểm tra phạm vi phải thực hiện ở backend trong hệ thống thật, không dựa vào ẩn nút. Tệp gốc và dữ liệu cá nhân cần quyền truy cập, nhật ký tải/xem và thời hạn lưu; prototype chỉ dùng tên, địa chỉ và điện thoại giả.

**Nghiệm thu 2.7:** hai cấu trúc cột khác nhau ghép được về trường chung; chặn thiếu cột bắt buộc và một cột ghép nhiều trường; giữ dòng thiếu dữ liệu; xã xem được nguồn đặt cạnh; công ty không mở được dòng nguồn khác kể cả gọi trực tiếp; yêu cầu bổ sung chỉ xuất hiện cho đúng công ty; không có nút gộp/gán/duyệt; không gọi mạng hoặc đọc Excel thật. Kiểm tra: `work/test_data_intake.js`.

---

### Lịch sử cập nhật 2.6 — tối ưu thao tác và CRUD đơn vị

Các quyết định dưới đây thay thế nội dung tương ứng ở 2.5 và các mục lịch sử phía dưới.

| Hạng mục | Yêu cầu và hành vi đã triển khai |
| --- | --- |
| Phân công tại khu vực | Nút mỗi dòng mở popup ngay trên danh sách; chọn nhiều tổ và bấm phân công hàng loạt. Chọn tất cả chỉ áp dụng kết quả đang hiện; đổi bộ lọc bỏ lựa chọn bị ẩn. |
| Form điền sẵn | Hai công ty hiện tại được điền sẵn khi chọn một tổ; nhiều tổ chỉ điền chung nếu cùng công ty. Có “Đơn vị thu tiền giống đơn vị gom rác”, bỏ chọn để chọn riêng. |
| Kiểm tra | Hiển thị từng khu vực/nhiệm vụ, công ty hiện tại và dự kiến, khoảng hiệu lực và kết quả kiểm tra. Chặn cả lô nếu có thiếu đơn vị, ngày sai hoặc giao trùng chưa xử lý; không tự bỏ qua dòng lỗi. |
| Giữ nguyên và bàn giao | Nhiệm vụ không đổi công ty giữ nguyên phân công và ngày cũ. Chuyển công ty trong khoảng hiệu lực phải chọn bàn giao; ngày mới phải sau ngày bắt đầu cũ. Phân công cũ kết thúc ngày trước bàn giao và được giữ lịch sử khi triển khai thật. |
| Đề xuất trùng cũ | Tổ 22 có đề xuất PC-KV22-02 chưa áp dụng; ghi rõ công ty và khoảng ngày trùng. Cần xác nhận xử lý/hủy đề xuất này trong mô phỏng, không âm thầm bỏ qua. |
| Bàn giao công nợ | Khi thay công ty thu tiền, bắt buộc chọn công ty cũ tiếp tục thu nợ cũ hoặc bàn giao danh sách nợ cho công ty mới; xác nhận biên bản với hai bên. Hiện nợ chưa thu, đã thu chờ xác nhận và phải nộp còn thiếu theo khu vực/công ty cũ. |
| Trách nhiệm tiền cũ | Công ty cũ tiếp tục chịu trách nhiệm tiền đã nhận và phần phải nộp thiếu. Công ty mới chịu khoản mới từ ngày hiệu lực; không chuyển doanh thu lịch sử. Số phải nộp thiếu lấy từ đối soát, không suy ra từ số chờ xác nhận. |
| Hợp đồng | Chọn chỉ đổi đơn vị thực hiện (giữ hợp đồng) hoặc thay bên ký (kết thúc hợp đồng cũ, lập hợp đồng mới). |
| Chi tiết khu vực | Ưu tiên danh sách hộ, phạm vi và hai công ty; sơ đồ vị trí thu gọn mặc định, bấm mới mở. |
| Trang đơn vị | Quản lý hồ sơ, đầu mối và liên kết xem khu vực; phân công tập trung tại trang khu vực. |
| CRUD | Thêm, xem, sửa, xóa đơn vị bằng popup; danh sách và lựa chọn công ty cập nhật ngay trong phiên. Mã tự sinh; tên, đầu mối, điện thoại, trạng thái là trường chính. Chặn tên trùng/để trống và điện thoại không đúng định dạng mẫu. |
| Xóa/tạm ngưng đơn vị | Không xóa khi còn phân công hoặc lịch sử thu. Không tạm ngưng khi còn khu vực phụ trách. Đơn vị mới chưa được dùng có thể xóa; đơn vị tạm ngưng bị loại khỏi lựa chọn phân công mới. |
| Tổng báo cáo | Bao gồm khoản phải thu ở khu vực chưa có đơn vị thu tiền, hiển thị nhóm “Chưa phân công” và liên kết tới khu vực. Không loại nhóm này khỏi tổng khi lọc toàn bộ. |
| Trạng thái tiền | Tách phải thu, công ty báo đã thu, kế toán đã xác nhận và còn phải thu. Chờ xác nhận = báo đã thu − đã xác nhận; không đồng nghĩa chưa nộp hoặc thất thoát. |
| Tiến độ | Tỷ lệ = công ty báo đã thu / phải thu. So với mục tiêu tại mốc báo cáo của kỳ, có ngày và hạn thu rõ ràng; tháng 09 dùng mốc 14/09 và mục tiêu mẫu 45%, tháng 08 dùng 31/08 và 100%. Đây là giả định trình diễn, không phải quy định thu thật. |

**Phạm vi dữ liệu và lưu trữ:** 24 tổ và 11 công ty ban đầu là mẫu. CRUD công ty là ngoại lệ mới so với yêu cầu không thay đổi dữ liệu trước đây: chỉ cập nhật bộ nhớ JavaScript trong phiên, không backend, API, localStorage hoặc lưu bền vững. Tải lại trang khôi phục mẫu ban đầu. Phân công/bàn giao/thông báo vẫn chỉ xác nhận mô phỏng, không thay đổi số liệu hay gửi thật. Dữ liệu bàn giao là ảnh chụp mẫu tại 15/09; triển khai thật phải tính lại tại thời điểm hiệu lực.

**Dữ liệu bổ sung:** Unit.status; AssignmentBatch(areaIds, wasteUnitId, paymentUnitId, sameUnit, validFrom, validTo, replaceExisting, reason); Handover(areaId, oldPaymentUnitId, newPaymentUnitId, uncollectedDebt, pendingConfirmation, remittanceOutstanding, legacyDebtOwner, agreedAt); CollectionSnapshot(period, asOf, targetRate, deadline, unitId, areaId, due, reportedCollected, confirmedCollected). Liên kết theo mã đơn vị, không theo tên; đổi tên không đổi mã hoặc chuyển lịch sử sang đơn vị khác.

**Nghiệm thu 2.6:** kiểm tra phân công hàng loạt, bỏ chọn ẩn khi lọc, điền sẵn và đồng bộ hai đơn vị, chặn trùng và bắt buộc bàn giao, xử lý đề xuất cũ, thêm/sửa/xem/xóa một đơn vị mới, chặn xóa đơn vị đã dùng, chặn tạm ngưng khi chưa bàn giao, nhóm chưa phân công nằm trong tổng, tỷ lệ theo mốc kế hoạch, tổng báo đã thu không nhỏ hơn tổng xác nhận, bản đồ thu gọn và không có yêu cầu mạng. Bộ kiểm tra: `work/test_commune_review.js`.

---

### Cập nhật đã chốt 2.5 — quản lý khu vực và tiến độ công ty

Phần này thay thế các quy định trước đó về màn hình `commune/routes`, `commune/route-detail` và `commune/debts`. Các mô tả quản lý tuyến/người đi thu ở những phiên bản trước được giữ làm lịch sử yêu cầu, không phải thiết kế hiện hành của ba màn hình này.

| Vấn đề / yêu cầu | Thiết kế hiện hành |
| --- | --- |
| Đơn vị tổ chức quản lý | Khu vực / tổ dân phố gồm nhiều đường và nhiều hộ; không đồng nhất khu vực với một tuyến đường. |
| Đơn vị phụ trách | Một đơn vị cho mỗi khu vực, mỗi nhiệm vụ trong cùng thời gian hiệu lực. Công ty gom rác có thể khác công ty thu tiền. |
| Giao đè | Đề xuất trùng chưa được áp dụng; cảnh báo và chặn xác nhận khi giao trùng thời gian cho cùng khu vực và nhiệm vụ. Hai nhiệm vụ khác nhau không tính là trùng. |
| Chưa phân công | Phân biệt thiếu đơn vị gom rác và thiếu đơn vị thu tiền; bộ lọc “Cần xử lý” dẫn đến popup phân công. |
| Thay công ty | Bàn giao kết thúc phân công cũ ngày trước ngày hiệu lực mới; giữ lịch sử. Không sửa/xóa các kết quả thu cũ. |
| Báo cáo tiến độ | Là tiến độ thu tiền, không phải số lượt gom rác. Tổng hợp theo công ty thu tiền: phải thu, đã thu, còn phải thu, tỷ lệ đã thu/phải thu. |
| Vai trò xã | Xem báo cáo và thông báo đầu mối công ty. Công ty tự tổ chức nhân sự và đôn đốc nội bộ; báo cáo xã không có người đi thu hoặc nút giao việc cho họ. |

**Màn hình và liên kết:**

- `commune/routes` — Quản lý khu vực: mã/tên tổ, số hộ/chủ nguồn thải, đơn vị gom rác, đơn vị thu tiền, trạng thái và sửa/phân công. Lọc theo tên, công ty ở một trong hai nhiệm vụ và tình trạng cần xử lý.
- `commune/route-detail` — Chi tiết khu vực được chọn: hai đơn vị, sơ đồ vị trí minh họa, danh sách hộ và lịch sử phân công. Giữ đường dẫn cũ để không làm hỏng liên kết; nội dung không còn là chi tiết tuyến.
- `commune/collection-units` — Đơn vị thu gom: 11 công ty, đầu mối/số liên hệ, số khu vực theo hai nhiệm vụ; tìm kiếm công ty. Tên công ty mở popup thông tin và liên kết từng khu vực. “Xem khu vực” mở danh sách đã lọc theo công ty.
- `commune/debts` — Báo cáo tiến độ thu tiền: lọc kỳ, công ty thu tiền, khu vực; KPI và bảng tính lại theo cùng phạm vi. Thông báo công ty bằng popup nội dung và hạn phản hồi.

**Popup phân công:** khu vực cố định theo bản ghi; nhiệm vụ, công ty, ngày bắt đầu/kết thúc, lựa chọn bàn giao và lý do/căn cứ. Bắt buộc chọn công ty, ngày hợp lệ và lý do. Ngày bàn giao phải sau ngày bắt đầu phân công đang hiệu lực. Không thay đổi nhiệm vụ còn lại. Kiểm tra trùng theo khóa `(areaId, task)` và khoảng thời gian giao nhau. Trong triển khai thật kiểm tra phải thực hiện lại ở backend trong giao dịch trước khi lưu.

**Dữ liệu:** Area(id, name, householdCount); Unit(id, name, contact, phone); AreaAssignment(areaId, task=WASTE|PAYMENT, unitId, validFrom, validTo, status, previousAssignmentId); CollectionReport(areaId, paymentUnitId, period, amountDue, amountCollected); UnitNotice(unitId, period, areaScope, content, replyDueAt). Báo cáo lịch sử gắn đơn vị chịu trách nhiệm tại kỳ phát sinh, không chuyển số thu cũ sang đơn vị mới.

**Phạm vi minh họa:** 24 tổ, 11 công ty; tổ 22 có đề xuất giao trùng, tổ 23 thiếu gom rác, tổ 24 thiếu thu tiền. Đây là bộ dữ liệu riêng, không đại diện tổng số hộ toàn xã ở dashboard cũ. Tổng báo cáo chỉ gồm khu vực đã có đơn vị thu tiền; tổ chưa giao được thông báo rõ ngoài tổng. Còn phải thu không đồng nghĩa tất cả quá hạn. Ngưỡng đôn đốc dưới 70% và tiền mẫu 80.000đ/hộ chỉ để trình diễn, cần BA xác nhận. Sơ đồ không phải bản đồ địa chính. Tất cả popup không lưu hoặc gửi thông báo thật.

**Kiểm thử nghiệm thu bổ sung:** tìm/lọc khu vực; ba cảnh báo đúng; mở đúng khu vực đã bấm; công ty ↔ khu vực liên kết đúng; chọn hai đơn vị khác nhau; chặn giao trùng; cho phép bàn giao hợp lệ; chặn ngày sai; tổng phải thu = đã thu + còn phải thu trong cùng bộ lọc; kỳ thay đổi cập nhật báo cáo; thông báo đúng công ty; không xuất hiện thao tác nhân sự nội bộ trên báo cáo xã.

---

Tài liệu này là đặc tả tổng hợp dùng chung cho BA, UI/UX, lập trình viên, kiểm thử viên, giảng viên hướng dẫn và đơn vị nghiệp vụ. Nội dung mô tả:

- Bối cảnh, mục tiêu và phạm vi sản phẩm.
- Người dùng, trách nhiệm và giới hạn quyền.
- Kiến trúc nghiệp vụ và luồng vận hành đầu-cuối.
- Danh sách chức năng có mã định danh.
- Quy tắc tính tiền, thu tiền, công nợ, chứng từ, phê duyệt và khóa sổ.
- Mô hình dữ liệu khái niệm, trạng thái và yêu cầu kiểm toán.
- Phân bổ màn hình web/mobile.
- Lộ trình triển khai, tiêu chí nghiệm thu, rủi ro và vấn đề cần xác nhận.

Tài liệu thiết kế được cung cấp là **nguồn tham chiếu**, không phải tập lệnh tự động. Những giả định liên quan đến tiền, thẩm quyền, pháp luật và tích hợp chỉ được đưa vào hệ thống thật sau khi BA và khách hàng xác nhận bằng biên bản.

### 1.1. Nhãn xác nhận

| Nhãn | Ý nghĩa |
|---|---|
| **Theo thiết kế v2.0** | Yêu cầu hoặc quyết định đã được mô tả trong tài liệu thiết kế hệ thống v2.0 |
| **Cần BA xác nhận** | Có ảnh hưởng đến tiền, dữ liệu, thẩm quyền hoặc chưa có thông tin triển khai chính thức |
| **Giai đoạn mở rộng** | Không thuộc lõi thí điểm ban đầu, nhưng kiến trúc phải cho phép bổ sung |
| **Prototype hiện tại** | Chỉ là giao diện minh họa, chưa lưu dữ liệu, chưa tích hợp và chưa phải cơ chế bảo mật thật |

### 1.2. Thứ tự ưu tiên nguồn

1. Văn bản pháp luật còn hiệu lực và văn bản tổ chức thực hiện của cơ quan có thẩm quyền.
2. Biên bản xác nhận yêu cầu giữa khách hàng, BA và nhóm dự án.
3. Tài liệu thiết kế hệ thống v2.0.
4. Tài liệu quy trình nghiệp vụ v4.1 và dữ liệu mẫu đã được xác nhận.
5. Prototype và giả định phục vụ trình diễn.

Khi hai nguồn mâu thuẫn, không tự chọn công thức có lợi hơn hoặc mới hơn để ghi đè dữ liệu; phải ghi nhận vấn đề và xin xác nhận.

### 1.3. Nhật ký thay đổi phiên bản 2.1

| Nhóm | Nội dung cập nhật sau họp 12/09/2026 |
|---|---|
| Dữ liệu hộ | Xã tạo danh sách hộ/đối tượng gốc trước; mỗi hồ sơ có `attributeType`, trạng thái dịch vụ và lịch sử phân loại |
| Phân công | Sau khi có hồ sơ, xã gán đơn vị xử lý rác, tuyến và thời gian hiệu lực |
| QR | Ghi nhận thực tế người đi thu đang hiển thị/cập nhật QR; bổ sung phiên bản QR, chủ tài khoản, hiệu lực, phê duyệt và audit |
| Nhập kết quả | Đơn vị/người đi thu có thể nhập từng hộ trên web hoặc tải Excel vào vùng kiểm tra |
| Hộ–khoản | Chuẩn hóa khóa `householdId + periodId + serviceType`; tách dòng phải thu và dòng đã thu/phân bổ |
| Công nợ | Xã quản lý công nợ tổng hợp theo đơn vị thu; đơn vị thu quản lý chi tiết từng hộ thuộc phạm vi |
| Chống thất thoát | Khóa thu và QR khi hộ chấm dứt; khoản thu phát sinh sau ngày chấm dứt đi vào hàng chờ ngoại lệ |
| Báo cáo lãnh đạo | Bổ sung tổng hợp tài chính thu–chi, hiệu quả đơn vị thu, tỷ lệ thành công và thu ngoài hệ thống |
| Luồng tài khoản | Thêm ba phương án để đánh giá; không chọn tài khoản cá nhân làm mô hình mục tiêu; quyết định cuối vẫn cần BA/kế toán/lãnh đạo xác nhận |
| Prototype | Cập nhật `outputs/prototype-v2` độc lập; không sửa prototype cũ |

### 1.4. Nhật ký thay đổi phiên bản 2.2

| Nhóm | Nội dung cập nhật ngày 14/09/2026 |
|---|---|
| Mô hình tổ chức thu | 11 công ty là danh mục phối hợp và chịu trách nhiệm theo khu vực. Theo quyết định 15/09/2026, công ty có tài khoản giới hạn theo dữ liệu của đơn vị; nghiệp vụ người thu vẫn giữ riêng khi chưa chốt cơ cấu nội bộ. |
| Phân tuyến | Cán bộ xã quản lý tuyến đường có sẵn, gán công ty, đầu mối quản lý và giao trực tiếp tài khoản người đi thu theo thời hạn |
| Bản đồ | Màn phân tuyến v2.2 từng hiển thị một số tuyến tiêu biểu; cách trình bày này được thay bằng bản đồ một tuyến tại trang chi tiết ở v2.3 |
| Theo dõi công nợ xã | Chuyển từ bảng công nợ cấp công ty sang tiến độ theo người đi thu và tuyến: số hộ đã ghé, đã thu, còn công nợ, lần cập nhật và đầu mối cần đốc thúc |
| Danh sách hiện trường | Hai màn “Tuyến được giao” và “Hộ còn công nợ” dùng lưới desktop/một cột mobile, có tìm kiếm và lọc trạng thái thực sự |
| Tối giản dữ liệu | Thẻ hộ chỉ giữ mã/tên, địa chỉ, liên hệ, kỳ, số tiền, hạn/tình trạng và thao tác cần thiết |

### 1.5. Nhật ký thay đổi phiên bản 2.3

| Nhóm | Nội dung cập nhật ngày 14/09/2026 |
|---|---|
| Phân cấp quản lý | Chuẩn hóa luồng giao diện: khu vực → tuyến → nhà thầu → danh sách hộ/chủ nguồn thải trong tuyến |
| Quy mô tuyến | 11 nhà thầu phụ trách nhiều tuyến, không đồng nhất “11 nhà thầu = 11 tuyến”; bộ dữ liệu minh họa dùng 82 tuyến, khoảng 400–800 hộ/tuyến |
| Danh sách tuyến | Bỏ cột địa bàn và người đi thu; giữ mã/tên tuyến, phạm vi, lịch thu, số hộ, nhà thầu/đầu mối, hiệu lực, trạng thái và thao tác sửa |
| Bộ lọc | Khu vực được chọn ở cấp cha; danh sách tuyến hỗ trợ tìm kiếm và lọc theo nhà thầu/trạng thái phân công |
| Phân công | Popup chỉ phân công nhà thầu theo tuyến; việc giao người đi thu thuộc luồng vận hành khác và không hiển thị tại quản lý tuyến |
| Chi tiết tuyến | Bấm mã tuyến mở trang riêng gồm bản đồ tập trung một tuyến, thông tin phân công và danh sách hộ/chủ nguồn thải |

### 1.6. Nhật ký thay đổi phiên bản 2.4

| Vấn đề | Hướng giải quyết đã đưa vào prototype |
|---|---|
| Hộ nợ nhiều, muốn ngưng dịch vụ | Không tự động cắt. Thực hiện: **ghi nhận nợ → cảnh báo → lập hồ sơ → lãnh đạo duyệt tạm ngưng → thông báo nhà thầu** |
| Công ty B thay Công ty A | Không sửa/xóa phân công cũ. Kết thúc assignment của A và tạo **assignment mới** cho B theo ngày hiệu lực |
| Công ty khác vào có giữ hợp đồng không | Nếu công ty là bên ký hợp đồng dịch vụ thì kết thúc hợp đồng cũ và tạo hợp đồng mới; nếu chỉ được giao thực hiện/thu thì giữ hợp đồng và chỉ đổi assignment |
| Tuyến thu gom và tuyến thu tiền có giống nhau không | Không mặc định giống nhau. Quản lý độc lập hai loại tuyến, cho phép liên kết hoặc dùng chung khi thực tế trùng phạm vi |

---

## 2. Tổng quan sản phẩm

### 2.1. Tên và định vị

Tên sản phẩm: **Hệ thống số hóa quản lý và thu giá dịch vụ thu gom, vận chuyển, xử lý chất thải rắn sinh hoạt**.

Đây là công cụ nghiệp vụ nội bộ của chính quyền xã. Thanh toán là một phân hệ trong chuỗi quản lý đối tượng, hợp đồng, khoản phải thu, công nợ, chứng từ, đối soát và báo cáo; không phải toàn bộ sản phẩm.

### 2.2. Mục tiêu ưu tiên

Mục tiêu số một là **chống thất thu và tăng khả năng truy vết**, thông qua:

- Tiếp nhận dữ liệu hộ từ nhiều công ty nhưng giữ nguyên nguồn và dòng gốc.
- Xã xác minh danh sách hộ, khu vực và công ty phụ trách trước khi dùng cho nghiệp vụ.
- Tính phần xử lý phải nộp từ số hộ đủ điều kiện và đơn giá có hiệu lực.
- Đối soát số phải nộp với tiền công ty thực nộp trên sao kê tài khoản xã.
- Phát hiện thiếu/chênh theo đúng công ty và kỳ, không tự kết luận khi thiếu nguồn.
- Tách công ty thu tiền hộ, kế toán xã đối soát, lãnh đạo xác nhận và kế toán khóa sổ.
- Ghi nhật ký đầy đủ đối với thao tác dữ liệu, kê khai, đối soát và khóa kỳ.

### 2.3. Phạm vi giai đoạn đầu

- Một ứng dụng nghiệp vụ dùng chung cho máy tính và điện thoại.
- Quản lý người dùng, vai trò và phạm vi dữ liệu.
- Tiếp nhận/đối chiếu dữ liệu đối tượng/chủ nguồn thải từ nhiều công ty; chưa tạo danh sách chuẩn khi quy trình duyệt chưa chốt.
- Xã quản lý khu vực/tổ dân phố và gán một công ty vừa thu gom vừa thu tiền theo thời gian hiệu lực.
- Hợp nhất, chuẩn hóa, chống trùng và kế thừa công nợ từ ba xã cũ.
- Quản lý biểu giá, định mức và kỳ/đợt theo thời gian hiệu lực.
- Cho công ty cập nhật kết quả từng hộ trên web hoặc nhập tệp Excel có kiểm tra sau khi hộ đã được xác minh/phân công.
- Công ty quản lý nhân viên, tiền mặt và biên lai hộ dân trong nội bộ.
- Tính nghĩa vụ phần xử lý theo công ty/kỳ và nhận kê khai khoản đã nộp.
- Khớp sao kê tài khoản xã, xử lý khoản nộp chưa rõ và đối soát phải nộp–thực nộp.
- Quản lý công nợ, miễn giảm, hoàn tiền và xóa nợ có kiểm soát.
- Đối soát, cảnh báo và báo cáo thu/nợ.
- Quản lý công nợ theo hai mức: xã theo tiến độ công ty, công ty/nhân viên theo từng hộ.
- Phát hiện và xử lý trường hợp hộ đã chấm dứt nhưng vẫn bị thu/cung cấp dịch vụ ngoài hệ thống.
- Báo cáo lãnh đạo về tài chính thu–chi, đơn vị thu hộ và tỷ lệ thành công.

### 2.4. Ngoài phạm vi lõi ban đầu

- Cổng tự phục vụ của người dân; dự kiến giai đoạn 2.
- Người dân tự đăng nhập, tự sửa hồ sơ hoặc tự nộp đơn miễn giảm.
- Hạch toán/liên thông Kho bạc Nhà nước; thuộc giai đoạn mở rộng.
- Phản ánh hiện trường, đăng ký rác cồng kềnh và trao đổi đồ cũ.
- Ứng dụng mobile native riêng; hệ thống trước mắt là web responsive/PWA nếu được chọn.
- Đồng bộ trực tiếp cơ sở dữ liệu dân cư khi chưa có cơ sở pháp lý và API.
- QR thu online của hộ và đồng bộ sao kê tài khoản từng công ty khi chưa chốt tài khoản/API.
- Quyết định nghiệp vụ tự động bằng AI.

---

## 3. Bối cảnh nghiệp vụ

Xã Đông Thạnh vận hành từ ngày 01/07/2025 sau khi hợp nhất ba xã cũ: Thới Tam Thôn, Nhị Bình và Đông Thạnh. Việc hợp nhất tạo ra các bài toán dữ liệu chính:

1. Ba nguồn dữ liệu hộ, sổ thu và công nợ có cấu trúc và chất lượng khác nhau.
2. Cần chuẩn hóa mã đối tượng và địa chỉ theo địa giới mới.
3. Công nợ ở xã cũ phải được kế thừa, không mất khi chuyển địa giới.
4. Số liệu người thu ghi nhận phải được đối chiếu với dòng tiền thực nhận.
5. Hộ gia đình, cơ sở kinh doanh, doanh nghiệp và cơ quan có cách xác định giá khác nhau.

Các con số như khoảng 50.000 hộ, hơn 11.600 cơ sở/doanh nghiệp và số đơn vị thu gom trong tài liệu nguồn chỉ là dữ liệu tham chiếu; phải được xã cung cấp danh sách chính thức trước khi thiết kế dung lượng và nghiệm thu.

---

## 4. Thuật ngữ và cơ sở pháp lý

### 4.1. Thuật ngữ chuẩn

| Thuật ngữ | Giải thích |
|---|---|
| Đối tượng/chủ nguồn thải | Hộ gia đình, cá nhân, cơ quan, tổ chức hoặc cơ sở sản xuất–kinh doanh–dịch vụ sử dụng dịch vụ |
| Người thu hộ | Tổ trưởng tổ dân phố, trưởng thôn, cộng tác viên hoặc nhân viên đơn vị thu gom được phân công thu |
| Người đóng thay | Người nộp tiền thay cho chủ đối tượng; không phải người thu hộ |
| Hợp đồng dịch vụ | Quan hệ giữa đối tượng, dịch vụ, biểu giá, đơn vị cung cấp và thời gian hiệu lực |
| Khoản phải thu | Nghĩa vụ tiền của một đối tượng cho một kỳ/dịch vụ |
| Khoản thu lẻ | Khoản sinh ngoài đợt hàng loạt nhưng vẫn dùng chung mã, kỳ và quy tắc |
| Dòng treo | Dòng tiền đã nhận nhưng chưa đủ thông tin để khớp với khoản phải thu |
| Đối soát | So sánh dữ liệu nghĩa vụ, dữ liệu ghi nhận thu, sao kê và chứng từ |
| Xóa nợ | Chuyển trạng thái một khoản không còn phải thu theo quyết định; không xóa dữ liệu vật lý |
| Khóa kỳ | Đóng kỳ đã hoàn tất kiểm tra và ngăn sửa trực tiếp dữ liệu nghiệp vụ |

Tên gọi pháp lý sử dụng trên giao diện và chứng từ là **“giá dịch vụ thu gom, vận chuyển, xử lý chất thải rắn sinh hoạt”**, không dùng “phí vệ sinh môi trường” làm tên pháp lý chính.

### 4.2. Lưu ý cập nhật pháp lý

Tài liệu thiết kế v2.0 ngày 03/07/2026 sử dụng Quyết định 67/2025/QĐ-UBND làm căn cứ biểu giá. Tuy nhiên, tại thời điểm cập nhật đặc tả này, Quyết định 65/2026/QĐ-UBND của TP.HCM đã có hiệu lực từ 01/09/2026 và có quy định chuyển tiếp.

Do đó:

- Không hard-code Quyết định 67/2025 hoặc bất kỳ mức giá nào trong mã nguồn.
- Biểu giá phải có `legalBasis`, địa bàn, nhóm đối tượng, phương pháp tính và khoảng hiệu lực.
- Kỳ cũ giữ nguyên phiên bản giá đã áp dụng để đối soát lịch sử.
- Trước khi vận hành kỳ 09/2026, BA phải xác nhận văn bản và cơ chế chuyển tiếp thực tế của xã.
- Các thuật ngữ “phần xử lý”, “đơn vị giữ lại” hoặc “đích nộp” chỉ sử dụng sau khi cơ chế tổ chức thu được xác nhận.

---

## 5. Người dùng và phân tách trách nhiệm

Vai trò là vai trò chức năng, không nhất thiết trùng tên phòng ban. Một người có thể được gán nhiều vai khi tổ chức nhỏ, nhưng hệ thống vẫn phải chặn các trường hợp tự đề nghị–tự duyệt hoặc tự thu–tự đối soát trái quy tắc.

| Vai trò | Người đảm nhiệm tham chiếu | Trách nhiệm chính | Giới hạn bắt buộc |
|---|---|---|---|
| Quản trị hệ thống | Đơn vị triển khai/CNTT-CĐS của xã | Tài khoản, RBAC, cấu hình, kết nối, nhật ký, sao lưu | Không quyết định nghiệp vụ hoặc duyệt tiền |
| Cán bộ xã | Công chức môi trường/CTRSH thuộc Phòng Kinh tế | Dữ liệu hộ, khu vực, công ty phụ trách, kỳ thu, giám sát tiến độ và lập đề nghị | Không điều hành nhân viên thu nội bộ công ty; không tự duyệt quyết định tiền; không cấu hình kỹ thuật |
| Công ty thu gom | Tài khoản thuộc một trong 11 công ty | Xem hộ được giao; cập nhật kết quả thu; quản lý bảng kê biên lai; xem nghĩa vụ phần xử lý; kê khai khoản đã nộp; bổ sung dữ liệu nguồn | Chỉ xem dữ liệu thuộc đơn vị; không tự duyệt hộ chuẩn/đơn giá; kê khai không tự xác nhận tiền đã về xã |
| Nhân viên thu của công ty | Nhân viên/cộng tác viên do công ty tổ chức | Xem danh sách công ty phân nội bộ; nhập kết quả; theo dõi hộ cần quay lại; chốt ca nội bộ | Không xem công ty khác; không sửa danh sách hộ/giá; xã không giao việc hoặc đối soát tiền mặt trực tiếp với nhân viên |
| Kế toán | Công chức tài chính–kế toán | Sao kê tiền phần xử lý về xã, khoản chưa rõ, đối soát phải nộp–thực nộp theo công ty, báo cáo, chốt/khóa sổ | Không quyết định miễn giảm; không sửa dữ liệu nguồn; chỉ khóa sau xác nhận báo cáo |
| Lãnh đạo | Chủ tịch/Phó Chủ tịch hoặc người có thẩm quyền | Dashboard, duyệt quyết định về tiền, xác nhận báo cáo | Không khóa sổ thay kế toán; không thao tác kỹ thuật; không sửa dữ liệu nguồn |
| Người dân | Giai đoạn 2 | Tra cứu, nộp trực tuyến, nhận chứng từ | Không thuộc người dùng nội bộ giai đoạn đầu |

Quyết định hiện hành 15/09/2026: công ty có tài khoản hệ thống và là actor trực tiếp thu tiền hộ/nộp phần xử lý. Công ty vẫn gửi Excel danh sách hộ cho xã qua kênh bên ngoài; cán bộ xã là người import. Không gian nhân viên thu chỉ mô phỏng phân quyền nội bộ công ty, không phải kênh để xã điều hành nhân viên.

### 5.1. Ma trận quyền mức cao

Ký hiệu: `R` xem, `C/U` tạo/cập nhật, `A` duyệt, `–` không có quyền.

| Nhóm chức năng | QT | Cán bộ xã | Công ty | Người đi thu | Kế toán | Lãnh đạo |
|---|---:|---:|---:|---:|---:|---:|
| Người dùng, quyền, cấu hình | C/U | – | – | – | – | R |
| Tiếp nhận và đối chiếu dữ liệu hộ | R kỹ thuật | C/U toàn bộ nguồn | R nguồn của đơn vị | – | R | R |
| Đối tượng và hợp đồng | R | C/U | R phạm vi đơn vị | R phạm vi đơn vị/tuyến | R | R |
| Biểu giá và kỳ | C/U cấu hình | C/U nghiệp vụ | – | R khoản được giao | R | R |
| Sinh/phát hành đợt | R | C/U | – | – | R | R/A nếu quy chế bật |
| Thu tiền tại hộ | – | R tiến độ | C/U trong phạm vi | C/U theo phân công nội bộ | R tổng hợp | R tổng hợp |
| Biên lai hộ dân | R kỹ thuật | R tổng hợp | C/U và chịu trách nhiệm phát | R phạm vi được giao | R bảng kê | R tổng hợp |
| Sao kê phần xử lý về xã | R kỹ thuật | R | R kê khai của mình | – | C/U/đối soát | R |
| Công nợ hộ và nhắc nợ | R | R theo công ty | C/U trong phạm vi | C/U chi tiết được giao | R tổng hợp | R tổng hợp |
| Miễn giảm/hoàn/xóa nợ | R kỹ thuật | Tạo đề nghị | – | – | Kiểm tra/áp dụng | A |
| Báo cáo, đối soát | R kỹ thuật | R nghiệp vụ | R phạm vi đơn vị | R cá nhân | C/U | R/A |
| Khóa kỳ | R kỹ thuật | R | – | – | C/U sau xác nhận | R trạng thái |

Quyền thật phải được kiểm tra ở backend/API và truy vấn dữ liệu; ẩn menu ở giao diện không phải bảo mật.

---

## 6. Kiến trúc nghiệp vụ

Hệ thống được thiết kế thành bốn tầng:

1. **Kênh truy cập:** web desktop và giao diện mobile của cùng một ứng dụng; cổng người dân là lớp giai đoạn 2.
2. **Phân hệ nghiệp vụ:** danh mục/hợp đồng, biểu giá, hóa đơn, thu tiền/chứng từ, công nợ, báo cáo/đối soát.
3. **Tích hợp:** VietQR/ngân hàng, HĐĐT; KBNN ở giai đoạn mở rộng.
4. **Nền dữ liệu:** một kho dữ liệu đa địa bàn, lưu lịch sử từ ba xã cũ và phân vùng theo phạm vi quyền.

Nguyên tắc:

- Một hệ thống và một nguồn dữ liệu dùng chung.
- Hóa đơn/khoản phải thu chỉ sinh một lần.
- Mọi kênh đọc/ghi cùng một bản ghi nghiệp vụ.
- Không tạo kho dữ liệu riêng cho người đi thu.
- Mỗi thay đổi quan trọng có người thực hiện, thời điểm và dữ liệu trước/sau.

---

## 7. Danh sách chức năng

### 7.1. Quản trị hệ thống — QT

| Mã | Chức năng |
|---|---|
| QT-01 | Tạo, khóa, mở khóa tài khoản và gán vai trò |
| QT-02 | Quản lý RBAC đến trang, chức năng, hành động và phạm vi dữ liệu |
| QT-03 | Cấu hình đơn vị tổ chức thu, đơn vị cung cấp và đích nộp/hạch toán |
| QT-04 | Quản lý địa bàn và ánh xạ địa giới cũ sang mới |
| QT-05 | Cấu hình tham số giá: thu gom, vận chuyển, xử lý, VAT và phương pháp tính |
| QT-06 | Cấu hình kết nối VietQR/ngân hàng, HĐĐT và KBNN |
| QT-07 | Quản lý mẫu biên lai/HĐĐT và mẫu thông báo SMS/Zalo |
| QT-08 | Cấu hình kỳ/đợt, quy tắc mở và khóa sổ |
| QT-09 | Nhật ký và audit trail |
| QT-10 | Sao lưu, khôi phục và giám sát hệ thống |
| QT-11 | Cấu hình quy tắc phê duyệt phát hành đợt theo quy chế của xã |
| QT-12 | Cấu hình mô hình luồng tiền, tài khoản nhận chính thức, phương pháp định danh và phạm vi QR |

### 7.2. Danh mục đối tượng và hợp đồng — DM

| Mã | Chức năng |
|---|---|
| DM-01 | Thêm, sửa, xem đối tượng; gán địa bàn và nhóm giá |
| DM-02 | Import dữ liệu từ ba xã cũ theo lô |
| DM-03 | Chuẩn hóa mã đối tượng, địa chỉ và tên khoản |
| DM-04 | Phát hiện, so sánh và gộp bản ghi trùng |
| DM-05 | Ánh xạ địa chỉ cũ sang địa giới mới |
| DM-06 | Quản lý danh mục đối tượng thuộc diện miễn/giảm |
| DM-07 | Tìm kiếm và tra cứu đối tượng |
| DM-08 | Bản đồ đối tượng theo địa bàn — giai đoạn mở rộng |
| DM-09 | Quản lý danh sách đại diện/người thu hộ |
| DM-10 | Quản lý hợp đồng đối tượng–dịch vụ–biểu giá–kỳ hiệu lực |
| DM-11 | Phân loại `attributeType`, gán đơn vị/tuyến và quản lý trạng thái dịch vụ theo thời gian hiệu lực |

### 7.3. Biểu giá và định mức — BG

| Mã | Chức năng |
|---|---|
| BG-01 | Tạo phiên bản biểu giá theo văn bản pháp lý, nhóm đối tượng và địa bàn |
| BG-02 | Quản lý kỳ/đợt thu |
| BG-03 | Áp dụng giá theo thời kỳ và giữ nguyên lịch sử kỳ cũ |
| BG-04 | Hỗ trợ phương pháp cố định, theo khối lượng hoặc theo thể tích |
| BG-05 | Kiểm tra chồng lấn hiệu lực và thiếu cấu hình giá |
| BG-06 | Mô phỏng/kiểm tra số tiền trước khi phát hành đợt |

### 7.4. Khoản phải thu và hóa đơn — HD

| Mã | Chức năng |
|---|---|
| HD-01 | Sinh khoản phải thu hàng loạt từ hợp đồng theo kỳ/địa bàn |
| HD-02 | Kiểm tra và phát hành đợt; ghi log người chịu trách nhiệm |
| HD-03 | Tạo khoản thu lẻ cho đối tượng mới hoặc ngoài đợt |
| HD-04 | Lập đề nghị điều chỉnh/hủy hóa đơn và chuyển lãnh đạo duyệt |
| HD-05 | Cấp mã định danh và VietQR cho từng khoản |
| HD-06 | Tra cứu vòng đời khoản, hóa đơn, thanh toán và chứng từ |

### 7.5. Thu tiền và chứng từ — TH

| Mã | Chức năng |
|---|---|
| TH-01 | Quản lý khu vực/tổ dân phố; gán một công ty vừa thu gom vừa thu tiền theo hiệu lực; công ty tự phân công nhân viên nội bộ |
| TH-02 | Màn hình thu hiển thị hồ sơ, khoản và công nợ ở chế độ khóa |
| TH-03 | Người dân tự quét QR và chuyển khoản — giai đoạn sau |
| TH-04 | Nhân viên công ty đưa QR đúng khoản để dân chuyển tại chỗ — giai đoạn sau |
| TH-05 | Công ty nhận tiền mặt hoặc chuyển khoản của hộ trong phạm vi quản lý của công ty |
| TH-06 | Công ty ghi nhận tiền mặt đã thu và bàn giao nội bộ; dữ liệu này không tự tạo dòng tiền vào tài khoản xã |
| TH-07 | Import/API sao kê tài khoản xã và khớp khoản phần xử lý theo công ty–kỳ |
| TH-08 | Xử lý dòng treo bằng gán tay, xác minh hoặc hoàn |
| TH-09 | Công ty phát biên lai cho hộ; hệ thống tiếp nhận bảng kê/tham chiếu sau khi chuẩn dữ liệu được chốt |
| TH-10 | In/gửi chứng từ qua kênh được cấu hình; hỗ trợ máy in nhiệt nếu triển khai |
| TH-11 | Chống ghi nhận trùng và xử lý idempotency |
| TH-12 | In giấy báo cho trường hợp vắng nhà |
| TH-13 | Ghi nhận người đóng thay nhưng giữ nghĩa vụ và chứng từ ở chủ đối tượng |
| TH-14 | Chốt ca tiền mặt và bàn giao nội bộ trong công ty; không tự tạo thực nộp về xã |
| TH-15 | Công ty/nhân viên nhập kết quả thu từng hộ trên web hoặc theo lô Excel qua vùng kiểm tra |
| TH-16 | Quản lý phiên bản QR tài khoản pháp nhân công ty — giai đoạn sau |
| TH-17 | Khóa thu/QR với hộ đã tạm ngưng hoặc chấm dứt; chuyển phát sinh mới sang ngoại lệ |
| TH-18 | Một khu vực có tối đa một công ty phụ trách đồng thời thu gom và thu tiền trong cùng khoảng hiệu lực; thay công ty tạo assignment mới và giữ lịch sử |

**Quy tắc luồng tiền hiện hành:** tiền hộ do công ty trực tiếp thu và quản lý; phần xử lý là nghĩa vụ riêng công ty nộp về tài khoản xã. Kê khai của công ty chỉ là một nguồn đối chiếu; kế toán xác nhận thực nộp bằng sao kê tài khoản xã. QR hộ dân là phạm vi sau, không được dùng để giả định tiền hộ đi thẳng vào xã.

### 7.6. Công nợ và quyết định tài chính — CN

| Mã | Chức năng |
|---|---|
| CN-01 | Theo dõi nợ theo đối tượng, địa bàn, kỳ và tuổi nợ |
| CN-02 | Xử lý nộp một phần, nộp thừa và số dư tạm ứng |
| CN-03 | Kế thừa nợ từ địa bàn cũ và lưu nguồn gốc |
| CN-04 | Lập, kiểm tra và duyệt miễn/giảm |
| CN-05 | Nhắc nợ theo số ngày quá hạn và lưu lịch sử liên hệ |
| CN-06 | Lập, duyệt và thực hiện hoàn tiền |
| CN-07 | Lập và duyệt xóa nợ có căn cứ; không xóa vật lý |
| CN-08 | Lập và duyệt tạm ngưng dịch vụ; không tự động cắt chỉ vì hộ có công nợ |

### 7.7. Báo cáo và đối soát — BC

| Mã | Chức năng |
|---|---|
| BC-01 | Dashboard thu, nợ và tỷ lệ nộp theo địa bàn |
| BC-02 | Báo cáo thu theo kỳ, địa bàn, người thu và hình thức |
| BC-03 | Báo cáo tuổi nợ 30/60/90 ngày |
| BC-04 | Bảng kê biên lai/HĐĐT đã phát hành |
| BC-05 | Báo cáo miễn giảm |
| BC-06 | Báo cáo tiến độ đợt thu |
| BC-07 | Đối soát phần xử lý theo công ty: số hộ đủ điều kiện × đơn giá so với tiền thực nộp về xã |
| BC-08 | Xuất hoặc liên thông dữ liệu KBNN — giai đoạn mở rộng |
| BC-09 | Cảnh báo lệch, sai phạm và theo dõi xử lý |
| BC-10 | Xuất Excel/PDF và báo cáo định kỳ |
| BC-11 | Theo dõi kê khai công ty và sao kê phần xử lý về xã; tiền mặt của nhân viên là nghiệp vụ nội bộ công ty |
| BC-12 | Báo cáo nợ đã xóa và miễn giảm kèm căn cứ/phê duyệt |
| BC-13 | Công nợ hai mức: xã tổng hợp theo công ty/khu vực; công ty và nhân viên mở xuống từng hộ trong phạm vi |
| BC-14 | Báo cáo lãnh đạo về tài chính thu–chi, hiệu quả đơn vị thu, tỷ lệ thành công và thu ngoài hệ thống |

---

## 8. Luồng vận hành đầu-cuối

### 8.1. Chuỗi phát sinh nghĩa vụ

```text
Đối tượng
   ↓
Hợp đồng dịch vụ đang hiệu lực
   ↓
Biểu giá/định mức đúng địa bàn và thời kỳ
   ↓
Khoản phải thu của kỳ
   ↓
Mã thanh toán + VietQR
   ↓
Hóa đơn/thông báo khoản phải thu
```

### 8.2. Luồng thu và đối soát

1. Cán bộ mở kỳ và chạy kiểm tra dữ liệu đầu vào.
2. Hệ thống sinh hàng loạt khoản phải thu từ hợp đồng.
3. Khoản lỗi bị giữ lại; khoản hợp lệ được đưa vào đợt phát hành.
4. Cán bộ chịu trách nhiệm phát hành đợt; bước lãnh đạo duyệt đợt chỉ bật nếu quy chế yêu cầu.
5. Cán bộ xã phân công một công ty cho từng khu vực; công ty tự tổ chức danh sách nhân viên đi thu nội bộ.
6. Người dân nhận thông báo kèm mã thanh toán/QR.
7. Công ty trực tiếp thu tiền hộ, cập nhật kết quả và phát biên lai; QR thu online chưa triển khai trong phạm vi hiện tại.
8. Hệ thống xác định số hộ đủ điều kiện theo phân công đã xác minh và áp đơn giá xử lý có hiệu lực để tính nghĩa vụ công ty.
9. Công ty nộp phần xử lý về tài khoản xã và kê khai kỳ, số tiền, mã giao dịch, chứng từ.
10. Kế toán nhập/đồng bộ sao kê tài khoản xã, khớp giao dịch với công ty và kỳ; dòng thiếu mã chuyển hàng chờ xác minh.
11. Kế toán đối soát phải nộp với thực nộp theo từng công ty; thiếu nguồn thì chặn kết luận.
12. Kế toán lập báo cáo; lãnh đạo xác nhận hoặc yêu cầu chỉnh sửa.
13. Sau khi báo cáo được xác nhận và đủ điều kiện, kế toán chốt kỳ/khóa sổ.

### 8.3. Nguyên tắc truy vết chứng từ

Mục tiêu là truy được chuỗi:

```text
Đối tượng → Hợp đồng → Khoản phải thu → Mã thanh toán
→ Dòng tiền → Phân bổ thanh toán → Biên lai/HĐĐT → Đối soát
```

Không nên ép quan hệ vật lý “một khoản chỉ có đúng một lần thanh toán” vì có trường hợp nộp một phần. Thay vào đó, mỗi lần tiền vào là một chứng từ thanh toán độc lập; tổng các phân bổ hợp lệ tạo nên số đã thu của khoản.

---

## 9. Quy tắc nghiệp vụ chi tiết

### BR-01. Phiên bản biểu giá

- Mỗi phiên bản có căn cứ pháp lý, khu vực, nhóm đối tượng, phương pháp tính, VAT và thời gian hiệu lực.
- Không cho hai biểu giá cùng loại chồng lấn hiệu lực trên cùng phạm vi.
- Giá của khoản đã phát hành được chụp lại thành snapshot; thay đổi biểu giá tương lai không làm đổi kỳ cũ.

### BR-02. Sinh khoản theo hợp đồng

- Chỉ hợp đồng đang hiệu lực mới sinh khoản.
- Một đối tượng không được sinh trùng cùng loại khoản trong cùng kỳ, trừ nghiệp vụ điều chỉnh có liên kết khoản gốc.
- Khoản lỗi không được phát hành và phải nêu rõ lý do.

### BR-03. Khoản thu lẻ

- Đối tượng phải tồn tại và có mã trước khi tạo khoản lẻ.
- Khoản lẻ dùng chung bộ sinh mã, namespace địa bàn/kỳ và biểu giá với khoản hàng loạt.
- Phải lưu cờ `isAdHoc`, người tạo, lý do và liên kết công nợ liên quan.

### BR-04. Mã thanh toán và QR

- Mỗi khoản có mã duy nhất và không tái sử dụng.
- QR điền sẵn tài khoản nhận, số tiền và nội dung có cấu trúc.
- Nếu ngân hàng hỗ trợ, ưu tiên tài khoản định danh ảo để giảm dòng treo.
- Mọi lần tạo lại QR phải giữ cùng định danh khoản hoặc lưu lịch sử phiên bản.

### BR-05. Thu ngoài hiện trường

- Người thu chỉ chọn trong danh sách được phân công.
- Tên, mã đối tượng, giá và số nợ là trường khóa.
- Người thu được gọi điện, đưa QR, ghi người đóng thay, đánh dấu tiền mặt chờ nộp hoặc in giấy báo.
- Sửa hồ sơ hộ phải tạo yêu cầu thay đổi gửi cán bộ, không sửa trực tiếp.

### BR-06. Tiền mặt chờ nộp

- Ghi nhận tiền mặt phải có người thu, thời gian, số tiền, khoản liên quan và hạn nộp.
- Không tự chuyển khoản sang “đã thanh toán” chỉ dựa trên lời xác nhận của người thu.
- Khi sao kê có dòng phù hợp, hệ thống liên kết và đóng trạng thái chờ nộp.
- Quá hạn hoặc chênh lệch phải tạo cảnh báo cho kế toán và quản lý.

### BR-07. Khớp sao kê

- Ưu tiên khớp bằng mã định danh/tài khoản ảo.
- Kiểm tra đồng thời mã, số tiền, tài khoản nhận và giao dịch trùng.
- Dòng không đủ độ tin cậy ở trạng thái treo, không tự gán.
- Gán tay phải lưu người xử lý, lý do và bằng chứng.

### BR-08. Nộp đủ, thiếu và thừa

- Nộp đủ: đóng khoản và phát hành chứng từ theo chính sách.
- Nộp thiếu: trạng thái “thu một phần”; phần còn lại tiếp tục là công nợ.
- Nộp thừa: ưu tiên phân bổ vào khoản đang mở theo quy tắc được phê duyệt; phần dư thành tạm ứng hoặc hồ sơ hoàn.
- Thu trùng không sinh biên lai thứ hai cho cùng phân bổ; phải chuyển xử lý thừa/hoàn.

### BR-09. Người đóng thay

- Khoản, công nợ và chứng từ vẫn thuộc chủ đối tượng.
- Lưu tối thiểu họ tên và thông tin liên hệ người đóng thay theo chính sách bảo vệ dữ liệu.
- Không bắt buộc thu CCCD nếu không có căn cứ và mục đích nghiệp vụ rõ ràng.

### BR-10. Miễn giảm

- Miễn/giảm là thay đổi nghĩa vụ theo chính sách, khác với xóa nợ.
- Cán bộ lập đề nghị kèm loại đối tượng, căn cứ và minh chứng.
- Lãnh đạo hoặc cấp có thẩm quyền duyệt/từ chối.
- Kế toán chỉ áp dụng sau khi đã duyệt.

### BR-11. Hoàn tiền

- Mỗi hồ sơ hoàn phải liên kết giao dịch/chứng từ gốc.
- Luồng: đề nghị → kiểm tra → duyệt → điều chỉnh chứng từ → hoàn → xác nhận → audit.
- Người đề nghị không được tự duyệt.

### BR-12. Xóa nợ

- Chỉ thực hiện khi có căn cứ theo quy chế và hồ sơ chứng minh.
- Cán bộ chỉ được đề nghị; người có thẩm quyền duyệt.
- Không xóa bản ghi; chuyển trạng thái và lưu đầy đủ lý do, bằng chứng, người đề nghị, người duyệt, thời gian.
- Nợ đã xóa không tính vào số phải thu hiện hành nhưng vẫn xuất hiện trong báo cáo kiểm toán.

### BR-13. Phê duyệt

- Hệ thống tự kiểm tra khoản theo quy tắc trước khi con người phê duyệt.
- Đợt hàng loạt được cán bộ phụ trách xác nhận một lần; không ký từng khoản.
- Quyết định định đoạt tiền bắt buộc lãnh đạo/cấp có thẩm quyền duyệt: miễn giảm, hoàn, xóa nợ, hủy/điều chỉnh hóa đơn và khóa kỳ.
- Quy tắc yêu cầu lãnh đạo duyệt phát hành cả đợt là cấu hình theo quy chế xã.

### BR-14. Khóa kỳ

- Chỉ khóa khi các điều kiện bắt buộc đã đạt: không còn lỗi phát hành nghiêm trọng, chênh lệch bắt buộc đã xử lý và báo cáo đã xác nhận.
- Sau khóa không sửa trực tiếp khoản, thanh toán hoặc chứng từ.
- Mở lại kỳ cần quyền đặc biệt, lý do, phê duyệt và audit.

### BR-15. Tính theo khối lượng/thể tích

- Chuẩn bị sẵn phương pháp: cố định, theo kg hoặc theo thể tích/bao bì định lượng.
- Lưu phương pháp đo, đơn vị, số đo, người ghi nhận và bằng chứng nếu cần.
- Chỉ kích hoạt khi có quy định và quy trình đo được phê duyệt.

### BR-16. Xác minh danh sách hộ trước khi dùng cho nghiệp vụ

- Xã là data owner của danh sách đối tượng gốc nhưng hiện chưa có CSDL hộ chuẩn; file của từng công ty chỉ là nguồn khai báo.
- Mỗi dòng nguồn phải giữ `sourceUnitId`, tệp và số dòng; không tự gộp, tự loại hoặc tự xác nhận công ty phục vụ.
- Trình tự mục tiêu: tiếp nhận nguồn → ghép cột → kiểm tra → xác minh → cấp mã hộ → gán `attributeType` và khu vực → áp `AreaAssignment` → đưa vào phạm vi công ty.
- `attributeType`, khu vực, công ty và trạng thái dịch vụ có thời gian hiệu lực; thay đổi mới không ghi đè lịch sử cũ.
- Công ty có tài khoản và chỉ được gửi/xem yêu cầu bổ sung dữ liệu thuộc công ty mình; quyền duyệt danh sách chuẩn vẫn là điểm phải xác nhận.
- Phân công của xã dừng ở công ty/khu vực và đầu mối. Công ty tự tổ chức người đi thu trong nội bộ.

### BR-17. Nhập kết quả thu qua web hoặc Excel

- Nhập web và Excel dùng chung dịch vụ kiểm tra và cùng mô hình dữ liệu đầu ra.
- Excel được tải vào vùng tạm, không cập nhật trực tiếp công nợ.
- Mỗi dòng phải có khóa hộ–kỳ–dịch vụ, mã khoản, kết quả, thời điểm, người thu; mã giao dịch bắt buộc khi khai báo đã thu qua chuyển khoản.
- Hệ thống chặn dòng sai phạm vi đơn vị/tuyến, trùng mã giao dịch, sai số tiền, không có khoản hoặc hộ đã chấm dứt.
- Người nhập nhận báo cáo gồm tổng dòng, chấp nhận, cảnh báo và bị chặn; chỉ dòng hợp lệ mới được ghi nhận.
- Lô nhập phải có mã, tệp nguồn, checksum, người nhập và audit để chống nhập lại cùng tệp.

### BR-18. Khóa liên kết hộ–kỳ–dịch vụ

- Khóa nghiệp vụ tối thiểu là `householdId + periodId + serviceType`; có thể bổ sung `contractId` khi một hộ có nhiều hợp đồng cùng loại.
- Trong cùng khóa có tối đa một dòng khoản phải thu gốc đang hiệu lực.
- Dòng phải thu và dòng đã thu không ghi đè nhau: khoản phải thu giữ số ghi nợ; mỗi thanh toán/phân bổ là một dòng ghi có liên kết khoản.
- Số còn lại được tính từ khoản phải thu, tổng phân bổ hợp lệ và điều chỉnh đã duyệt.
- Một khoản có thể có nhiều dòng đã thu khi nộp một phần; một dòng tiền chỉ được phân bổ một lần trên cùng giá trị.

### BR-19. Theo dõi tiến độ theo công ty

- Xã theo dõi tiến độ thu tiền theo công ty, khu vực và kỳ; không hiển thị hoặc điều hành chi tiết nhân viên thu trên màn xã.
- Công ty quản lý chi tiết từng hộ và nhân viên trong phạm vi đã được xã xác minh/phân công.
- Khi tiến độ thấp hoặc chậm cập nhật, xã gửi thông báo cho đầu mối công ty; công ty tự đôn đốc nội bộ.
- Xã không sửa kết quả từng hộ thay công ty; công ty không sửa danh sách gốc, đơn giá hoặc phân công khu vực của xã.
- Chuyển khu vực sang công ty mới không làm mất lịch sử; phải xác định trách nhiệm dữ liệu và công nợ cũ trong biên bản bàn giao.

### BR-19A. Quản lý khu vực và phân công công ty

- Khu vực/tổ dân phố là dữ liệu nền do xã quản lý; một khu vực có thể gồm nhiều đường và nhiều hộ, không đồng nhất với một tuyến đường.
- Một khu vực tại một thời điểm có tối đa một công ty chịu trách nhiệm cả thu gom và thu tiền.
- Khi Công ty B thay Công ty A, không cập nhật đè hoặc xóa assignment của A. Hệ thống kết thúc hiệu lực A trước ngày bắt đầu B, tạo assignment mới, kiểm tra chồng lấn và bắt buộc ghi nội dung bàn giao.
- Dữ liệu Excel do công ty gửi không tự tạo assignment. Khu vực chưa rõ công ty giữ `unitId = null` và trạng thái chờ xác minh.
- Bản đồ/sơ đồ chỉ dùng để quan sát vị trí tương đối; prototype không gọi dịch vụ bản đồ, không định vị thời gian thực và không thay thế GIS chính thức.
- Phân công nhân viên thu là luồng nội bộ công ty, không phải trường trên màn quản lý khu vực của xã.

### BR-20. Chấm dứt dịch vụ và ngăn thu ngoài hệ thống

- Công nợ nhiều kỳ chỉ tạo cảnh báo, không phải điều kiện tự động tạm ngưng hoặc chấm dứt dịch vụ.
- Khi hộ đề nghị ngưng, luồng bắt buộc là: ghi nhận công nợ → cảnh báo → lập hồ sơ tạm ngưng → người có thẩm quyền duyệt → thông báo nhà thầu → áp dụng từ ngày hiệu lực.
- Hồ sơ tạm ngưng/chấm dứt có ngày hiệu lực, lý do, căn cứ, người duyệt và lịch sử thông báo cho đơn vị thu.
- Từ ngày hiệu lực, hộ bị loại khỏi danh sách thu mới; QR của khoản chưa hợp lệ bị khóa; không cho nhập web/Excel trạng thái “đã thu”.
- Nếu đơn vị vẫn khai báo cung cấp dịch vụ hoặc thu tiền, hệ thống không đưa vào số đã thu mà tạo `OffSystemCollectionCase`.
- Ngoại lệ phải đối chiếu bốn nguồn: trạng thái hợp đồng, nhật ký dịch vụ, dữ liệu người thu và dòng tiền/chứng từ.
- Hướng xử lý gồm: xác nhận dữ liệu chấm dứt sai và khôi phục có phê duyệt; yêu cầu đơn vị hoàn; điều chỉnh phân công; hoặc xử lý vi phạm theo quy chế.
- Dashboard xã/lãnh đạo phải có chỉ số số hộ và số tiền “thu ngoài hệ thống”.

### BR-21. Tài khoản nhận và phiên bản QR

- QR phải gắn một khoản hoặc bảng kê có mã truy vết; không dùng QR chung thiếu mã định danh.
- Người đi thu có thể hiển thị hoặc gửi cập nhật phiên bản QR đang dùng, nhưng không được tự đổi chủ tài khoản nhận.
- Mỗi phiên bản QR lưu tài khoản nhận, chủ tài khoản, mẫu nội dung, đơn vị/tuyến, ngày hiệu lực, người cập nhật, người duyệt và phiên bản trước.
- Chỉ tài khoản chính thức của xã hoặc pháp nhân được ủy quyền mới được đưa vào phương án mục tiêu sau khi xác nhận thẩm quyền.
- Tài khoản cá nhân của người quản lý **không được chọn làm thiết kế mục tiêu** vì khó phân định tiền cá nhân và tiền nghiệp vụ, khó bàn giao và khớp sổ.
- Nếu tiền về tài khoản xã, cần mã khoản/virtual account để truy vết; nếu tiền về tài khoản chính thức của đơn vị thu, cần bảng kê, hạn nộp và đối soát nhiều bước.
- Quyết định cuối về chủ tài khoản, quyền sở hữu dòng tiền và chu kỳ đối soát là **Cần BA/kế toán/lãnh đạo xác nhận**.

---

## 10. Mô hình dữ liệu khái niệm

| Thực thể | Thuộc tính chính | Quan hệ/ghi chú |
|---|---|---|
| AdministrativeArea | Mã, tên, cấp, địa giới cũ/mới, trạng thái | Phân vùng dữ liệu và biểu giá |
| ServiceSubject | Mã, `attributeType`, tên, địa chỉ, liên hệ, trạng thái | Do xã quản lý; có hợp đồng, khoản và lịch sử địa bàn |
| CollectionCompany | Mã, tên pháp nhân, đầu mối quản lý, điện thoại, trạng thái, tài khoản hệ thống | Một trong 11 công ty; tài khoản bị giới hạn theo `unitId` |
| AreaAssignment | Khu vực, công ty thu gom và thu tiền, hiệu lực, trạng thái, phân công trước | Tối đa một công ty cùng hiệu lực; đổi công ty tạo bản ghi mới và bàn giao |
| ServiceAssignment | Đối tượng, khu vực, công ty phụ trách, trạng thái dịch vụ, hiệu lực | Chỉ tạo sau xác minh; không suy ra từ `sourceUnitId` của file Excel |
| ServiceContract | Mã, đối tượng, dịch vụ, đơn vị cung cấp, hiệu lực | Sinh khoản phải thu |
| Collector | Người dùng nội bộ công ty, thông tin liên hệ, trạng thái | Công ty tự phân công; xã chỉ làm việc với đầu mối công ty |
| InternalWorkAssignment | Công ty, kỳ/ca, nhân viên, đối tượng, hiệu lực | Giới hạn dữ liệu nhân viên trong phạm vi công ty; không phải phân công của xã |
| TariffVersion | Căn cứ pháp lý, địa bàn, nhóm, công thức, VAT, hiệu lực | Snapshot vào khoản |
| CollectionPeriod | Mã kỳ, mở/hạn/khóa, trạng thái | Chứa đợt và báo cáo |
| BillingBatch | Kỳ, phạm vi, người tạo/phát hành, trạng thái | Chứa khoản hàng loạt |
| Charge | Đối tượng, hợp đồng, kỳ, số phải thu, giá snapshot, trạng thái | Có QR và nhiều phân bổ tiền |
| PaymentCode | Mã, tài khoản/VA, nội dung, hiệu lực | Dùng khớp sao kê |
| PaymentAccount | Chủ tài khoản, pháp nhân, ngân hàng, phạm vi, hiệu lực, trạng thái duyệt | Không dùng tài khoản cá nhân làm mô hình mục tiêu |
| QrVersion | Mã phiên bản, khoản/tuyến, tài khoản, mẫu nội dung, hiệu lực, người cập nhật | QR người đi thu đang hiển thị |
| CashCollection | Người thu, khoản, số tiền, thời điểm, hạn nộp, trạng thái | Trạng thái tạm trước khi khớp tiền |
| BankTransaction | Ngân hàng, tài khoản, mã giao dịch, ngày, nội dung, số tiền | Có thể khớp hoặc treo |
| PaymentAllocation | Giao dịch, khoản, số phân bổ, người/rule gán | Hỗ trợ nộp thiếu/thừa |
| CollectionImportBatch | Mã lô, hình thức web/Excel, checksum, tuyến, người nhập, tổng/hợp lệ/bị chặn | Vùng kiểm tra kết quả do đơn vị thu nhập |
| CollectionResult | Khóa hộ–kỳ–dịch vụ, khoản, kết quả, thời điểm, người thu | Không ghi đè Charge hoặc PaymentAllocation |
| ReceiptInvoice | Loại, số/ký hiệu, khoản/phân bổ, trạng thái | Phát hành, điều chỉnh, hủy |
| ProcessingObligation | Công ty, kỳ, số hộ đủ điều kiện, phiên bản đơn giá, số phải nộp | Công thức phải truy nguyên về hộ và đơn giá có hiệu lực |
| ProcessingRemittance | Công ty, kỳ, số tiền kê khai, mã giao dịch, chứng từ, trạng thái khớp | Chỉ xác nhận thực nộp khi khớp sao kê tài khoản xã |
| Reconciliation | Kỳ, công ty, phải nộp, thực nộp, chênh lệch, trạng thái | Thiếu danh sách/đơn giá/sao kê thì bị chặn kết luận |
| ExceptionCase | Loại dòng treo/chênh lệch, hạn xử lý, trạng thái | Có giải trình và bằng chứng |
| OffSystemCollectionCase | Hộ, ngày chấm dứt, đơn vị/người thu, số tiền, dịch vụ thực tế, trạng thái | Thu/cung cấp sau chấm dứt; không tự ghi đã thu |
| OrganizationDebtSummary | Đơn vị, kỳ, phải thu, đã thu, còn lại, tỷ lệ thành công | Bản tổng hợp có thể truy nguyên về hộ/khoản |
| ExpenseRecord | Loại chi, kỳ, đơn vị, số tiền, căn cứ, phê duyệt | Chỉ dùng khi phạm vi báo cáo thu–chi được xác nhận |
| AdjustmentRequest | Miễn/giảm/hoàn/xóa nợ/hủy, lý do, số tiền, trạng thái | Có phê duyệt |
| ServiceSuspensionRequest | Hộ, công nợ, loại đề nghị, căn cứ, hiệu lực dự kiến, quyết định, trạng thái thông báo | Nợ không tự cắt dịch vụ; chỉ áp dụng sau phê duyệt |
| Approval | Đối tượng duyệt, người duyệt, quyết định, thời điểm | Tách người đề nghị và duyệt |
| Notification | Người nhận, kênh, mẫu, trạng thái gửi | Nhắc nợ/thông báo kỳ |
| Report | Loại, kỳ, phiên bản, người lập, trạng thái | Truy nguyên số liệu nguồn |
| User | Tài khoản, họ tên, đơn vị, trạng thái | Có một hoặc nhiều vai trò |
| RolePermission | Vai trò, chức năng, hành động, phạm vi | RBAC backend |
| AuditLog | Người, thời gian, hành động, trước/sau, thiết bị/IP | Bất biến với nghiệp vụ tài chính |
| ImportBatch | Tệp nguồn, nguồn dữ liệu, tổng/lỗi, trạng thái | Hợp nhất dữ liệu cũ |

### 10.1. Quan hệ quan trọng

- Một đối tượng có thể có nhiều hợp đồng theo thời gian nhưng không được chồng lấn trái quy tắc.
- Một hợp đồng sinh nhiều khoản theo kỳ.
- Một khoản có một mã thanh toán chính và có thể có nhiều lần thanh toán/phân bổ.
- Một dòng ngân hàng có thể phân bổ cho một hoặc nhiều khoản nếu quy chế cho phép; mọi phân bổ phải truy vết.
- Công ty có tài khoản hệ thống và chỉ xem dữ liệu có `unitId/sourceUnitId` thuộc công ty.
- Nhân viên thu chỉ xem các đối tượng công ty phân nội bộ trong phạm vi khu vực công ty đang được xã giao.
- Một khóa `householdId + periodId + serviceType` có một khoản phải thu gốc và có thể có nhiều dòng thanh toán/phân bổ.
- Mỗi lô web/Excel tạo các `CollectionResult`; chỉ kết quả vượt kiểm tra mới ảnh hưởng trạng thái thu/công nợ.
- Nghĩa vụ phần xử lý của công ty được tính từ số hộ đã xác minh và đơn giá có hiệu lực, không lấy trực tiếp tổng dòng Excel nguồn.
- Số thực nộp chỉ lấy từ giao dịch khớp trên sao kê tài khoản xã; số công ty kê khai không phải kết quả xác nhận.
- Một phiên bản QR chỉ tham chiếu tài khoản nhận đã được cấu hình và duyệt.
- Một hồ sơ điều chỉnh có thể ảnh hưởng nhiều khoản nhưng phải lưu chi tiết từng khoản.

---

## 11. Mô hình trạng thái

### 11.1. Đối tượng

`Chờ xác minh → Đang hoạt động → Tạm ngưng / Chuyển đi / Ngừng dịch vụ`

### 11.2. Hợp đồng

`Dự thảo → Chờ xác nhận → Đang hiệu lực → Tạm ngưng → Hết hiệu lực / Đã chấm dứt`

### 11.3. Kỳ thu

`Dự thảo → Đang phát hành → Đang thu → Chờ đối soát → Chờ chốt → Đã khóa`

### 11.4. Khoản phải thu

`Dự thảo → Đã phát hành → Chưa thu → Thu một phần → Đã thu`

Trạng thái bổ sung có kiểm soát: `Quá hạn`, `Được miễn/giảm`, `Đã điều chỉnh`, `Đã xóa nợ`.

### 11.5. Tiền mặt người thu

`Đã nhận → Chờ nộp → Đã nộp/chờ khớp → Đã khớp`

Ngoại lệ: `Quá hạn`, `Chênh lệch`, `Đã hủy có lý do`.

### 11.6. Dòng ngân hàng

`Mới nhận → Tự động khớp / Dòng treo → Đang xác minh → Đã gán / Đã hoàn`

### 11.7. Hồ sơ quyết định tài chính

`Dự thảo → Chờ kiểm tra → Chờ duyệt → Đã duyệt / Từ chối → Đã áp dụng`

### 11.8. Chứng từ

`Nháp → Đã phát hành → Đã gửi`

Ngoại lệ: `Đã điều chỉnh`, `Đã thay thế`, `Đã hủy`.

### 11.9. Trạng thái dịch vụ hộ

`Chờ phân loại → Đang cung cấp → Tạm ngưng / Đã chấm dứt`

Khôi phục dịch vụ phải tạo một thời đoạn hiệu lực mới; không xóa trạng thái chấm dứt trong lịch sử.

### 11.10. Lô nhập kết quả thu

`Đã tải lên → Đang kiểm tra → Có lỗi / Sẵn sàng ghi → Đã ghi nhận`

Từng dòng: `Hợp lệ / Cảnh báo / Bị chặn`; chỉ dòng hợp lệ hoặc cảnh báo đã được xác nhận mới ghi vào kết quả thu.

### 11.11. Ngoại lệ thu ngoài hệ thống

`Mới phát hiện → Chờ đơn vị giải trình → Đang xác minh → Chờ quyết định → Đã xử lý`

---

## 12. Phân bổ màn hình

Ứng dụng mục tiêu có tám khu vực nghiệp vụ. Menu và dữ liệu hiển thị theo quyền.

| Khu vực | Màn hình/chức năng | Vai trò chính | Mobile |
|---|---|---|---|
| Trang chủ | Tổng quan thu–nợ, tỷ lệ theo địa bàn, cảnh báo | Lãnh đạo; các vai có dashboard riêng | Rút gọn |
| Đối tượng | Danh sách gốc do xã tạo, chi tiết, `attributeType`, phân loại, đơn vị/tuyến, trạng thái dịch vụ, import, chống trùng, hợp đồng | Cán bộ, QT; đơn vị chỉ xem phạm vi | Tra cứu |
| Biểu giá & kỳ | Phiên bản giá, định mức, kỳ/đợt, mô phỏng giá | QT, cán bộ theo quyền | Không ưu tiên |
| Khoản & hóa đơn | Sinh đợt, danh sách khoản, ánh xạ hộ–kỳ–dịch vụ, dòng phải thu/dòng đã thu, khoản lẻ, điều chỉnh | Cán bộ; kế toán tra cứu | Không ưu tiên |
| Thu tiền & chứng từ | Bản đồ tuyến có sẵn, gán 11 công ty/đầu mối, giao người đi thu, danh sách đi thu, nhập web/Excel, QR có phiên bản, tiền mặt chờ nộp, sao kê, dòng treo, biên lai/HĐĐT | Người đi thu, cán bộ, kế toán theo quyền | Người đi thu: bắt buộc; kế toán: tra cứu hạn chế |
| Công nợ | Xã xem tiến độ theo người/tuyến và đốc thúc đầu mối; người đi thu xem chi tiết theo hộ; tuổi nợ, nhắc nợ, miễn giảm, hoàn, xóa nợ | Cán bộ, người đi thu, kế toán, lãnh đạo | Danh sách hộ theo tuyến |
| Báo cáo & đối soát | Thu–chi, đơn vị thu, tỷ lệ thành công, tiền mặt, thu ngoài hệ thống, cảnh báo | Kế toán, lãnh đạo | Dashboard |
| Quản trị | Người dùng, quyền, địa bàn, biểu giá, luồng tiền/QR, kết nối, nhật ký, sao lưu | QT | Không ưu tiên |

### 12.1. Màn hình của người đi thu

Luồng ưu tiên:

```text
Đăng nhập → Tuyến được giao → Danh sách hộ
→ Nhập trên web hoặc Excel → Kiểm tra trạng thái dịch vụ
→ Chi tiết khoản → QR/tiền mặt chờ nộp
→ Giấy báo/biên lai → Chốt ca
```

CTA chính:

- Đưa QR cho dân.
- Cập nhật phiên bản QR đang hiển thị trong phạm vi được duyệt.
- Nhập kết quả từng hộ trên web hoặc nhập Excel theo mẫu.
- Tiền mặt → chuyển khoản thay.
- Đánh dấu đã thu, chờ nộp.
- In giấy báo khi vắng nhà.
- Gọi điện.
- Kết thúc/chốt ca.

Người thu không có menu báo cáo toàn xã, chỉnh sửa biểu giá hoặc chỉnh sửa hồ sơ đối tượng. Hộ đã chấm dứt không có CTA thu/QR; chỉ có nút mở ngoại lệ hoặc gửi yêu cầu xác minh.

Hai màn hình hiện trường bắt buộc responsive:

- **Tuyến được giao:** desktop hiển thị lưới hai cột, mobile một cột; có tìm theo tên/mã/địa chỉ và lọc chưa thu, quá hạn, vắng nhà, đã thu, đã chấm dứt.
- **Hộ còn công nợ:** cùng cơ chế responsive; có lọc quá hạn, đã hẹn, vắng nhà, chưa tiếp cận; mỗi thẻ chỉ hiển thị mã/tên, tuyến, địa chỉ, liên hệ, số kỳ, số tiền, hạn/lần hẹn và thao tác thu–gọi–hẹn lại.

### 12.2. Màn hình phân tuyến và tiến độ của cán bộ xã

- Trang tổng là danh sách khu vực/tổ dân phố; mỗi dòng có số hộ, một công ty thu gom và thu tiền, hiệu lực, trạng thái và thao tác phân công/sửa.
- Bộ lọc chính gồm từ khóa, công ty phụ trách và trạng thái. Một công ty có thể phụ trách nhiều khu vực.
- Popup phân công chỉ chọn một công ty và khoảng hiệu lực. Giao chồng lấn bị chặn; thay công ty bắt buộc bàn giao và giữ lịch sử.
- Bấm tên khu vực mở chi tiết gồm công ty/đầu mối, sơ đồ giản lược, danh sách hộ và lịch sử phân công.
- Dữ liệu công ty gửi không tự động gán công ty cho khu vực hoặc hộ.
- Trang tiến độ tổng hợp theo công ty và khu vực. CTA chính là thông báo đầu mối công ty; không hiển thị hoặc giao việc cho nhân viên thu.

### 12.2A. Màn hình công ty và kế toán phần xử lý

- Công ty: tổng quan; hộ được giao; cập nhật kết quả thu bằng web/Excel; biên lai đã phát; nghĩa vụ phần xử lý; kê khai tiền đã nộp; dữ liệu đã cung cấp; yêu cầu bổ sung.
- Hộ chờ xác minh không có CTA ghi nhận thu. Không dùng file nguồn làm phạm vi vận hành.
- Màn nghĩa vụ phải hiển thị số hộ nguồn, số hộ đủ điều kiện, phiên bản đơn giá và số phải nộp; thiếu nguồn nào thì giữ “Chưa tính”.
- Kế toán: tổng quan; sao kê tiền xử lý về xã; khoản nộp chưa rõ; đối soát phần xử lý theo công ty; báo cáo; chốt/khóa sổ.
- Lãnh đạo chỉ xem/xác nhận báo cáo; không có màn hoặc nút khóa sổ.

### 12.3. Quy tắc form và popup

- Danh sách và dashboard là trang chính.
- Tác vụ ngắn như thu tiền, ghi người đóng thay, in giấy báo, giải trình hoặc xác nhận dùng modal/popup.
- Tác vụ nhiều bước như import, phát hành đợt, đối soát và cấu hình biểu giá dùng trang/wizard riêng.
- Form phải tự điền dữ liệu có sẵn; trường danh tính, kỳ, giá và công nợ bị khóa ở màn hình thu.
- Mọi popup có tiêu đề, mô tả hậu quả, nút hủy, nút xác nhận và trạng thái lỗi rõ ràng.

---

## 13. Báo cáo và chỉ số

### 13.1. Vận hành

- Số đối tượng đang hoạt động theo địa bàn/loại.
- Tiến độ phát hành và thu theo ngày, kỳ, tuyến, người thu.
- Danh sách tiền mặt đã nhận nhưng chưa nộp.
- Danh sách lỗi dữ liệu, hợp đồng thiếu giá và khoản bị giữ.
- Tình trạng phân công và hoàn thành tuyến.
- Lịch sử nhập kết quả bằng web/Excel, số dòng hợp lệ và bị chặn.
- Danh sách hộ tạm ngưng/chấm dứt và phát sinh thu ngoài hệ thống.

### 13.2. Tài chính và kiểm soát

- Số phải thu, đã thu, còn nợ và tỷ lệ thu.
- Thu chuyển khoản, tiền mặt chờ nộp và tiền đã khớp.
- Dòng treo và thời gian tồn tại.
- Nợ theo tuổi 30/60/90 ngày.
- Biên lai/HĐĐT phát hành, điều chỉnh và hủy.
- Miễn giảm, hoàn và xóa nợ kèm căn cứ.
- Chênh lệch theo người thu, đơn vị và kỳ.
- Công nợ tổng hợp theo người đi thu, tuyến và công ty chịu trách nhiệm; có thể truy nguyên về hộ/khoản nguồn theo quyền.
- Thu–chi theo nhóm nghiệp vụ; khoản chi chỉ ghi nhận khi có phạm vi, căn cứ và phê duyệt được xác nhận.

### 13.3. Dashboard lãnh đạo

- Tổng nghĩa vụ và số thực thu.
- Tổng hợp tài chính thu–chi và chênh lệch chưa xử lý.
- Danh sách đơn vị thu hộ, số hộ được giao/đã tiếp cận/đã thu hợp lệ.
- Tỷ lệ thành công theo công thức: số hộ đã thu hợp lệ chia số hộ đến hạn trong phạm vi.
- Tỷ lệ nộp theo địa bàn.
- Nợ quá hạn và biến động so với kỳ trước.
- Tiền mặt chờ nộp/quá hạn.
- Dòng treo và chênh lệch chưa xử lý.
- Hồ sơ tài chính chờ duyệt.
- Trạng thái sẵn sàng khóa kỳ.
- Số hộ/số tiền có dấu hiệu thu ngoài hệ thống sau chấm dứt.

Mỗi KPI phải có định nghĩa, công thức, nguồn dữ liệu, tần suất cập nhật và khả năng mở xuống dữ liệu chi tiết.

---

## 14. Tích hợp ngoài

| Tích hợp | Mục đích | Giai đoạn | Điểm cần xác nhận |
|---|---|---|---|
| VietQR | Tạo QR có mã thanh toán và số tiền | GĐ0/GĐ1 | Tài khoản nhận, cấu trúc mã, quyền sử dụng |
| Ngân hàng/sao kê | Nhận giao dịch và khớp tự động | GĐ1 | API hay import, tần suất, virtual account |
| Excel kết quả thu | Nhập lô dữ liệu người đi thu/đơn vị thu | GĐ0/GĐ1 | File mẫu, khóa hộ–kỳ–dịch vụ, giới hạn dung lượng và lỗi |
| HĐĐT | Phát hành/điều chỉnh/hủy chứng từ | GĐ1 | Nhà cung cấp, chính sách nộp một phần |
| SMS/Zalo | Gửi thông báo, nhắc nợ, chứng từ | GĐ1/GĐ2 | Mẫu, chi phí, đồng ý nhận tin |
| Máy in nhiệt | In giấy báo/chứng từ hiện trường | Tùy chọn | Thiết bị, Bluetooth, khổ giấy |
| KBNN | Xuất/liên thông hạch toán | Mở rộng | Mục lục ngân sách, định dạng, thẩm quyền |

Mọi tích hợp phải có timeout, retry có kiểm soát, idempotency, nhật ký kỹ thuật và quy trình xử lý khi hệ thống ngoài gián đoạn.

---

## 15. Yêu cầu phi chức năng

### 15.1. Bảo mật và quyền riêng tư

- Xác thực định danh; 2FA cho quản trị, kế toán và lãnh đạo.
- RBAC ở backend đến chức năng, hành động và phạm vi địa bàn/tuyến.
- Che một phần CCCD/SĐT theo vai trò.
- Mã hóa đường truyền và dữ liệu nhạy cảm phù hợp.
- Không lưu dữ liệu nhạy cảm lâu dài trên thiết bị người thu.
- Tự khóa phiên trên thiết bị mobile; có cơ chế thu hồi phiên khi mất máy/nghỉ việc.
- Ghi log việc xem, xuất và thay đổi dữ liệu nhạy cảm.
- Chính sách thu thập dữ liệu phải tuân thủ pháp luật bảo vệ dữ liệu cá nhân hiện hành; việc thu CCCD không được mặc định nếu không cần thiết.

### 15.2. Toàn vẹn và kiểm toán

- Mã đối tượng, mã khoản, mã giao dịch và số chứng từ có ràng buộc duy nhất phù hợp.
- API ghi nhận tài chính phải chống gửi trùng.
- Dữ liệu kỳ khóa không sửa trực tiếp.
- Audit tài chính không cho người dùng nghiệp vụ chỉnh sửa/xóa.
- Báo cáo truy nguyên được tới khoản và dòng tiền nguồn.

### 15.3. Hiệu năng và quy mô

- Hỗ trợ tối thiểu hàng chục nghìn đối tượng và dữ liệu nhiều năm.
- Danh sách phân trang/lọc phía máy chủ.
- Báo cáo lớn chạy nền và thông báo khi hoàn tất.
- Cần đo số người dùng đồng thời, số giao dịch cao điểm và kích thước sao kê trước khi chốt hạ tầng.

### 15.4. Khả dụng hiện trường

- Giao diện mobile ưu tiên nút lớn, ít nhập tay và thao tác một tay.
- Hiển thị trạng thái kết nối và trạng thái chưa đồng bộ.
- Nếu yêu cầu vận hành khi mất mạng, phải có hàng đợi offline, mã cục bộ và cơ chế chống gửi trùng khi đồng bộ lại.
- Chức năng offline là **Cần BA xác nhận**, không mặc định đã có trong giai đoạn đầu.

### 15.5. Sao lưu và phục hồi

- Sao lưu tự động theo chính sách vận hành.
- Kiểm thử phục hồi định kỳ.
- Xác định RPO, RTO, thời gian lưu dữ liệu và nhật ký trước nghiệm thu.

### 15.6. Khả năng tiếp cận và giao diện

- Không phân biệt trạng thái chỉ bằng màu.
- Form có nhãn, lỗi gắn đúng trường và hỗ trợ bàn phím.
- Tiếng Việt hiển thị đầy đủ.
- Màu chủ đạo xanh dương hành chính và xanh lá môi trường; đỏ chỉ dùng cho lỗi/chênh lệch nghiêm trọng.
- Desktop tối ưu cho cấu hình, dữ liệu lớn, sao kê và báo cáo; mobile tối ưu cho hiện trường.

---

## 16. Lộ trình triển khai

| Giai đoạn | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| GĐ0 — Nền tảng | Làm sạch/hợp nhất dữ liệu một địa bàn; dựng sáu phân hệ lõi | Dữ liệu mẫu sạch, mã không trùng, quyền và luồng cơ bản chạy được |
| GĐ1 — Chạy thử | Vận hành thật 1–2 kỳ tại địa bàn thí điểm | Dữ liệu khớp, dòng tiền đối soát được, cán bộ vận hành được, không có lỗi nghiêm trọng |
| GĐ2 — Cổng người dân | Tra cứu, nộp trực tuyến, nhận chứng từ | Có định danh, bảo mật, chính sách dữ liệu và hỗ trợ người dùng |
| GĐ3 — Nhân rộng | Nạp dữ liệu/cấu hình các địa bàn còn lại | Không phải xây lại lõi; có quy trình onboarding và kiểm soát chất lượng |
| Mở rộng | KBNN, GIS, tính giá theo khối lượng/thể tích, tích hợp nâng cao | Có văn bản, API và quy trình nghiệp vụ được duyệt |

---

## 17. Tiêu chí nghiệm thu nghiệp vụ mức cao

1. Import và chuẩn hóa được dữ liệu từ nhiều nguồn, có báo lỗi và chống trùng.
2. Hợp đồng hợp lệ sinh đúng khoản theo biểu giá/địa bàn/thời kỳ.
3. Không phát hành khoản khi thiếu giá hoặc dữ liệu bắt buộc.
4. Người thu chỉ xem và thao tác trên tuyến được giao.
5. Mỗi khoản có mã thanh toán/QR duy nhất.
6. Tiền mặt chờ nộp được theo dõi đến khi khớp dòng tiền.
7. Sao kê tự khớp khoản đủ điều kiện; dòng không rõ không tự động ghi nhận.
8. Nộp thiếu/thừa/trùng được xử lý mà không làm mất lịch sử.
9. Chứng từ chỉ phát hành theo trạng thái thanh toán hợp lệ.
10. Miễn giảm, hoàn, xóa nợ, hủy hóa đơn và khóa kỳ có phân tách người đề nghị–duyệt.
11. Kỳ khóa không sửa trực tiếp và báo cáo truy nguyên được dữ liệu nguồn.
12. Audit ghi đầy đủ thao tác quan trọng và không cho sửa bởi người dùng nghiệp vụ.

### 17.1. Kịch bản kiểm thử trọng yếu

| ID | Kịch bản | Kết quả mong đợi |
|---|---|---|
| TC-01 | Import có bản ghi lỗi/trùng | Bản ghi lỗi bị tách, nêu lý do; không âm thầm ghi đè |
| TC-02 | Sinh kỳ khi hợp đồng thiếu biểu giá | Chặn phát hành và liệt kê khoản lỗi |
| TC-03 | Người thu mở hộ ngoài tuyến | Từ chối truy cập và không lộ dữ liệu |
| TC-04 | Dân quét đúng QR, sao kê về đúng mã | Tự khớp, cập nhật khoản và sinh chứng từ theo chính sách |
| TC-05 | Người thu nhận tiền mặt | Tạo trạng thái chờ nộp, chưa tự coi là tiền ngân hàng đã về |
| TC-06 | Tiền mặt quá hạn chưa nộp | Cảnh báo kế toán/quản lý và xuất hiện trong đối soát |
| TC-07 | Sao kê thiếu/sai mã | Chuyển dòng treo, không tự gán |
| TC-08 | Giao dịch trùng | Không ghi nhận hai lần; chuyển xử lý ngoại lệ nếu cần |
| TC-09 | Nộp một phần | Khoản chuyển “thu một phần”, phần còn lại tiếp tục là nợ |
| TC-10 | Nộp thừa | Phân bổ/tạm ứng/hoàn theo quy tắc và giữ lịch sử |
| TC-11 | Cán bộ tự duyệt đề nghị của mình | Từ chối do vi phạm phân tách nhiệm vụ |
| TC-12 | Kế toán áp dụng hồ sơ chưa duyệt | Từ chối |
| TC-13 | Khóa kỳ còn chênh lệch bắt buộc | Chặn khóa và nêu điều kiện chưa đạt |
| TC-14 | Sửa khoản trong kỳ đã khóa | Từ chối và ghi audit |
| TC-15 | Thay đổi biểu giá tương lai | Không làm thay đổi khoản đã phát hành ở kỳ cũ |
| TC-16 | Xã tạo hộ mới nhưng chưa phân loại/gán tuyến | Chưa sinh khoản và không xuất hiện trong danh sách đi thu |
| TC-17 | Import Excel có hộ ngoài tuyến hoặc mã giao dịch trùng | Dòng bị chặn, không cập nhật công nợ; lô trả báo cáo lỗi |
| TC-18 | Nhập kết quả thu cho hộ đã chấm dứt | Chặn ghi “đã thu”, khóa QR và tạo ngoại lệ thu ngoài hệ thống |
| TC-19 | Một hộ có dòng phải thu và thanh toán một phần | Hai loại dòng giữ độc lập, số còn lại được tính đúng theo khóa hộ–kỳ–dịch vụ |
| TC-20 | Người đi thu đổi QR sang tài khoản chưa được duyệt | Từ chối, giữ QR phiên bản hiện tại và ghi audit lần thử |
| TC-21 | Xã xem tiến độ người đi thu theo tuyến | Hiển thị đúng tuyến, số hộ giao/đã ghé/đã thu/còn nợ, lần cập nhật và đầu mối quản lý |
| TC-22 | Công ty đăng nhập xem dữ liệu tiếp nhận | Chỉ xem dòng nguồn và yêu cầu bổ sung có `sourceUnitId` thuộc đơn vị của tài khoản; truy cập trực tiếp nguồn khác bị từ chối |
| TC-23 | Lọc tuyến được giao trên desktop và mobile | Danh sách lọc đúng theo từ khóa/trạng thái, không tràn ngang và CTA vẫn thao tác được |
| TC-24 | Lọc hộ công nợ theo “Quá hạn” | Chỉ còn hộ quá hạn; hiển thị đủ số kỳ, số tiền, hạn/lần hẹn và thông tin liên hệ |
| TC-25 | Chọn khu vực Đông Thạnh tại quản lý tuyến | Chỉ hiển thị các tuyến con của Đông Thạnh; bảng không có cột địa bàn hoặc người đi thu |
| TC-26 | Lọc theo một nhà thầu | Hiển thị nhiều tuyến thuộc cùng nhà thầu và số kết quả cập nhật đúng |
| TC-27 | Bấm mã DTH-T07 | Mở chi tiết tuyến, giữ menu “Quản lý tuyến” được chọn, hiển thị bản đồ một tuyến và danh sách hộ/chủ nguồn thải |
| TC-28 | Hộ nợ 3 kỳ gửi yêu cầu ngưng dịch vụ | Dịch vụ vẫn hoạt động; tạo hồ sơ chờ duyệt, chỉ khóa sau quyết định và gửi thông báo nhà thầu |
| TC-29 | Công ty B thay Công ty A trên DTH-T07 | Assignment A được kết thúc, assignment B được tạo mới, không chồng lấn và vẫn tra cứu được lịch sử A |
| TC-30 | Nhà thầu mới chỉ được giao thực hiện/thu | Giữ hợp đồng hiện tại và chỉ tạo assignment mới |
| TC-31 | Lọc “Tuyến thu gom” | Chỉ hiển thị bản ghi `routeType=COLLECTION`; không làm thay đổi tuyến thu tiền đã liên kết |

Các TC-21, TC-25, TC-26, TC-27, TC-29 và TC-31 ở trên thuộc lịch sử thiết kế tuyến 2.4, không còn là tiêu chí nghiệm thu giao diện hiện hành. Bộ TC hiện hành bổ sung:

| ID | Kịch bản 2.9 | Kết quả mong đợi |
|---|---|---|
| TC-32 | Công ty mở “Hộ được giao” | Chỉ hộ đã xác minh/phân công mới có CTA cập nhật; hộ chờ xác minh bị khóa |
| TC-33 | Công ty xem nghĩa vụ khi chưa có đơn giá | Hiển thị công thức và “Chưa tính”; không tự đặt số tiền |
| TC-34 | Công ty kê khai tiền phần xử lý | Popup có kỳ, tài khoản pháp nhân, số tiền, mã giao dịch, ngày và chứng từ; chưa tự chuyển “đã xác nhận” |
| TC-35 | Kế toán mở đối soát khi thiếu một trong ba nguồn | Không kết luận chênh lệch; trạng thái “Bị chặn” và nêu rõ nguồn thiếu |
| TC-36 | Lãnh đạo mở menu | Có xác nhận báo cáo nhưng không có màn/nút khóa sổ |
| TC-37 | Kế toán mở khóa sổ | Chặn khi danh sách hộ, đơn giá, sao kê hoặc xác nhận báo cáo chưa đủ |

---

## 18. Lịch sử prototype sau họp 12/09/2026 và làm rõ 14/09/2026

Phần này lưu lại trạng thái yêu cầu ở phiên bản 2.4 để truy vết thay đổi. Những dòng mâu thuẫn với mục “Cập nhật hiện hành 2.7” không còn là yêu cầu đang áp dụng. Prototype hiện hành nằm tại `outputs/prototype-v2`, sử dụng HTML/CSS/JavaScript thuần.

| Nội dung họp | Thay đổi trong prototype-v2 |
|---|---|
| Xã tạo danh sách hộ trước | Trang “Đối tượng, phân loại và hợp đồng” hiển thị mã hộ, `attributeType`, trạng thái dịch vụ, đơn vị và tuyến |
| Phân loại/phân tuyến | Bổ sung popup “Phân loại và gán tuyến xử lý rác” theo đúng trình tự dữ liệu |
| QR do người đi thu cập nhật/hiển thị | Bổ sung nút “Cập nhật QR”, mã phiên bản QR và khóa không cho tự đổi chủ tài khoản |
| Nhập bằng web hoặc Excel | Bổ sung màn “Nhập kết quả thu” với hai luồng và lịch sử lô nhập |
| Hộ–khoản map bằng key | Trang “Khoản & hóa đơn” có sổ minh họa khóa hộ–kỳ–dịch vụ, dòng phải thu và dòng đã thu |
| Xã theo dõi công nợ | Menu cán bộ đổi thành “Tiến độ người đi thu”, tổng hợp ai thu, tuyến nào, số hộ đã ghé/đã thu/còn nợ và đầu mối cần đốc thúc |
| Người đi thu quản lý nợ từng hộ | Màn “Hộ còn công nợ” hiển thị các hộ thuộc tuyến/phạm vi, có tìm kiếm và lọc tình trạng |
| Ngăn vẫn thu sau chấm dứt | Hộ chấm dứt bị khóa CTA thu/QR; nhập Excel bị chặn và tạo hồ sơ “thu ngoài hệ thống” |
| Báo cáo lãnh đạo | Dashboard/báo cáo có thu–chi, hiệu quả đơn vị, tỷ lệ thành công, công nợ và ngoại lệ |
| Tài khoản nhận chưa chốt | Quản trị có màn “Luồng tiền & QR” so sánh tài khoản xã, tài khoản pháp nhân đơn vị và tài khoản cá nhân |
| 11 công ty không cần tham gia hệ thống | Màn “Quản lý tuyến” dùng nhà thầu như danh mục phối hợp; một nhà thầu có thể phụ trách nhiều tuyến |
| Quy mô thực tế | Dữ liệu minh họa đổi thành 82 tuyến, khoảng 400–800 hộ/tuyến; không còn giả định 11 công ty tương ứng 11 tuyến |
| Quản lý tuyến | Bỏ cột địa bàn/người đi thu; bổ sung chọn khu vực, lọc nhà thầu, lọc trạng thái và thao tác sửa tuyến |
| Chi tiết tuyến | Bấm mã tuyến mở màn riêng có bản đồ một tuyến và danh sách hộ/chủ nguồn thải trong tuyến |
| Hộ nợ muốn ngưng dịch vụ | Trang đối tượng và popup tạm ngưng nêu rõ không tự cắt; hồ sơ xuất hiện trong hàng chờ phê duyệt |
| Thay Công ty A bằng B | Chi tiết tuyến hiển thị lịch sử assignment; popup “Thay nhà thầu” tạo phân công mới và chặn chồng lấn hiệu lực |
| Giữ hay tạo hợp đồng | Chi tiết tuyến có hai nhánh quyết định và popup xác nhận theo vai trò pháp lý của nhà thầu |
| Hai loại tuyến | Danh sách có cột/bộ lọc loại tuyến; chi tiết hiển thị tuyến thu gom liên kết tuyến thu tiền nhưng không đồng nhất |
| Responsive hiện trường | “Tuyến được giao” và “Hộ còn công nợ” chuyển thành lưới hai cột desktop/một cột mobile với bộ lọc hoạt động |

Prototype vẫn không lưu dữ liệu hoặc thực hiện thanh toán thật. Các popup chỉ trực quan hóa trường dữ liệu, kiểm tra và kết quả dự kiến.

---

## 19. Rủi ro và vấn đề mở

| Mức | Vấn đề | Ảnh hưởng nếu chưa chốt |
|---|---|---|
| P0 | Văn bản/biểu giá và cơ chế chuyển tiếp áp dụng cho kỳ triển khai | Tính sai khoản và báo cáo |
| P0 | Cơ quan tổ chức thu, tài khoản nhận và đường đi thực tế của tiền | Sai kiến trúc thanh toán/đối soát |
| P0 | Tài khoản xã có hỗ trợ mã/virtual account/API sao kê đủ để truy vết từng hộ hay không | Tăng dòng treo nếu chỉ dùng một tài khoản và nội dung tự do |
| P0 | Có được dùng tài khoản chính thức của đơn vị thu và chu kỳ nộp/đối soát ra sao | Không xác định trách nhiệm giữ, nộp và sở hữu dòng tiền |
| P0 | Quy trình xử lý khi hộ đã chấm dứt nhưng đơn vị vẫn cung cấp/thu tiền | Thất thoát, công nợ sai và khó xử lý trách nhiệm |
| P0 | Đơn vị phát hành biên lai/HĐĐT và thời điểm phát hành | Sai chứng từ và trách nhiệm pháp lý |
| P0 | Một luồng chuyển khoản có thực hiện được với tiền mặt hay không | Luồng hiện trường không khả thi |
| P0 | Nguồn dữ liệu đối tượng chính thức và data owner | Không xác định bản ghi đúng |
| P0 | Điều kiện khóa/mở lại kỳ | Mất toàn vẹn số liệu |
| P1 | Chính sách nộp một phần và chứng từ tương ứng | Không xử lý được giao dịch phổ biến |
| P1 | Virtual account hay nội dung chuyển khoản | Tỷ lệ dòng treo và chi phí tích hợp |
| P1 | Tần suất gán tuyến và thay đổi giữa kỳ | Sai phạm vi dữ liệu người thu |
| P1 | Mẫu Excel kết quả thu, giới hạn dòng và quy tắc chấp nhận cảnh báo | Nhập sai/trùng hoặc ghi nhận ngoài phạm vi |
| P1 | Ai có quyền cập nhật QR và ai duyệt thay đổi tài khoản/phiên bản | QR sai đích nhận hoặc mất truy vết |
| P1 | Quy trình xóa nợ, hạn mức và cấp phê duyệt | Rủi ro lạm dụng |
| P1 | Yêu cầu offline và thiết bị/máy in hiện trường | Ảnh hưởng thiết kế kỹ thuật/mobile |
| P2 | GIS, KBNN và tính theo khối lượng/thể tích | Ảnh hưởng khả năng mở rộng |

---

## 20. Điều kiện sẵn sàng phát triển

Dự án chỉ nên chuyển từ prototype sang thiết kế backend/database sau khi có:

- Biên bản xác nhận quy trình hiện tại và quy trình mục tiêu.
- Căn cứ pháp lý và phiên bản biểu giá áp dụng cho kỳ thí điểm.
- Sơ đồ đường tiền, tài khoản nhận và trách nhiệm của từng bên.
- Quyết định không sử dụng tài khoản cá nhân; nếu chọn tài khoản xã hoặc đơn vị phải có cơ chế mã/VA, sao kê và đối soát tương ứng.
- Danh sách actor cùng ma trận quyền chi tiết.
- Bộ dữ liệu mẫu đã làm sạch và ẩn thông tin nhạy cảm.
- Mẫu hợp đồng, thông báo, QR, biên lai/HĐĐT, sao kê và báo cáo.
- File Excel chuẩn cho kết quả thu cùng quy tắc lỗi/cảnh báo/bị chặn.
- Quy trình phân loại hộ, gán tuyến, tạm ngưng/chấm dứt và xử lý thu ngoài hệ thống.
- Định nghĩa chỉ tiêu thu–chi, đơn vị thu hộ và tỷ lệ thành công trên dashboard lãnh đạo.
- Quy tắc xử lý nộp thiếu, thừa, trùng, hoàn, miễn giảm và xóa nợ.
- Điều kiện phát hành đợt, đối soát, khóa và mở lại kỳ.
- Danh sách tích hợp cùng khả năng cung cấp API/file chuẩn.
- Tiêu chí nghiệm thu có thể kiểm thử và người ký xác nhận.

---

## 21. Kiến trúc prototype đang lưu trong dự án

```text
prototype-v2/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   ├── tokens.css
    │   ├── app.css
    │   └── responsive.css
    └── js/
        ├── config.js
        ├── data.js
        ├── dialogs.js
        ├── views.js
        ├── commune-management.js
        ├── commune-review.js
        ├── data-intake.js
        ├── single-unit-area.js
        ├── spec-alignment.js
        └── app.js
```

| Tệp | Trách nhiệm hiện tại |
|---|---|
| `assets/js/config.js` | Sáu không gian vai trò, menu và ánh xạ màn hình |
| `assets/js/data.js` | KPI, 11 nhà thầu, tuyến, hộ/chủ nguồn thải, khoản, lô nhập, công nợ, luồng tiền và dữ liệu minh họa |
| `assets/js/dialogs.js` | Modal và thông báo mô phỏng |
| `assets/js/views.js` | Các màn hình nền dùng chung; các module sau ghi đè/bổ sung màn hình theo phiên bản hiện hành |
| `assets/js/commune-management.js` | Dữ liệu và giao diện quản lý khu vực, đơn vị, tiến độ theo công ty |
| `assets/js/commune-review.js` | Tối ưu phân công khu vực, bàn giao và CRUD đơn vị trong phiên mẫu |
| `assets/js/data-intake.js` | Tiếp nhận, ghép cột, đối chiếu nguồn hộ và không gian dữ liệu công ty |
| `assets/js/single-unit-area.js` | Gộp thu gom và thu tiền thành một công ty phụ trách trên mỗi khu vực |
| `assets/js/spec-alignment.js` | Không gian vận hành công ty, đối soát phần xử lý, phân tách quyền khóa sổ và trạng thái chặn khi thiếu nguồn |
| `assets/js/app.js` | Hash routing, đổi vai trò, modal và chặn truy cập sai vai trò ở lớp giao diện |
| `assets/css/*` | Token, kiểu cơ sở và bố cục giao diện |

Prototype vẫn là mã HTML/CSS/JavaScript thuần, không backend, không lưu dữ liệu và không gọi API. Bản cũ trong `outputs/prototype` không bị thay đổi; spec hiện hành của bản này nằm tại `outputs/prototype-v2/SPEC-TONG-HOP.md`.

---

## 22. Kết luận phạm vi

Hệ thống mục tiêu là một nền tảng nội bộ, đa vai trò và đa địa bàn, lấy **đối tượng–hợp đồng–khoản phải thu–dòng tiền–chứng từ–đối soát** làm chuỗi dữ liệu trung tâm. Thiết kế ưu tiên giảm tiền mặt qua tay, tự động hóa kiểm tra, theo dõi công nợ và giữ tách bạch trách nhiệm.

Bốn điều kiện quyết định thành công là:

1. Dữ liệu đối tượng và công nợ kế thừa phải đáng tin cậy.
2. Biểu giá, đường tiền và thẩm quyền phải được xác nhận trước khi lập trình nghiệp vụ tài chính.
3. Người thu, người đối soát và người duyệt phải được phân quyền và ghi nhật ký độc lập.
4. Hộ đã tạm ngưng/chấm dứt phải bị khóa thu trên mọi kênh; mọi phát sinh ngoài hệ thống phải được phát hiện và đối soát.
