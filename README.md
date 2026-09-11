# Personal Wealth — Web/PWA quản lý tài sản, dòng tiền & vay–nợ cá nhân

App local-first: dữ liệu nằm hoàn toàn trong trình duyệt (IndexedDB qua Dexie),
không gửi lên server. Cài được lên màn hình chính (PWA), chạy offline.

## Chạy thử
```bash
npm install
npm run dev      # mở http://localhost:5173
```
App khởi đầu SẠCH: chỉ có sẵn một ví "Tiền mặt" (số 0) và bộ danh mục
mặc định để anh ghi giao dịch ngay. Mọi số liệu do anh tự nhập.

## Build & cài như app
```bash
npm run build
npm run preview  # bản build có service worker; "Thêm vào màn hình chính" để cài
```

## Cấu trúc
- `src/db/` — mô hình dữ liệu & logic (Dexie): db, valuation, cashflow, debts, sinking
- `src/lib/` — format, service singleton, seed dữ liệu mẫu
- `src/components/` — TabBar, QuickAdd, UI dùng chung
- `src/screens/` — Dashboard (các màn còn lại dựng ở bước sau)

## Xóa toàn bộ dữ liệu
Menu (☰) → Cài đặt chung → Dữ liệu & hệ thống → "Xóa toàn bộ dữ liệu".
Nên bấm "Sao lưu" trước để giữ một bản JSON.

## Deploy lên Netlify qua GitHub (bật auto-fetch giá vàng BTMC)

Để hàm lấy giá vàng (`netlify/functions/gold.mjs`) hoạt động, phải deploy qua
Netlify + GitHub (không dùng kéo–thả tĩnh):

1. Đưa toàn bộ thư mục này lên một repo GitHub
   (GitHub Desktop, hoặc "Add file → Upload files" trên web).
2. Netlify → **Add new site → Import an existing project** → chọn repo.
3. Netlify tự đọc `netlify.toml`:
   - Build command: `npm run build`
   - Publish: `dist`
   - Functions: `netlify/functions`
   Bấm **Deploy**.
4. Xong: có một địa chỉ cố định `https://<tên>.netlify.app`.
   - App tự gọi `/.netlify/functions/gold` để lấy giá vàng BTMC (ổn định,
     không dính CORS).
   - Mỗi lần push code mới lên GitHub, Netlify tự build lại; bản PWA đã cài
     trên máy tự nhận bản mới.

Kiểm tra hàm sau khi deploy: mở thẳng `https://<tên>.netlify.app/.netlify/functions/gold`
trên trình duyệt — phải thấy JSON có `perLuong` và danh sách `all`.

Lưu ý: chạy `npm run dev` ở máy sẽ KHÔNG có function (trừ khi dùng `netlify dev`),
nên "Lấy từ BTMC" ở localhost sẽ rơi về proxy công khai (chập chờn). Cứ test trên
site Netlify đã deploy.
