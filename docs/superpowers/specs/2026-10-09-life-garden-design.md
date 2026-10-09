# Life Garden – Thiết kế

Ngày: 2026-10-09 · Trạng thái: chờ duyệt

## 1. Mục đích và tiêu chí thành công

Life Garden là web app giúp người dùng xây thói quen sống khỏe. Mỗi ngày người dùng hoàn thành vài nhiệm vụ nhỏ (uống nước, đi bộ, vận động, ngủ đúng giờ) và khu vườn ảo của họ phát triển. App nhẹ nhàng, dễ duy trì, **không trách móc hay phạt** khi bỏ lỡ một ngày.

Thành công khi người dùng:
- mở app mỗi ngày, hoàn thành nhiệm vụ nhanh chóng;
- thấy khu vườn lớn lên và nhận ra tiến bộ của mình;
- dễ quay lại ngày hôm sau, kể cả sau khi nghỉ.

Gợi ý chỉ hỗ trợ xây thói quen, **không thay thế tư vấn y tế**. Thông tin sức khỏe được bảo vệ và do người dùng kiểm soát.

## 2. Phạm vi bản đầu

Trong phạm vi:
- Năm màn hình: Chào mừng và hồ sơ, Hôm nay, Khu vườn, Tiến độ, Hồ sơ và cài đặt.
- Lưu dữ liệu chỉ trên trình duyệt, minh họa SVG, PWA, nhắc nhở cục bộ.

Ngoài phạm vi (YAGNI): tài khoản, đồng bộ nhiều thiết bị, Web Push, tính năng cộng đồng, gợi ý bằng AI bên ngoài.

## 3. Kiến trúc

- **Công nghệ:** React + Vite + TypeScript.
- **State:** một store trung tâm (Zustand), tự lưu vào IndexedDB hoặc localStorage.
- **Logic nghiệp vụ** nằm trong các module TypeScript thuần, không phụ thuộc React, để kiểm thử độc lập. Màn hình chỉ là lớp hiển thị mỏng. Hai module chính:
  - bộ gợi ý nhiệm vụ;
  - bộ tính điểm và mở khóa.
- Phần Tiến độ là các hàm thuần tính từ dữ liệu `days`.

## 4. Mô hình dữ liệu

Bốn nhóm dữ liệu, kèm trường `version` cho việc chuyển đổi schema sau này:

1. **`profile`**: cân nặng, chiều cao, tuổi, giới tính, mục tiêu, mức vận động, thời gian rảnh mỗi ngày. Mọi trường là tùy chọn.
2. **`settings`**: thói quen đã chọn, giờ nhắc, bật hoặc tắt thông báo, nhiệm vụ tự tạo.
3. **`days`**: khóa theo `YYYY-MM-DD`. Mỗi ngày giữ danh sách nhiệm vụ đã gợi ý với trạng thái `pending`, `done`, `swapped` hoặc `skipped`. Ngày bỏ lỡ không có bản ghi hoặc toàn `pending`, không bị đánh dấu thất bại. Lịch sử giữ vô thời hạn.
4. **`garden`**: tên vườn, mức mở khóa cao nhất từng đạt, các món đã đặt cùng vị trí ô.

### Quy tắc điểm và mở khóa
- **Điểm vườn = tổng điểm của các nhiệm vụ đang ở trạng thái `done`.** Tính từ `days`, không lưu riêng, nên không thể lệch hay cộng lặp.
- Tick thì cộng, **bỏ tick thì thu hồi** đúng phần đó (để sửa tick nhầm).
- Bỏ lỡ cả ngày **không trừ** điểm.
- **Mức mở khóa chỉ tăng:** `garden` ghi mức cao nhất từng đạt. Cây hoặc vật trang trí đã mở khóa được giữ, kể cả khi điểm hiển thị giảm do bỏ tick.
- Tiến độ (lịch sử, tổng kết tuần, xu hướng như số lần đi bộ, giờ ngủ, cột mốc) tính từ `days`, không lưu trùng.

## 5. Bộ gợi ý nhiệm vụ

Hàm thuần nhận hồ sơ, cài đặt, lịch sử gần đây và ngày hôm nay, trả về danh sách nhiệm vụ.

- **Danh mục có sẵn.** Mỗi mục gồm thói quen, thời lượng, cường độ, điểm thưởng và điều kiện áp dụng.
- **Chọn nhiệm vụ cho một ngày:**
  1. Lọc theo thói quen đã chọn và điều kiện áp dụng.
  2. Chọn 3 đến 5 nhiệm vụ, tổng thời lượng không vượt quỹ thời gian rảnh.
  3. Cân nặng, chiều cao, tuổi, giới tính và mục tiêu chỉ dùng để chỉnh mức gợi ý (ví dụ lượng nước, số bước), không đưa lời khuyên y tế.
  4. Xoay vòng biến thể để tránh lặp y hệt hôm qua.
  5. Luật xác định cộng hạt giống theo ngày, nên mở lại cùng ngày ra cùng danh sách.
- **Ổn định:** danh sách của ngày được sinh một lần khi mở lần đầu và ghi vào `days`. Đổi hồ sơ sau đó chỉ ảnh hưởng ngày kế tiếp.
- **Đổi:** lấy nhiệm vụ khác cùng thói quen. Nhiệm vụ cũ ghi `swapped`, nhiệm vụ mới ghi `pending`.
- **Bỏ qua:** ghi `skipped`, không phạt.
- Nhiệm vụ tự tạo đi qua cùng cơ chế.
- Có dòng ghi chú cố định rằng gợi ý không thay thế tư vấn y tế. Gợi ý về nước, vận động, ngủ giữ ở mức phổ thông, an toàn.

## 6. Khu vườn

- **Lưới ô** cố định (ví dụ 6×6 lúc đầu), mở rộng dần khi điểm tăng. Mỗi ô chứa tối đa một cây hoặc vật trang trí. Người dùng chạm vào ô, chọn món từ kho đã mở khóa để đặt, di chuyển hoặc gỡ. Không dùng kéo thả, để hoạt động tốt trên điện thoại.
- **Danh mục:** cây và vật trang trí, mỗi món có ngưỡng điểm để mở (ví dụ hạt giống, cỏ, hoa nhỏ, cây ăn quả, ghế đá, đèn lồng, hồ nước). Cấu hình theo từng món cho biết đặt được nhiều lần hay chỉ một lần.
- **Giai đoạn lớn:** cây có vài giai đoạn (hạt, mầm, trưởng thành) lớn lên theo mức mở khóa. Vì mức này chỉ tăng nên cây không héo hay thụt lùi.
- **Tên vườn** do người dùng đặt.
- **Không phạt:** không có streak làm héo cây, bỏ lỡ không đổi gì trong vườn. Phản hồi chỉ tích cực: hiệu ứng nhẹ khi mở món mới, gợi ý "sắp mở món tiếp theo".
- **Hình ảnh:** SVG nhẹ, đồng bộ phong cách, chạy offline, hỗ trợ chế độ sáng/tối, có mô tả chữ cho từng món để dùng được với trình đọc màn hình.

## 7. Nhắc nhở và PWA

- **PWA:** web manifest và service worker để cài lên màn hình chính, mở offline, tải nhanh.
- **Nhắc nhở:** Web Notification kèm bộ hẹn giờ khi app đang mở hoặc nằm nền, cộng nhắc trong app khi người dùng mở lại.
- **Giới hạn đã chấp nhận:** không có server thì không đảm bảo nhắc đúng giờ khi app đã đóng hoàn toàn. Giao diện nói rõ điều này (nhắc hoạt động tốt nhất khi app được cài và đang mở nền).
- Xin quyền thông báo khi có ngữ cảnh (lúc người dùng chọn giờ nhắc), không xin ngay khi mở app. Từ chối quyền thì app vẫn dùng bình thường với nhắc trong app.
- Có công tắc bật/tắt và chỉnh giờ nhắc. Giọng nhắc nhẹ nhàng, không trách móc.
- Giai đoạn sau, nếu cần nhắc đáng tin cậy khi app đóng, thêm Web Push và backend nhỏ. Mô hình dữ liệu hiện tại không cần đổi.

## 8. Quyền riêng tư

- Mọi dữ liệu nằm trên máy người dùng, không gửi đi đâu, không có phân tích hay theo dõi bên thứ ba.
- Trong Cài đặt: **Xuất dữ liệu** (JSON), **Nhập lại dữ liệu**, **Xóa toàn bộ** (có bước xác nhận).
- Thông tin hồ sơ đều tùy chọn, bỏ qua hoặc sửa sau được.
- Ghi chú y tế hiện ở màn chào mừng và Cài đặt.

## 9. Xử lý lỗi

- Dữ liệu cũ hoặc hỏng: chạy bước chuyển đổi theo `version`. Nếu không đọc được thì hỏi người dùng khôi phục từ tệp xuất hoặc bắt đầu lại, không xóa âm thầm.
- Trình duyệt không cho lưu (chế độ riêng tư, hết dung lượng): báo rõ ràng và vẫn chạy trong phiên.
- Từ chối quyền thông báo: app vẫn dùng bình thường.

## 10. Kiểm thử

- **Đơn vị (Vitest):** bộ gợi ý (đúng quỹ thời gian, ổn định theo hạt giống, đổi và bỏ qua), tính điểm (tick, bỏ tick, ngày bỏ lỡ không đổi điểm), mở khóa (mức cao nhất được giữ khi điểm giảm), các số liệu của Tiến độ.
- **Thành phần (Testing Library):** luồng chính từng màn hình (hoàn thành nhiệm vụ, đặt cây, chỉnh cài đặt).
- **Đầu-cuối (Playwright):** thiết lập hồ sơ, hoàn thành nhiệm vụ, thấy vườn phát triển, tải lại trang mà dữ liệu vẫn còn.

## 11. Màn hình

1. **Chào mừng và hồ sơ:** nhập thông tin, chọn mục tiêu, mức vận động, thời gian rảnh, giờ nhắc. Cho phép bỏ qua.
2. **Hôm nay:** ngày và lời chào, danh sách nhiệm vụ với nút hoàn thành, đổi, bỏ qua, tiến độ trong ngày, lối tắt đến vườn.
3. **Khu vườn:** lưới vườn, kho món đã mở, đặt tên và tùy chỉnh.
4. **Tiến độ:** lịch sử nhiệm vụ, tổng kết tuần, xu hướng, cột mốc.
5. **Hồ sơ và cài đặt:** cập nhật thông tin, nhiệm vụ và giờ nhắc, thông báo, quyền riêng tư và dữ liệu.
