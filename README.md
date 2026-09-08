# Vietflexmap · Automatic Commune Map Generator

**Gõ tên xã/phường → tự tìm đơn vị → tải ranh giới → dựng layout bản đồ → chỉnh tay → xem trước → xuất PNG/PDF.**

Trang chạy: **https://vietflexmap.github.io/bando/**

## Vietflex Map Core · không dùng OSM

Phiên bản hiện tại dùng **Vietflex Map Core** làm runtime bản đồ phía trình duyệt:

- CSS: `Vietflexmap/VN@6144d565.../dist/vietflex.css`
- JavaScript: `Vietflexmap/VN@6144d565.../dist/vietflex.js`
- Nền mặc định: **Vietflex · Google Roadmap** qua `legacyGoogleTiles({mapType: 'roadmap'})`.
- Ngôn ngữ/khu vực lớp Google: `hl=vi`, `gl=VN` theo cấu hình Vietflex.
- Không dùng tile OpenStreetMap.
- Không dùng Nominatim làm fallback.
- Mọi request tới `openstreetmap.org` bị chặn bởi `vietflex-core.js`.
- Key nội bộ `osm` vẫn được giữ trong một số project JSON cũ để tương thích ngược, nhưng key này đã được bridge sang Vietflex Google Roadmap và **không còn gọi OSM**.

Lưu ý: chế độ Google legacy dùng endpoint tương thích mà Google không công bố như Map Tiles API chính thức; endpoint có thể thay đổi. Với triển khai thương mại/lâu dài nên chuyển Vietflex sang Google Map Tiles API chính thức với API key được giới hạn theo domain và billing phù hợp.

## Chế độ tự động

Quy trình:

`Tên xã/phường` → `tra danh mục 34 tỉnh / 3.321 đơn vị cấp xã` → `xác định mã tỉnh + mã xã` → `tải GeoJSON xã` → `tải GeoJSON tỉnh` → `fit xã trên map chính` → `fit tỉnh + highlight xã trên inset` → `điền tiêu đề / mã bản đồ / nguồn` → `lưới + tỷ lệ + chú giải` → `Preview` → `PNG / PDF`

### Cách dùng nhanh

1. Mở **Biên tập**.
2. Ở Automatic Commune Map Generator, chọn tỉnh nếu cần.
3. Gõ xã/phường/đặc khu, ví dụ `Vĩnh Thịnh`.
4. Chọn đúng kết quả theo **tỉnh + mã đơn vị** nếu có tên trùng.
5. Bấm **Tạo ngay** hoặc click kết quả.
6. Hệ thống tự tải polygon xã và tỉnh, dựng inset và điền nội dung layout.
7. Chỉnh nền, nhãn, lưới, tỷ lệ, ghi chú, khổ giấy.
8. Bấm **Ẩn tùy chọn** hoặc **Xem trước** để kiểm tra tờ bản đồ sạch.
9. Xuất PNG/PDF hoặc Print / Save PDF.

## Fallback dữ liệu

- Tìm kiếm có dấu/không dấu và theo mã đơn vị.
- Có bộ lọc tỉnh/thành phố để xử lý xã trùng tên.
- GeoJSON được suy ra theo mã + tên đơn vị.
- Nếu URL suy đoán không khớp, ứng dụng tra thư mục theo **mã xã** để lấy đúng file.
- Nếu nguồn GeoJSON tự động không phản hồi, ứng dụng yêu cầu thử lại hoặc **nạp GeoJSON thủ công**.
- Không dùng OSM/Nominatim làm nguồn polygon dự phòng.

## Map Composer

Sau khi tự dựng bản đồ, người dùng vẫn có thể biên tập đầy đủ:

- Nền **Vietflex · Google Roadmap** mặc định.
- Vệ tinh Esri World Imagery.
- VN-SDI · Bản đồ hành chính.
- Nền trắng · chỉ ranh giới.
- Overlay biên giới/địa giới VN-SDI/DOSM độc lập với basemap.
- Nạp GeoJSON/JSON bằng chọn file hoặc kéo-thả.
- Click polygon để chọn và làm nổi bật đối tượng.
- Lưới kinh/vĩ độ WGS 84 theo bước tọa độ thật, tự động hoặc 0,01° → 1°.
- Nhãn tọa độ ở bốn cạnh khung.
- Tỷ lệ số 1:N và thước tỷ lệ đồ họa.
- Mũi tên Bắc, chú giải, neatline, nguồn dữ liệu, ghi chú, mã bản đồ, ngày lập.
- Khổ **A5 / A4 / A3 / A2**, ngang hoặc dọc.
- Logo cơ quan tùy chọn.
- Định vị theo vĩ độ/kinh độ.
- Ghi chú trực tiếp; kéo nhãn, nhấp đúp để xóa.
- Lưu/nạp project JSON.
- PNG 1.5× / 2× / 3×, PDF đúng khổ giấy và Print / Save PDF.

## UI/UX biên tập

- Desktop: sidebar biên tập có thể đóng hoàn toàn.
- Tablet/mobile: editor chuyển thành drawer phủ, không chiếm chiều rộng layout.
- **Xem trước** ẩn editor + toolbar để nhìn đúng tờ bản đồ trước khi in.
- Preview có nút PNG / PDF / In.
- Fit tự động theo màn hình và chế độ xem 100%.
- Các nhóm tùy chọn có thể thu gọn.
- Phím `E`: bật/tắt editor; `V`: preview; `Esc`: thoát preview/drawer.
- Việc thu nhỏ tờ giấy để xem không làm giảm độ phân giải file xuất.

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
              Vietflex Map Core
              Google Roadmap / VN-SDI
                        ↓
               Map Composer Engine
                        ↓
      Grid · Scale · North · Labels · Legend
                        ↓
             A5 / A4 / A3 / A2
                        ↓
             Preview · PNG · PDF · Print
```

## Nguồn dữ liệu và thư viện

- Vietflex Map Core: https://github.com/Vietflexmap/VN
- `Vietflexmap/anhmap`: https://github.com/Vietflexmap/anhmap
- VN-SDI: https://vnsdi.mae.gov.vn/bandohanhchinh/
- Bản đồ hành chính VN-SDI: `https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer`
- Lớp biên giới/địa giới DOSM/VN-SDI.
- Vietnamese Provinces Database: https://github.com/thanglequoc/vietnamese-provinces-database — danh mục hành chính và GeoJSON, MIT License.
- Google tiles thông qua lớp tương thích Vietflex khi người dùng chọn nền roadmap mặc định.
- Esri World Imagery khi chọn lớp vệ tinh.
- Esri Leaflet, html2canvas và jsPDF.

Xem `THIRD_PARTY_NOTICES.md` để biết ghi nguồn và điều kiện sử dụng bên thứ ba.

## Lưu ý kỹ thuật

- WebGIS chạy hoàn toàn phía trình duyệt, không cần backend.
- GeoJSON hiển thị theo WGS 84 / EPSG:4326.
- Danh mục được cache theo phiên trình duyệt.
- Google legacy tiles có thể hạn chế CORS khi `html2canvas` chụp ảnh. Khi đó dùng **Print / Save PDF**, nền VN-SDI, vệ tinh Esri hoặc nền trắng.
- Tỷ lệ số là tỷ lệ xấp xỉ theo Web Mercator và kích thước hiển thị trình duyệt.
- Bản đồ phục vụ pháp lý, đo đạc, địa giới hoặc công bố chính thức phải được kiểm tra với dữ liệu địa giới, văn bản và quy chuẩn chuyên ngành hiện hành.

## License

MIT License — phần mã Vietflexmap do **Long Ngo** phát triển, © 2026.