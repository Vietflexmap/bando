# Vietflexmap Bản đồ cấp xã

Trình biên tập layout bản đồ hành chính chạy hoàn toàn trên trình duyệt, tối ưu để tạo nhanh bản đồ cấp xã và xuất bản đồ in ấn chuyên nghiệp.

## Mục tiêu

- Dùng lại lõi/ý tưởng từ dự án `Vietflexmap/anhmap` (MIT License).
- Có thể sử dụng nền bản đồ Việt Nam và dịch vụ bản đồ hành chính công khai của VN-SDI/ArcGIS REST.
- Tách **nền bản đồ** và **lớp ranh giới/biên giới hành chính** thành các lớp độc lập để điều chỉnh độ trong suốt.
- Tạo layout bản đồ hoàn chỉnh ngay trong trình duyệt, không cần QGIS/ArcGIS cho các bản đồ nhanh.

## Tính năng

- Khung bản đồ (neatline) chuyên nghiệp.
- Lưới tọa độ kinh/vĩ độ tự cập nhật theo extent.
- Thước tỷ lệ dạng thanh và tỷ lệ số 1:N.
- Mũi tên Bắc.
- Tiêu đề, phụ đề, cơ quan, người lập, nguồn dữ liệu, ghi chú.
- Chú giải tự động.
- Sơ đồ vị trí (inset map): hiển thị tỉnh và đánh dấu vị trí xã đang chọn.
- Nhập GeoJSON/JSON để phủ ranh giới xã/huyện/tỉnh riêng.
- Chọn đối tượng trên bản đồ và làm nổi bật xã mục tiêu.
- Thêm nhãn/ghi chú trực tiếp lên bản đồ.
- Chọn A4/A3, ngang/dọc.
- Xuất PNG độ phân giải cao, PDF và Print/PDF của trình duyệt.
- Giao diện biên tập không xuất hiện trong sản phẩm bản đồ cuối.

## Nguồn tham chiếu

- Vietflexmap/anhmap: https://github.com/Vietflexmap/anhmap
- VN-SDI – Bản đồ hành chính: https://vnsdi.mae.gov.vn/bandohanhchinh/
- ArcGIS REST service tham chiếu: `https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer`

> Lưu ý: ứng dụng không sao chép nguyên mã JavaScript của VN-SDI. Dịch vụ VN-SDI được dùng như nguồn bản đồ trực tuyến tham chiếu. Khi dùng cho hồ sơ pháp lý/chính thức, cần kiểm tra điều khoản sử dụng, nguồn dữ liệu, thời điểm cập nhật và quy định bản đồ hiện hành.

## Chạy

Mở `index.html`, hoặc bật GitHub Pages cho nhánh `main` / thư mục gốc.

## Quy trình nhanh

1. Chọn khổ giấy và hướng giấy.
2. Nhập tiêu đề bản đồ.
3. Bật/tắt nền và lớp hành chính.
4. Tải GeoJSON ranh giới địa phương nếu cần độ chi tiết cấp xã.
5. Click xã cần lập bản đồ để chọn và tạo inset.
6. Thêm nhãn/ghi chú.
7. Căn extent, kiểm tra lưới, tỷ lệ và chú giải.
8. Xuất PNG/PDF hoặc Print.

## License

MIT License — Copyright (c) 2026 Long Ngo.
