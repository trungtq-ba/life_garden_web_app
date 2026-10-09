# Life Garden 🌱

Web app giúp bạn xây thói quen sống khỏe. Mỗi ngày làm vài việc nhỏ như uống nước, đi bộ, vận động hay ngủ đúng giờ, và khu vườn ảo của bạn sẽ lớn dần. Bỏ lỡ một ngày cũng không sao: không héo cây, không mất thành quả.

> Gợi ý trong app chỉ hỗ trợ xây dựng thói quen, không thay thế tư vấn y tế.

## Tính năng

- **Hôm nay**: danh sách 3–5 nhiệm vụ vừa sức, theo mục tiêu và thời gian rảnh của bạn. Hoàn thành, đổi, bỏ qua, hoặc tự thêm nhiệm vụ riêng.
- **Khu vườn**: lưới ô để đặt cây và vật trang trí. Món mới được mở khóa khi điểm tăng, cây lớn dần qua các giai đoạn. Đặt tên và tùy chỉnh vườn.
- **Tiến độ**: tổng kết tuần, xu hướng theo thói quen, cột mốc và lịch sử, tất cả tính từ lịch sử hoàn thành.
- **Hồ sơ và cài đặt**: cập nhật thông tin, thói quen, giờ nhắc; xuất, nhập hoặc xóa dữ liệu.
- **Nhắc nhở nhẹ nhàng** và dùng được **offline** (PWA, cài lên màn hình chính được).

## Riêng tư

Mọi dữ liệu nằm trong trình duyệt trên thiết bị của bạn. Không tài khoản, không server, không theo dõi. Bạn có thể xuất dữ liệu ra tệp JSON, nhập lại, hoặc xóa toàn bộ bất cứ lúc nào.

## Chạy thử

Cần Node.js 18 trở lên.

```bash
npm install
npm run dev        # mở http://localhost:5173
```

## Các lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm test` | Chạy unit và UI test (Vitest) |
| `npm run build` | Kiểm tra type, build production và PWA |
| `npm run preview` | Xem bản build |
| `npm run e2e` | Test đầu-cuối (Playwright; lần đầu chạy `npx playwright install chromium`) |

## Công nghệ

React · Vite · TypeScript · Zustand · Vitest · Testing Library · Playwright · vite-plugin-pwa.

## Tài liệu

- [`AGENTS.md`](AGENTS.md): kiến trúc, mô hình dữ liệu, quy tắc nghiệp vụ, quy ước code.
- [`docs/superpowers/specs/2026-10-09-life-garden-design.md`](docs/superpowers/specs/2026-10-09-life-garden-design.md): đặc tả thiết kế.
- [`docs/superpowers/plans/2026-10-09-life-garden.md`](docs/superpowers/plans/2026-10-09-life-garden.md): kế hoạch triển khai.

## Hạn chế hiện tại

- Nhắc nhở đúng giờ khi app đã đóng hoàn toàn cần Web Push và server, nên chưa có ở bản này.
- Chưa đồng bộ giữa nhiều thiết bị.
- Danh sách đầy đủ các hạn chế đã biết nằm ở mục 8 của [`AGENTS.md`](AGENTS.md).
