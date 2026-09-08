# Vietflexmap · Automatic Commune Map Generator

**Gõ tên xã/phường → tự tìm đơn vị → tải ranh giới → dựng layout bản đồ → chỉnh tay → xem trước → xuất PNG/PDF.**

Trang chạy: **https://vietflexmap.github.io/bando/**

## Chế độ tự động

Phiên bản mới mở rộng Map Composer thành **Automatic Commune Map Generator** nhưng vẫn giữ toàn bộ chức năng biên tập thủ công.

Quy trình tự động:

`Tên xã/phường` → `tra danh mục 34 tỉnh / 3.321 đơn vị cấp xã` → `xác định mã tỉnh + mã xã` → `tải GeoJSON xã` → `tải GeoJSON tỉnh` → `fit xã trên map chính` → `fit tỉnh + highlight xã trên inset` → `điền tiêu đề / mã bản đồ / nguồn` → `lưới + tỷ lệ + chú giải` → `Preview` → `PNG / PDF`

### Cách dùng nhanh

1. Mở **Biên tập** và tại khung Automatic Commune Map Generator chọn tỉnh nếu cần.
2. Gõ tên xã/phường/đặc khu, ví dụ `Vĩnh Thịnh`.
3. Nếu tên trùng, chọn đúng kết quả theo **tỉnh + mã đơn vị**.
4. Bấm **Tạo ngay** hoặc click trực tiếp kết quả.
5. Hệ thống tự tải polygon xã và polygon tỉnh, tự điền nội dung tờ bản đồ và dựng sơ đồ vị trí.
6. Chỉnh nền, nhãn, lưới, tỷ lệ, ghi chú và khổ giấy nếu cần.
7. Bấm **Ẩn tùy chọn** hoặc **Xem trước** để quan sát tờ bản đồ sạch trước khi in.
8. Xuất PNG/PDF hoặc Print / Save PDF.

## UI/UX biên tập trên mọi thiết bị

- Desktop: sidebar biên tập có thể **ẩn hoàn toàn** để dành toàn bộ màn hình cho layout.
- Tablet/mobile: sidebar chuyển thành **drawer**, mở khi cần và đóng ngay để không che bản đồ.
- Layout tự thu vừa vùng xem; có nút chuyển giữa **Fit screen** và **100%**.
- Chế độ **Preview** ẩn toàn bộ bảng tùy chọn và toolbar, mô phỏng gần nhất tờ bản đồ trước khi in.
- Trong Preview vẫn có thanh nhanh để **PNG / PDF / In**.
- Các nhóm tùy chọn có thể thu gọn để giảm cuộn trên màn hình nhỏ.
- Sau khi Automatic Generator dựng xong bản đồ trên mobile, drawer tự đóng để người dùng thấy ngay kết quả.
- Phím tắt: `E` bật/tắt bảng biên tập, `V` bật/tắt Preview, `Esc` thoát Preview/drawer.
- Mức zoom giao diện chỉ phục vụ quan sát; khi xuất, hệ thống tự trở về kích thước sheet thật để giữ chất lượng ảnh.

## Cơ chế chống chọn nhầm và fallback

- Tìm kiếm không dấu/có dấu và theo mã đơn vị.
- Có bộ lọc tỉnh/thành phố để xử lý các xã trùng tên.
- URL GeoJSON được suy ra từ mã + tên đơn vị.
- Nếu tên file có ký tự đặc biệt làm URL suy đoán không khớp, ứng dụng tra thư mục theo **mã xã** để lấy đúng file.
- Nếu nguồn GeoJSON chính không phản hồi, ứng dụng thử OpenStreetMap/Nominatim làm nguồn polygon dự phòng và hiển thị cảnh báo kiểm tra ranh giới.
- Chế độ nạp GeoJSON thủ công luôn được giữ lại, không phụ thuộc Automatic Generator.

## Map Composer

Sau khi tự dựng bản đồ, người dùng vẫn có thể biên tập đầy đủ:

- Nền đường phố OpenStreetMap, vệ tinh Esri, VN-SDI hoặc nền trắng.
- Overlay biên giới/địa giới VN-SDI/DOSM độc lập với basemap.
- Nạp GeoJSON/JSON bằng chọn file hoặc kéo-thả.
- Click polygon để chọn và làm nổi bật đối tượng.
- Lưới kinh/vĩ độ WGS 84 theo bước tọa độ thật, tự động hoặc 0,01° → 1°.
- Nhãn tọa độ ở bốn cạnh khung.
- Tỷ lệ số 1:N và thước tỷ lệ đồ họa.
- Mũi tên Bắc, chú giải, khung neatline kép, nguồn dữ liệu, ghi chú, mã bản đồ, ngày lập.
- **A5 / A4 / A3 / A2**, ngang hoặc dọc.
- A5 có layout typography, inset, legend và sidecar được tối ưu riêng cho kích thước nhỏ.
- Logo cơ quan tùy chọn.
- Định vị theo vĩ độ/kinh độ.
- Ghi chú trực tiếp; kéo nhãn, nhấp đúp để xóa.
- Lưu/nạp project JSON.
- PNG 1.5× / 2× / 3×, PDF đúng khổ giấy và Print / Save PDF.

## Kiến trúc

```text
                 Tên xã / phường
                        ↓
              Administrative Index
             34 tỉnh · 3.321 xã
                        ↓
             Resolve province + code
                        ↓
       ┌────────────────┴────────────────┐
       ↓                                 ↓
 Commune GeoJSON                  Province GeoJSON
       ↓                                 ↓
 Main Map target                Province context
       ↓                                 ↓
 auto extent                    Inset location map
       └────────────────┬────────────────┘
                        ↓
                Vietflex Map Composer
                        ↓
      Grid · Scale · North · Labels · Legend
                        ↓
             Responsive Editor / Preview
                        ↓
                A5 / A4 / A3 / A2
                        ↓
                 PNG / PDF / Print
```

## Nguồn dữ liệu và thư viện

- `Vietflexmap/anhmap`: https://github.com/Vietflexmap/anhmap
- VN-SDI: https://vnsdi.mae.gov.vn/bandohanhchinh/
- Bản đồ hành chính VN-SDI: `https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer`
- Lớp biên giới/địa giới DOSM/VN-SDI.
- Vietnamese Provinces Database: https://github.com/thanglequoc/vietnamese-provinces-database — danh mục hành chính và GeoJSON, MIT License.
- OpenStreetMap contributors; Nominatim chỉ được dùng như nguồn fallback.
- Esri World Imagery khi người dùng chọn lớp vệ tinh.
- Leaflet, Esri Leaflet, html2canvas và jsPDF.

Xem `THIRD_PARTY_NOTICES.md` để biết ghi nguồn/phần mềm bên thứ ba.

## Lưu ý kỹ thuật

- WebGIS chạy phía trình duyệt, không cần backend.
- GeoJSON tự động và thủ công được hiển thị theo WGS 84 / EPSG:4326.
- Danh mục được cache theo phiên trình duyệt để giảm tải mạng.
- UI có thể scale sheet để vừa màn hình nhưng **PNG/PDF không dùng scale xem trước**, nhằm giữ kích thước và độ phân giải đầu ra.
- Một số máy chủ nền có thể hạn chế CORS khi chụp bằng `html2canvas`; khi đó dùng **Print / Save PDF** hoặc nền trắng.
- Tỷ lệ số là tỷ lệ xấp xỉ theo Web Mercator và kích thước hiển thị trình duyệt.
- Bản đồ phục vụ hồ sơ pháp lý, đo đạc hoặc công bố chính thức phải được kiểm tra với dữ liệu địa giới, văn bản và quy chuẩn chuyên ngành hiện hành.

## License

MIT License — phần mã Vietflexmap do **Long Ngo** phát triển, © 2026.
