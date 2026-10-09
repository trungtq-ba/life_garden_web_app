# AGENTS.md — Life Garden

Hướng dẫn cho mọi AI agent (và người) làm việc trong repo này. Nguồn chi tiết:
- Đặc tả thiết kế: `docs/superpowers/specs/2026-10-09-life-garden-design.md`
- Kế hoạch triển khai: `docs/superpowers/plans/2026-10-09-life-garden.md`

Khi tài liệu này mâu thuẫn với spec, **spec là chuẩn**.

## 1. Sản phẩm

Life Garden là web app giúp người dùng xây thói quen sống khỏe. Mỗi ngày người dùng làm vài nhiệm vụ nhỏ (uống nước, đi bộ, vận động, ngủ đúng giờ) và khu vườn ảo lớn dần. App nhẹ nhàng, **không trách móc, không phạt** khi bỏ lỡ một ngày.

Gợi ý chỉ hỗ trợ xây thói quen, **không thay thế tư vấn y tế**. Ghi chú này phải luôn hiện ở màn Chào mừng và Cài đặt.

Giao diện bằng **tiếng Việt**.

## 2. Công nghệ

React 18 · Vite 5 · TypeScript 5 (strict) · Zustand 4 · vite-plugin-pwa · Vitest + Testing Library + jsdom · Playwright.

Chỉ lưu trên trình duyệt (localStorage). Không tài khoản, không server, không phân tích bên thứ ba.

## 3. Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm install` | Cài phụ thuộc |
| `pnpm dev` | Chạy dev server (cổng 5173) |
| `pnpm test` | Vitest (unit + UI), chạy một lần |
| `pnpm exec vitest run <đường dẫn>` | Chạy một file test |
| `pnpm build` | `tsc --noEmit` rồi build production + PWA |
| `pnpm e2e` | Playwright (tự bật dev server). Lần đầu: `pnpm exec playwright install chromium` |

Trước khi coi một thay đổi là xong: `pnpm test`, `pnpm build`, và `pnpm e2e` nếu đụng tới luồng người dùng.

## 4. Kiến trúc

Logic nghiệp vụ là **module TypeScript thuần**, không phụ thuộc React, để kiểm thử độc lập. Màn hình chỉ là lớp hiển thị mỏng. Một store Zustand trung tâm giữ toàn bộ `AppData` và tự lưu.

```
src/
  domain/          # thuần TS, không import React
    types.ts       # kiểu dữ liệu và hằng số dùng chung
    date.ts        # dateKey, parseKey, addDays, weekStart (thứ Hai)
    catalog.ts     # CATALOG nhiệm vụ, personalize()
    suggest.ts     # suggestTasks(), swapTask()
    growth.ts      # GARDEN_ITEMS, growthOf, creatureCounts, bloomDensity, nextUnlock
    scene.ts       # skyPhase, weatherFor, sceneState, describeScene, estimateAnimated
    scoring.ts     # dayPoints, totalPoints, syncGarden
    progress.ts    # weeklySummary, habitCounts, milestones, historyDays
  state/
    storage.ts     # emptyData, parseData (kiểm tra chặt), loadData, saveData, backupRaw
    store.ts       # useStore + startPersistence
  notifications/
    reminders.ts   # parseTime, msUntil, isReminderDue, startReminders, ensurePermission
  ui/              # Welcome, Today, GardenScreen, ProgressScreen, SettingsScreen,
                   # Recovery, ProfileForm, useToday, readFile
    garden/        # GardenScene (9 lớp SVG), layers/, items/, CollectionList, hooks đồng hồ/tạm dừng, garden.css
  App.tsx          # điều phối: corrupt → Recovery; chưa có profile → Welcome; còn lại → Shell 4 tab
  main.tsx         # bật persistence, nhắc nhở, đăng ký service worker
tests/             # domain/, state/, ui/ (Vitest)
e2e/               # Playwright
```

## 5. Mô hình dữ liệu (`AppData`, `version: 2`)

- `profile`: cân nặng, chiều cao, tuổi, giới tính, mục tiêu, mức vận động, phút rảnh/ngày. `null` nghĩa là chưa thiết lập (hiện Welcome). "Bỏ qua" tạo `DEFAULT_PROFILE`.
- `settings`: thói quen đã chọn (rỗng = tất cả), giờ nhắc `HH:MM`, bật/tắt thông báo, nhiệm vụ tự tạo.
- `days`: khóa `YYYY-MM-DD` (giờ địa phương) → danh sách nhiệm vụ với trạng thái `pending | done | swapped | skipped`. Giữ vô thời hạn.
- `garden`: tên vườn và `peakPoints` (điểm cao nhất từng đạt, chỉ tăng). Dữ liệu và tệp xuất v1 được di trú tự động (`migrateToV2`).
- `settings.gardenEffects`: `'full' | 'calm' | null` (null = theo hệ thống).

## 6. Quy tắc nghiệp vụ bất biến

Đây là phần cốt lõi của sản phẩm; đừng phá vỡ khi sửa code.

1. **Điểm vườn = tổng điểm các nhiệm vụ đang `done`**, tính từ `days`, **không lưu riêng**. Tick thì cộng, bỏ tick thì thu hồi. Bỏ lỡ cả ngày không trừ gì.
2. **Vườn lớn theo `garden.peakPoints`, chỉ tăng** (`syncGarden`). Bỏ tick làm điểm hiển thị giảm nhưng cây không co lại.
3. **Không có streak, không có thứ gì héo hay mất** khi bỏ lỡ. Không dùng từ ngữ trách móc trong giao diện.
4. **Tiến độ** (tổng kết tuần, xu hướng, cột mốc, lịch sử) luôn **tính từ `days`**, không lưu trùng. "Giờ ngủ" thể hiện bằng số lần hoàn thành nhiệm vụ thói quen `sleep`.
5. **Gợi ý hằng ngày**: 3–5 nhiệm vụ, tổng thời lượng không vượt quỹ thời gian rảnh, xác định theo hạt giống của ngày, **sinh một lần** rồi ghi vào `days[date]`. Đổi hồ sơ chỉ ảnh hưởng ngày kế tiếp. Luôn có ít nhất 1 nhiệm vụ nếu pool không rỗng.
6. **Đổi** nhiệm vụ: cũ → `swapped`, mới → `pending`; không có mẫu thay thế thì giữ nguyên danh sách. **Bỏ qua** → `skipped`, không phạt.
7. **Khu vườn là cảnh SVG nhiều lớp tự phát triển**; không có đặt/di chuyển/gỡ. Mọi phần tử lớn liên tục theo `peakPoints` (`growthOf`). Trong ngày chỉ có phản ứng tức thời không lưu (`wateredTick`, nắng ấm, cầu vồng khi xong hết). Thời tiết trang trí cố định theo ngày và luôn đẹp; bướm/chim nghỉ khi mưa hoặc ban đêm.
8. **Lưu trữ**: `parseData` kiểm tra chặt từng phần tử. Dữ liệu hỏng → trạng thái `corrupt`, **không ghi đè** cho tới khi người dùng chọn khôi phục hoặc bắt đầu lại (có bản sao lưu ở khóa `life-garden:v1:corrupt-backup`). Không lưu được → trạng thái `unavailable`, app vẫn chạy trong phiên.
9. **Nhắc nhở**: Web Notification khi app mở hoặc nằm nền, cộng nhắc trong app khi mở lại. Không đảm bảo đúng giờ khi app đã đóng hoàn toàn (giới hạn đã chấp nhận). Xin quyền thông báo khi người dùng bật công tắc, không xin lúc mở app; bị từ chối thì app vẫn dùng bình thường.

## 7. Quy ước code và test

- TypeScript strict, `noUnusedLocals/Parameters`. Import tương đối, không dùng alias.
- Phong cách: giữ giống code xung quanh (hàm thuần nhỏ, comment ít và chỉ nói "vì sao").
- **TDD**: viết test thất bại trước, xem nó fail đúng lý do, rồi mới viết code tối thiểu để pass.
- Logic mới đặt trong `src/domain` (thuần), nối vào UI qua store. Không để nghiệp vụ trong component.
- Thao tác ngày dùng `date.ts` (giờ địa phương), đừng dùng `toISOString().slice(0, 10)`.
- Đọc nội dung `File` bằng `readFileText` (`src/ui/readFile.ts`), không dùng `file.text()` vì jsdom không có.
- Test UI: truy vấn theo vai trò và tên truy cập. Cẩn thận regex mơ hồ (ví dụ `/^Ô 1/` khớp cả Ô 10–19); dùng khớp chính xác hoặc `exact: true`. Khi trang có cả "Khu vườn" (tab) và "Xem khu vườn" (nút), phải `exact: true`.
- Tên truy cập hiện có là hợp đồng với test: `Hoàn thành: {title}`, `Đổi: {title}`, `Bỏ qua: {title}`, `Ô {n}` / `Ô {n}: {tên món}`, `Đặt {tên món}`.

- Chuyển động chỉ dùng `transform`/`opacity`; keyframes mới phải qua test `garden-motion`. Thêm phần tử chuyển động thì cập nhật `estimateAnimated` và giữ ≤ `ANIMATION_BUDGET` (70).
- Test cảnh dùng `dateKey: '2026-10-07'` (ngày nắng) làm mặc định; `2026-10-09` là ngày mưa. Trang xem thử khu vườn: `pnpm dev` rồi mở `/?preview=garden` (chỉ dev).
- `prefers-reduced-motion` của hệ điều hành luôn ép chế độ Nhẹ; không để cài đặt người dùng ghi đè.

## 8. Giới hạn đã biết (chưa làm)

Hai tab/PWA mở cùng lúc ghi đè dữ liệu của nhau (chưa nghe sự kiện `storage`); nhiệm vụ tự tạo thành mẫu vĩnh viễn và điểm không có trần; bỏ chọn hết thói quen được hiểu là chọn tất cả; một lần đổi có thể quay lại mẫu cũ trong cùng ngày; banner nhắc nhở trong app chỉ cập nhật khi render lại; nhập tệp không hỏi xác nhận ghi đè và có thể hạ `peakPoints`; manifest PWA mới chỉ có icon SVG (chưa có PNG 192/512, apple-touch-icon); tuổi, chiều cao, giới tính được thu thập nhưng chưa dùng để gợi ý.

Ngoài phạm vi bản đầu: tài khoản, đồng bộ nhiều thiết bị, Web Push, cộng đồng, gợi ý bằng AI bên ngoài.

Parallax chỉ theo chuột (chưa theo cảm biến nghiêng); fps chưa đo trên điện thoại thật; tranh SVG do mã tạo, có thể thay từng món trong `src/ui/garden/items/`.
