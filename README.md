# Vietflexmap · Bản đồ cấp xã

**Map Composer chạy trực tiếp trên trình duyệt để tạo nhanh layout bản đồ hành chính cấp xã và xuất PNG/PDF chuyên nghiệp.**

Trang chạy: **https://vietflexmap.github.io/bando/**

## Kiến trúc

`Nền bản đồ` → `Ranh giới/biên giới hành chính` → `GeoJSON địa phương` → `Nhãn + lưới + tỷ lệ + inset` → `Layout A2/A3/A4` → `PNG/PDF/Print`

Dự án kế thừa cách tổ chức bản đồ nhanh từ `Vietflexmap/anhmap`, nhưng tách phần **map** và **layout xuất bản đồ** thành các lớp riêng để dễ biên tập.

## Tính năng chính

- Nền đường phố OpenStreetMap, vệ tinh Esri, VN-SDI hoặc nền trắng.
- Overlay biên giới/địa giới VN-SDI/DOSM độc lập với basemap.
- Nạp GeoJSON/JSON ranh giới tỉnh, huyện, xã bằng chọn file hoặc kéo-thả.
- Click polygon để chọn xã mục tiêu và làm nổi bật.
- Sơ đồ vị trí tự tạo từ dữ liệu GeoJSON, đánh dấu xã đang chọn.
- Lưới kinh/vĩ độ WGS 84 theo **bước tọa độ thật**, tự động hoặc đặt 0,01° → 1°.
- Nhãn tọa độ ở cả bốn cạnh khung bản đồ.
- Tỷ lệ số 1:N và thước tỷ lệ đồ họa.
- Mũi tên Bắc, chú giải, khung neatline kép, nguồn dữ liệu, ghi chú, mã bản đồ, ngày lập.
- A4 / A3 / A2, ngang hoặc dọc.
- Logo cơ quan tùy chọn.
- Định vị nhanh theo vĩ độ/kinh độ.
- Ghi chú trực tiếp lên map; kéo nhãn, nhấp đúp để xóa.
- Preset “Bản đồ hành chính cấp xã”.
- Lưu/nạp toàn bộ project JSON gồm layout, extent, GeoJSON, logo và ghi chú.
- PNG 1.5× / 2× / 3×, PDF đúng khổ giấy và Print / Save PDF.

## Nguồn bản đồ

- `Vietflexmap/anhmap`: https://github.com/Vietflexmap/anhmap
- VN-SDI: https://vnsdi.mae.gov.vn/bandohanhchinh/
- Bản đồ hành chính VN-SDI: `https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer`
- Lớp biên giới/địa giới DOSM/VN-SDI: `https://dosm.vnsdi.gov.vn/server/rest/services/Hosted/DuongBienGioiDiaGioi_dam_09112023/MapServer`
- OpenStreetMap contributors.
- Esri World Imagery khi người dùng chọn lớp vệ tinh.

## Quy trình tạo bản đồ xã

1. Chọn **Preset** để đưa layout về cấu hình hành chính chuẩn.
2. Chọn A3/A4/A2 và hướng giấy.
3. Nhập tỉnh, xã, tên bản đồ, mã bản đồ, cơ quan và người lập.
4. Nạp file GeoJSON có ranh giới xã và các xã lân cận.
5. Click xã cần xuất; ứng dụng làm nổi bật xã và tạo inset vị trí.
6. Chọn nền; bật lớp biên giới/địa giới VN-SDI.
7. Chỉnh extent, độ đậm nền/ranh giới, bước lưới và thêm ghi chú.
8. Kiểm tra tỷ lệ, chú giải, nguồn dữ liệu và sơ đồ vị trí.
9. Xuất PNG/PDF hoặc dùng Print / Save PDF.
10. Lưu project JSON để mở lại và xuất các phiên bản tiếp theo.

## Lưu ý kỹ thuật

- WebGIS chạy phía trình duyệt; không cần backend.
- GeoJSON nên dùng WGS 84 / EPSG:4326 để hiển thị trực tiếp.
- Một số máy chủ ảnh nền có thể hạn chế CORS khi chụp bằng `html2canvas`. Khi đó hãy dùng **Print / Save PDF**, hoặc chọn **Nền trắng · chỉ ranh giới** để xuất layout vector/DOM sạch hơn.
- Tỷ lệ số hiển thị là tỷ lệ xấp xỉ theo Web Mercator và kích thước hiển thị trình duyệt; bản đồ phục vụ hồ sơ đo đạc/pháp lý phải được thành lập và kiểm tra theo quy chuẩn chuyên ngành phù hợp.
- Dữ liệu VN-SDI và dữ liệu bên thứ ba tiếp tục tuân theo điều kiện sử dụng/ghi nguồn của nhà cung cấp.

## License

MIT License — phần mã Vietflexmap do **Long Ngo** phát triển, © 2026.
