# Life Garden – Thiết kế lại khu vườn

Ngày: 2026-10-09 · Trạng thái: đã triển khai
Thay thế **mục 6 (Khu vườn)** và các phần liên quan của `2026-10-09-life-garden-design.md` (mô hình `garden`, mở khóa theo level, đặt món thủ công). Các phần còn lại của spec gốc giữ nguyên.

## 1. Mục đích và tiêu chí thành công

Khu vườn hiện là lưới ô trống mà người dùng phải tự đặt từng món, nên phần thưởng cốt lõi ("nhìn khu vườn lớn lên") không xảy ra tự nhiên. Thiết kế lại để:

- Khu vườn **tự phát triển** khi hoàn thành nhiệm vụ, không còn đặt, di chuyển hay gỡ.
- Là một cảnh SVG nhiều lớp, có chiều sâu, đổ bóng, bầu trời và thời tiết, chuyển động mượt, phong cách ứng dụng sức khỏe hiện đại, để người dùng có cảm giác đây là một sản phẩm thật.

Thành công khi:
- Hoàn thành một nhiệm vụ thì **thấy ngay** phản hồi trong vườn và có một thứ lớn thêm một chút.
- Mở app vào bất kỳ giờ nào, vườn cũng trông đẹp, sinh động và không bao giờ trống.
- Bỏ lỡ một ngày, bỏ tick, hay làm ít việc **không bao giờ** làm vườn xấu đi hay mất gì.
- Chạy mượt trên điện thoại tầm trung; người dùng giảm chuyển động vẫn dùng được trọn vẹn.

## 2. Phạm vi

Trong phạm vi: cảnh vườn nhiều lớp, tăng trưởng tự động theo điểm, phản ứng trong ngày, bầu trời theo đồng hồ máy, thời tiết trang trí, tích hợp vào Hôm nay / Khu vườn / Cài đặt, schema v2 kèm di trú, cập nhật test và tài liệu.

Ngoài phạm vi: chủ đề màu hoặc mùa do người dùng chọn, âm thanh, thời tiết thật qua API hoặc vị trí, kéo thả, tranh do họa sĩ cung cấp (cấu trúc cho phép thay sau), thư viện animation bên ngoài (GSAP, Framer Motion).

## 3. Mô hình tăng trưởng

### 3.1 Hai tầng

**Dài hạn (lưu):** mọi phần tử lớn liên tục theo `garden.peakPoints`, điểm cao nhất từng đạt. Không bao giờ giảm.

**Trong ngày (không lưu):** phản ứng tức thì khi hoàn thành nhiệm vụ và cảnh rực rỡ hơn theo tỷ lệ hoàn thành hôm nay.

### 3.2 Điểm và `peakPoints`

- Điểm hiển thị vẫn là `totalPoints(days)`, tính trực tiếp từ lịch sử (thu hồi khi bỏ tick) như spec gốc.
- `garden.peakPoints = max(peakPoints, totalPoints(days))`, cập nhật trong `syncGarden` sau mọi thay đổi `days`. Vườn lớn theo `peakPoints`, nên **bỏ tick không làm cây co lại**.
- Tick, bỏ tick rồi tick lại không làm vườn lớn thêm (tổng không vượt đỉnh cũ), nên không "cày" điểm được.

### 3.3 Phần tử và mức lớn

Mỗi món có `unlockAt` (điểm mở) và `growSpan` (khoảng điểm để lớn trọn vẹn). Mức lớn:

`growth = clamp((peakPoints − unlockAt) / growSpan, 0, 1)` khi `peakPoints ≥ unlockAt` (món hiện); với `growSpan = 0` thì `growth = 1` ngay lúc mở (đồ vật xuất hiện nguyên vẹn bằng hiệu ứng nở ra).

Nhãn giai đoạn để mô tả cho trình đọc màn hình: `growth < 0.25` hạt, `< 0.6` mầm, `< 1` đang lớn, `= 1` trưởng thành.

| Món | Loại | unlockAt | growSpan |
|---|---|---|---|
| Mầm non | cây | 0 | 10 |
| Cỏ xanh (8 cụm) | cây | 0 | 10 |
| Hoa cúc | cây | 10 | 15 |
| Hòn đá | đồ vật | 10 | 0 |
| Hoa tulip | cây | 25 | 20 |
| Hướng dương | cây | 45 | 25 |
| Ghế đá | đồ vật | 45 | 0 |
| Cây táo | cây | 70 | 40 |
| Đèn lồng | đồ vật | 70 | 0 |
| Hồ nước | đồ vật (mực nước dâng theo `growth`) | 100 | 20 |
| Cây anh đào | cây | 140 | 40 |
| Cây cầu nhỏ | đồ vật | 190 | 0 |

Sinh vật (số lượng tăng theo điểm, có trần):
- Bướm: từ 25 điểm, `1 + floor((peak − 25) / 40)`, tối đa 4.
- Chim: từ 70 điểm, `1 + floor((peak − 70) / 60)`, tối đa 3.
- Cá trong hồ: từ 100 điểm, 3 con.
- Đom đóm: từ 100 điểm, chỉ hiện ở pha đêm và hoàng hôn.

**Sinh vật nghỉ ngơi:** bướm và chim chỉ xuất hiện ban ngày không mưa; đom đóm chỉ xuất hiện lúc hoàng hôn và ban đêm không mưa; cá luôn ở trong hồ.

Sau 190 điểm: **mật độ hoa** tăng `floor((peak − 190) / 50)`, tối đa 6 bậc, thêm hoa ở tiền cảnh. Vườn không bao giờ "hết đường".

Vườn luôn có đồi, cỏ và ít nhất một mầm nhỏ ngay từ 0 điểm (không có trạng thái trống).

### 3.4 Tầng trong ngày

Đầu vào: `todayRatio = số nhiệm vụ done / số nhiệm vụ (không tính swapped)`, bằng 0 khi chưa có nhiệm vụ.

- **Tưới:** mỗi lần một nhiệm vụ chuyển sang `done`, store tăng bộ đếm tạm `wateredTick` (không lưu). Cảnh phản ứng một lần: giọt nước rơi, cây nhún.
- **Nắng ấm:** cường độ quầng sáng và tia nắng `0.4 + 0.6 × todayRatio`.
- **Bướm thêm:** `todayRatio ≥ 0.5` thêm tối đa 2 bướm (chỉ nếu bướm đã mở).
- **Cầu vồng:** khi `todayRatio === 1` và có ít nhất một nhiệm vụ.
- Không có hiệu ứng "xấu" nào khi `todayRatio` thấp: chỉ kém rực rỡ hơn, không tối đi, không mưa bão.

## 4. Bầu trời và thời tiết

- **Pha trong ngày** theo giờ địa phương: bình minh 05:00–07:00, ban ngày 07:00–17:00, hoàng hôn 17:00–19:00, đêm 19:00–05:00. Cập nhật mỗi phút. Mặt trời đi theo cung tròn trong 06:00–18:00, mặt trăng trong 18:00–06:00. Ban đêm có sao.
- **Thời tiết trang trí** `weatherFor(dateKey)`: xác định theo ngày (băm của khóa ngày), phân bố nắng đẹp 40 %, nhiều mây 30 %, mưa nhẹ 15 %, sương sớm 15 %. Sương sớm chỉ hiện ở pha bình minh; ở pha khác ngày đó hiển thị như nhiều mây. Luôn đẹp, không có bão, không có cảnh u ám.
- Không dùng vị trí, mạng hay API ngoài.

## 5. Dữ liệu v2

```
AppData.version: 2
garden: { name: string; peakPoints: number }        // bỏ unlockedLevel, placed
settings: { ...; gardenEffects: 'full' | 'calm' | null }   // null = tự động theo hệ thống
```

- `emptyData()` tạo v2 (`peakPoints: 0`, `gardenEffects: null`).
- **Di trú v1 → v2** (`migrateToV2`, hàm thuần): `peakPoints = max(totalPoints(days), LEVEL_THRESHOLDS_V1[unlockedLevel])` với ngưỡng cũ `[0, 10, 25, 45, 70, 100, 140, 190]`; bỏ `placed`; thêm `gardenEffects: null`.
- `parseData` chấp nhận **cả v1 và v2**: v1 được kiểm tra theo luật cũ rồi di trú; v2 kiểm tra `peakPoints` là số hữu hạn ≥ 0 và `gardenEffects` thuộc `'full' | 'calm' | null`. Tệp xuất ra luôn là v2. Dữ liệu `localStorage` v1 cũng được di trú lúc tải.
- Các quy tắc còn lại của `parseData` (kiểm tra từng phần tử, không ghi đè dữ liệu hỏng, sao lưu trước khi bắt đầu lại) giữ nguyên.

## 6. Cảnh SVG nhiều lớp

Phong cách **Organic Biophilic**: hình khối bo tròn, đường cong tự nhiên, gradient mềm, bảng màu hẹp, tinh tế như một sản phẩm sức khỏe chứ không giống game trẻ em. Khung `viewBox` 1000×600, bo góc 24 px, viền trong mảnh.

Chín lớp, từ sau ra trước:

1. **Bầu trời:** bốn gradient theo pha chồng nhau và hòa mờ khi đổi pha (~3 giây); mặt trời, mặt trăng, sao.
2. **Mây xa:** trôi rất chậm.
3. **Đồi xa:** nhạt và hơi xanh (phối cảnh khí quyển).
4. **Đồi gần:** có bóng cây nhỏ.
5. **Mặt đất giữa:** có chỗ cho hồ nước.
6. **Phần tử:** xếp theo trục y (gần che xa); kích thước tăng khi lại gần; mỗi món có bóng tiếp đất (ellipse gradient) và viền sáng mỏng phía mặt trời; sinh vật bay ở lớp này.
7. **Thời tiết:** mưa nhẹ, sương, gợn sóng trên hồ.
8. **Tiền cảnh:** cỏ và hoa lớn, lá lay nhẹ, tối hơn một chút để tạo chiều sâu; mật độ hoa theo `bloomDensity`.
9. **Ánh sáng:** tia nắng, quầng vàng, cầu vồng.

Vị trí các món là các **slot cố định** (`x`, `y` trong 1000×600, `y` quyết định thứ tự và tỷ lệ). Tọa độ cụ thể được tinh chỉnh bằng mắt ở mốc 2 theo ràng buộc: không chồng lấn, xếp theo `y`, hồ nằm ở mặt đất giữa.

Cách vẽ:
- Mỗi món là một component SVG riêng gồm nhiều phần chuyển động độc lập (thân đứng yên, tán lá đung đưa quanh gốc, cánh bướm vỗ); dùng chung một bộ gradient định nghĩa một lần trong `<defs>`.
- **Đổ bóng bằng gradient**; không dùng bộ lọc SVG trên phần tử đang chuyển động. Bộ lọc làm mờ chỉ dùng trên lớp tĩnh.
- Parallax theo con trỏ trên desktop: mỗi lớp lệch một lượng khác nhau, chỉ dùng `transform`, có giới hạn biên độ.

## 7. Chuyển động

Chỉ animate `transform` và `opacity`. Không animate `width`, `height`, `top`, `left`, `filter`.

| Loại | Ví dụ | Thông số |
|---|---|---|
| Nền (lặp) | Mây trôi | 80–140 giây, tuyến tính |
| | Cỏ, lá đung đưa | ±1,5°, 3–5 giây, ease-in-out, lệch pha ngẫu nhiên |
| | Bướm, chim, đom đóm | 12–20 giây |
| | Mưa nhẹ | giọt 0,9–1,4 giây, tối đa 28 giọt |
| | Quầng sáng "thở" | 8 giây, chỉ opacity |
| Phản ứng (một lần) | Tưới khi xong nhiệm vụ | giọt nước vẽ cung, cây nhún ~420 ms, lò xo nhẹ |
| | Đổi mức lớn | 1,2 giây, giảm tốc |
| | Mở khóa món mới | 900 ms: từ hạt nở ra, kèm vòng sáng |
| | Cầu vồng | hiện dần 1,6 giây |

Chuyển động phản ứng nhanh ở lúc phản hồi và mượt ở lúc kết thúc; mọi thời lượng dùng token chung trong một file CSS.

## 8. Hiệu năng

- Tối đa **70** phần tử chuyển động cùng lúc (`ANIMATION_BUDGET`); mưa chiếm 28 và chỉ có trong ngày mưa; sinh vật nghỉ khi mưa hoặc ban đêm; chỉ bốn cụm cỏ, một nửa ngọn cỏ tiền cảnh và 8 ngôi sao chuyển động. Đã đo trong Chrome: ngày nắng ở 600 điểm có 42 animation chạy; chế độ Nhẹ có 0.
- Mọi chuyển động nền **tạm dừng** khi tab bị ẩn (`visibilitychange`) hoặc khi cảnh ngoài khung nhìn (IntersectionObserver).
- Không `will-change` đại trà; chỉ trên vài lớp lớn.
- Chế độ **Nhẹ**: bỏ vòng lặp nền, bỏ parallax, bỏ mưa; tăng trưởng và pha trời vẫn đúng nhưng chuyển trạng thái chỉ hòa mờ 150 ms.
- Mục tiêu đo bằng Chrome: ≥ 55 fps ở chế độ Đầy đủ trên desktop; không có long task > 50 ms do cảnh khi đứng yên.

## 9. Hiệu ứng: Đầy đủ / Nhẹ

- Trong Cài đặt: "Hiệu ứng khu vườn": Đầy đủ / Nhẹ, mặc định theo hệ thống (`gardenEffects = null`).
- Khi hệ điều hành bật `prefers-reduced-motion`, cảnh **luôn** ở chế độ Nhẹ, và Cài đặt nói rõ lý do. Cài đặt của người dùng không được ghi đè thiết lập tiếp cận của hệ thống.

## 10. Tiếp cận

- Cảnh là `role="img"` với `aria-label` do `describeScene` tạo, ví dụ "Khu vườn Mai: buổi sáng, trời nắng nhẹ, hoa cúc đang lớn, cây táo mới nảy mầm". Chi tiết bên trong `aria-hidden`.
- **"Trong vườn của bạn"**: danh sách (dùng được bằng bàn phím và trình đọc màn hình) liệt kê từng món với giai đoạn lớn, và món chưa mở dưới dạng bóng mờ kèm "còn N điểm". Thay cho gợi ý "Sắp mở khóa" cũ và tạo tò mò.
- Mọi chữ nằm **ngoài** cảnh, không đè lên tranh.
- Toast mở khóa giữ `role="status"`.

## 11. Tích hợp màn hình

- **Hôm nay:** cảnh thu nhỏ (khoảng 240 px cao trên điện thoại) nằm trên danh sách nhiệm vụ; chạm để sang tab Khu vườn; phản ứng tưới ngay tại chỗ.
- **Khu vườn:** cảnh lớn (khoảng 55 % chiều cao màn hình), tên vườn sửa ngay bên dưới (`renameGarden` giữ nguyên), rồi "Trong vườn của bạn". Bỏ lưới ô, Đặt / Di chuyển / Gỡ.
- **Cài đặt:** thêm lựa chọn hiệu ứng. Phần "tùy chỉnh khu vườn" của mô tả ban đầu gồm đặt tên và chọn mức hiệu ứng.
- **Toast mở khóa** (`App.tsx`): kích hoạt khi `peakPoints` vượt `unlockAt` của một món.

## 12. Cấu trúc mã nguồn

- `src/domain/garden.ts`: viết lại. `ITEMS` (kèm `unlockAt`, `growSpan`, slot), `getItem`, `growthOf(item, peak)`. Bỏ `canPlace`, `placeItem`, `removeAt`, `moveItem`, `gridSize`, `growthStage`, `levelForPoints`.
- `src/domain/scene.ts` (mới, thuần): `skyPhase(date)`, `weatherFor(dateKey)`, `sceneState(input)`, `describeScene(state, gardenName)`, `creatureCounts(peak)`, `bloomDensity(peak)`.
- `src/domain/scoring.ts`: `syncGarden` nâng `peakPoints`.
- `src/state/storage.ts`: schema v2, `migrateToV2`, `parseData` chấp nhận v1 và v2.
- `src/state/store.ts`: bỏ `placeItem` / `removeItem` / `moveItem`; thêm `wateredTick` (không lưu); `startPersistence` không lưu khi chỉ `wateredTick` đổi.
- `src/ui/garden/` (mới): `GardenScene.tsx`, các lớp, component SVG từng món, `useSceneClock.ts`, `useAmbientPause.ts`, `garden.css`.
- Thay `GardenScreen.tsx`; sửa `Today.tsx`, `SettingsScreen.tsx`, `App.tsx`; bỏ `ItemArt.tsx` (danh sách dùng lại component món ở kích thước nhỏ).
- Cập nhật `AGENTS.md` (quy tắc 2 và 7, cây thư mục), `README.md`, spec gốc (ghi chú bị thay thế một phần).

## 13. Kiểm thử

- **Đơn vị (thuần):** `skyPhase` ở các mốc giờ; `weatherFor` xác định theo ngày và đúng phân bố; `growthOf` tăng đơn điệu, bị chặn 0–1, `growSpan = 0`; số sinh vật và `bloomDensity` đúng và có trần; `syncGarden` chỉ tăng `peakPoints`; **bỏ tick không làm giảm tăng trưởng**; `describeScene`; `migrateToV2` từ v1 (giữ ít nhất mức cũ); `parseData` chấp nhận v1 và v2, từ chối dữ liệu sai.
- **Component:** `GardenScene` có nhãn mô tả; chế độ Nhẹ không có lớp chuyển động nền; danh sách "Trong vườn của bạn" hiện bóng mờ và "còn N điểm"; cầu vồng chỉ khi đủ ngày.
- **Store:** `wateredTick` tăng khi chuyển sang `done` và không kích hoạt lưu.
- **E2E:** hoàn thành nhiệm vụ thì thuộc tính mức lớn của cảnh tăng; tải lại vẫn giữ.
- **Hình ảnh:** chụp màn hình thật bằng Chrome ở 375 px và 768 px, sáng/tối, bốn pha trong ngày, bốn loại thời tiết, mức điểm 0 / 45 / 100 / 190+; đo fps. Dùng làm vòng tinh chỉnh nghệ thuật, không chỉ dựa vào code.

## 14. Thứ tự thực hiện (5 mốc)

1. Domain, di trú v1→v2, store (TDD, chưa động giao diện).
2. Cảnh tĩnh nhiều lớp ở trạng thái cuối, chụp màn hình để chỉnh nghệ thuật.
3. Chuyển động nền, thời tiết, phản ứng khi hoàn thành, chế độ Nhẹ.
4. Tích hợp Hôm nay, Khu vườn, Cài đặt, toast.
5. Đo hiệu năng và tiếp cận, E2E, cập nhật tài liệu.

## 15. Rủi ro

- **Chất lượng nghệ thuật** là rủi ro lớn nhất: SVG vẽ bằng code sẽ đẹp và nhất quán nhưng không bằng họa sĩ chuyên nghiệp. Giảm thiểu bằng vòng chụp màn hình; vì mỗi món là một component độc lập nên có thể thay bằng tranh của họa sĩ sau này mà không động tới logic.
- **Hiệu năng máy yếu:** có chế độ Nhẹ và trần số phần tử chuyển động.
- **Xung đột với khuyến nghị "ít chuyển động trang trí":** giải quyết bằng trần phần tử, tạm dừng ngoài khung nhìn và khi tab ẩn, và tắt hoàn toàn khi người dùng giảm chuyển động.
- **Khối lượng lớn** (ước 12–15 task); mốc 1–2 cho kết quả nhìn thấy sớm.
