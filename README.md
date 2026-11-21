# python_PRJ

| Lệnh | Công dụng |
|---|---|
| `git status` | Xem trạng thái file hiện tại |
| `git branch` | Xem các branch, dấu `*` là branch hiện tại |
| `git switch <branch>` | Chuyển sang branch khác |
| `git pull origin main` | Lấy code mới nhất từ `main` |
| `git add .` | Đưa tất cả thay đổi vào staging |
| `git add <file>` | Chỉ thêm một file |
| `git commit -m "message"` | Tạo commit |
| `git push origin main` | Đẩy commit lên branch `main` |
| `git log --oneline` | Xem lịch sử commit ngắn gọn |
| `git diff` | Xem những gì đã thay đổi nhưng chưa `add` |
| `git clone <URL>` | Tải repository từ GitHub về máy |

## Khởi chạy backend

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Khi backend khởi động lần đầu, [seed_demo_data.py](backend/scripts/seed_demo_data.py) tự thêm:

- tài khoản admin `admin@vocab.local`
- tài khoản user `learner@vocab.local`
- cấp độ, chủ đề, bài học và 61 từ mẫu
- tiến độ demo cho 10 từ đầu trong chủ đề Everyday Life
- file MP3 phát âm cho từng từ đang active

Mật khẩu demo mặc định:

- Admin: `AdminDemo2026!`
- User: `UserDemo2026!`

Có thể tùy chỉnh bằng biến môi trường `DEMO_ADMIN_PASSWORD` và `DEMO_USER_PASSWORD` trước khi khởi động.
