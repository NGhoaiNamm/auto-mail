# Gmail Daily Mail Bot (JavaScript)

Bot này gửi 1 email mỗi ngày tới địa chỉ `namkimu46@gmail.com` bằng Gmail SMTP.
Nội dung email được tổng hợp từ RSS theo định dạng bản tin sinh động (có icon, có bố cục dễ đọc), gồm:

- Giá xăng dầu
- Công nghệ
- Tài chính
- Sức khỏe

Mỗi mục đều có tóm tắt 3-5 dòng và link nguồn tham khảo.
Bot lấy tin ngay lúc thực thi (không cache), ưu tiên bài mới trong cửa sổ thời gian gần nhất.
Lịch mặc định trên GitHub Actions: 09:00 GMT+7 (tương ứng cron UTC 0 2 \* \* \*).

## 1) Yêu cầu

- Node.js 18+ (khuyến nghị Node.js 20)
- Tài khoản Gmail đã bật 2FA
- Gmail App Password (16 ký tự)

## 2) Chạy local

1. Cai dependencies:
   - `npm install`
2. Tao file `.env` tu `.env.example` va dien gia tri that.
3. Gui thu:

- `npm run send:daily`

Nếu muốn test không gửi thật:

- Đặt `DRY_RUN=true` trong `.env`
- Chạy `npm run send:daily`

## 3) Cấu hình Gmail App Password

1. Mở Google Account > Security.
2. Bật 2-Step Verification.
3. Vao App passwords.
4. Tạo App Password mới, copy mật khẩu 16 ký tự.
5. Dùng mật khẩu này cho `GMAIL_APP_PASSWORD` (không dùng mật khẩu đăng nhập Gmail thông thường).

## 4) GitHub Actions secrets

Trong repo GitHub, vào:

- Settings > Secrets and variables > Actions > New repository secret

Tạo các secret sau:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `MAIL_SUBJECT` (optional)

Workflow: `.github/workflows/daily-mail.yml`

- Chạy tự động mỗi ngày lúc 09:00 GMT+7
- Có thể bấm Run workflow để test ngay

## 5) Biến môi trường

- `GMAIL_USER`: Gmail người gửi (optional, mặc định dùng MAIL_TO)
- `GMAIL_APP_PASSWORD`: App password Gmail
- `MAIL_TO`: Người nhận (mặc định namkimu46@gmail.com)
- `MAIL_SUBJECT`: Tiêu đề email
- `MAIL_TIMEZONE`: Múi giờ format timestamp (mặc định Asia/Ho_Chi_Minh)
- `MAIL_MAX_RETRIES`: Số lần retry khi lỗi tạm thời (mặc định 2)
- `MAIL_RECENT_HOURS`: Cửa sổ lọc tin mới gần nhất tính đến lúc gửi (mặc định 24 giờ)
- `DRY_RUN`: true/false

## 6) Xử lý sự cố nhanh

- Lỗi `Invalid login`:
  - Kiểm tra đã dùng App Password chưa.
- Không thấy email:
  - Kiểm tra Spam/Promotions.
- Workflow fail vì thiếu env:
  - Kiểm tra đã tạo đủ secrets trên GitHub chưa.
