-- QĐ-L16: phiếu thu mẫu của DV01 kỳ 09/2026 viết trước quy tắc cầm lại phần thu gom (400.000 đ > phải nộp xã 376.212 đ,
-- màn hiện "còn phải nộp -23.788"). Hạ về 200.000 đ để demo ra trạng thái "Đang nộp". Không sửa V22_1 đã chạy.
update company_receipts set amount = 200000 where code = 'PT-CT-0926-001' and amount = 400000;
