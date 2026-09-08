# Third-party notices

Vietflexmap `bando` sử dụng hoặc kết nối tới các thư viện/dữ liệu bên thứ ba. Mỗi thành phần tiếp tục tuân theo giấy phép và điều kiện sử dụng của nhà cung cấp tương ứng.

## Vietflex Map Core

Repository: `Vietflexmap/VN`

Vietflex là thư viện bản đồ ưu tiên Việt Nam do Long Ngo phát triển trên nền lõi Leaflet. Phần dẫn xuất Leaflet tiếp tục theo BSD-2-Clause; phần bổ sung riêng của Vietflex theo MIT License. Ứng dụng `bando` khóa runtime Vietflex tại commit `6144d565fcf236727577ab3c4471bbe49f86892f` để tránh thay đổi ngoài dự kiến.

## Google roadmap qua Vietflex legacy compatibility

Nền mặc định của `bando` dùng lớp `Vietflex.legacyGoogleTiles({mapType: 'roadmap'})`, yêu cầu tiếng Việt/khu vực Việt Nam. Dữ liệu, hình ảnh, nhãn, logo và điều kiện sử dụng Google không thuộc giấy phép mã nguồn Vietflex.

Chế độ legacy dùng endpoint tương thích `google.com/vt`, không phải Google Map Tiles API chính thức được công bố cho bên thứ ba. Endpoint có thể thay đổi hoặc ngừng hoạt động. Với triển khai sản phẩm lâu dài, người vận hành nên chuyển sang Google Map Tiles API chính thức, bật billing và giới hạn API key theo domain phù hợp.

## Chính sách không dùng OSM

Phiên bản hiện tại của `bando` không sử dụng OpenStreetMap tile và không dùng Nominatim làm fallback. `vietflex-core.js` chặn request tới các host OpenStreetMap/Nominatim. Một số project JSON cũ có thể vẫn chứa key nội bộ `osm`; key này chỉ được giữ để tương thích ngược và được bridge sang Vietflex Google Roadmap, không còn trỏ tới OSM.

## Vietnamese Provinces Database

Repository: `thanglequoc/vietnamese-provinces-database`

Copyright (c) 2021 Thang Le Quoc.

Dữ liệu/dự án được phát hành theo **MIT License**. Automatic Commune Map Generator sử dụng danh mục đơn vị hành chính và các tệp GeoJSON từ repository này để tự động xác định mã tỉnh, mã xã/phường và tải polygon tương ứng.

MIT License yêu cầu giữ thông báo bản quyền và giấy phép khi sao chép/phân phối phần đáng kể của phần mềm/dữ liệu. Xem giấy phép gốc tại repository nguồn.

## VN-SDI / DOSM

Các dịch vụ bản đồ hành chính và biên giới/địa giới của VN-SDI/DOSM được dùng làm lớp tham chiếu trực tuyến. Quyền sở hữu dữ liệu và điều kiện sử dụng thuộc đơn vị cung cấp dịch vụ. Việc hiển thị trên Vietflexmap không làm thay đổi giá trị pháp lý của dữ liệu nguồn.

## Esri World Imagery

Esri World Imagery chỉ được tải khi người dùng chọn lớp vệ tinh. Dữ liệu/hình ảnh tiếp tục chịu điều khoản và yêu cầu attribution của Esri cùng các nhà cung cấp dữ liệu liên quan.

## Esri Leaflet / html2canvas / jsPDF

Các thư viện JavaScript được tải từ CDN và tiếp tục sử dụng theo giấy phép riêng của từng dự án. Esri Leaflet chạy trên API tương thích Leaflet do Vietflex cung cấp trong ứng dụng này.

## Lưu ý

Bản đồ tạo tự động nhằm phục vụ tra cứu, trình bày và tạo nhanh layout. Với sản phẩm pháp lý, đo đạc, địa giới hoặc công bố chính thức, người dùng phải kiểm tra lại dữ liệu nguồn, thời điểm cập nhật và quy chuẩn chuyên ngành hiện hành.
