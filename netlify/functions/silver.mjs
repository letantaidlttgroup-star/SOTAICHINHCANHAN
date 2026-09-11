// Lấy giá bạc 1kg từ Ancarat (best-effort — trang có Cloudflare, có thể cần chỉnh).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export const handler = async () => {
  try {
    const res = await fetch('https://ancarat.com/', { headers: { 'User-Agent': UA } });
    const html = await res.text();
    // tìm cụm "1kg" rồi số tiền gần đó (heuristic — báo lại nếu sai)
    const m = html.match(/1\s?kg[\s\S]{0,400}?([\d.]{7,})\s*(?:đ|vnd|₫)/i) || html.match(/([\d.]{7,})\s*(?:đ|vnd|₫)[\s\S]{0,200}?1\s?kg/i);
    if (!m) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, reason: 'no-match', len: html.length }) };
    const perKg = parseFloat(m[1].replace(/\./g, ''));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: !!perKg, perKg: perKg || 0 }) };
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, reason: String(e) }) };
  }
};
