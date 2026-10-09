@AGENTS.md

## Dành riêng cho Claude

- Trả lời người dùng bằng **tiếng Việt**; giữ nguyên tên file, lệnh, định danh code bằng tiếng Anh.
- Làm theo workflow superpowers đã dùng ở repo này: với việc mới, brainstorm trước (spec ở `docs/superpowers/specs/`), rồi lập kế hoạch (`docs/superpowers/plans/`), rồi thực thi theo TDD. Thay đổi nhỏ trong code có sẵn thì chỉ cần nêu thiết kế ngắn và chờ người dùng đồng ý.
- Không commit hay push khi người dùng chưa yêu cầu. Khi commit, kết thúc message bằng dòng `Co-Authored-By` theo hướng dẫn hiện hành của phiên.
- Thư mục `.superpowers/` là scratch của quy trình (đã nằm trong `.gitignore`); đừng commit.
- Cẩn thận khi xóa hoặc ghi đè dữ liệu người dùng trong code: giữ hành vi "không xóa âm thầm" (xác nhận hai bước, sao lưu trước khi bắt đầu lại).
