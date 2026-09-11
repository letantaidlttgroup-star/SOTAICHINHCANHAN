// Giá tham chiếu: Vàng SJC (VND/lượng) & Bạc Ancarat (VND/kg).
// Lưu cục bộ; áp vào các tài sản kim loại quý = giá quy đổi theo đơn vị + biên độ (±).
import { db } from '../db/db';

const K = { gold: 'pw_ref_gold_luong', silver: 'pw_ref_silver_kg', gTs: 'pw_ref_gold_ts', sTs: 'pw_ref_silver_ts' };
const G_PER_LUONG = 37.5, G_PER_CHI = 3.75;

export const getGoldRefPerLuong = () => Number(localStorage.getItem(K.gold)) || 0;
export const getSilverRefPerKg = () => Number(localStorage.getItem(K.silver)) || 0;
export const getGoldTs = () => Number(localStorage.getItem(K.gTs)) || 0;
export const getSilverTs = () => Number(localStorage.getItem(K.sTs)) || 0;
export const setGoldRefPerLuong = (v: number) => { localStorage.setItem(K.gold, String(v)); localStorage.setItem(K.gTs, String(Date.now())); };
export const setSilverRefPerKg = (v: number) => { localStorage.setItem(K.silver, String(v)); localStorage.setItem(K.sTs, String(Date.now())); };

function goldPerUnit(unit: string): number {
  const l = getGoldRefPerLuong(); if (!l) return 0;
  if (unit === 'luong') return l;
  if (unit === 'chi') return l / 10;
  if (unit === 'gram') return l / G_PER_LUONG;
  return l / 10;
}
function silverPerUnit(unit: string): number {
  const kg = getSilverRefPerKg(); if (!kg) return 0;
  const perG = kg / 1000;
  if (unit === 'gram') return perG;
  if (unit === 'chi') return perG * G_PER_CHI;
  if (unit === 'luong') return perG * G_PER_LUONG;
  if (unit === 'unit') return kg; // 1 "đơn vị" = 1 kg
  return perG;
}

/** Áp giá tham chiếu (+ biên độ ±) vào mọi tài sản kim loại quý. */
export async function applyReferences(): Promise<void> {
  const assets = await db.assets.where('assetClass').equals('preciousMetal').toArray();
  for (const a of assets) {
    const isSilver = a.metalType === 'silver';
    const base = isSilver ? silverPerUnit(a.unit) : goldPerUnit(a.unit);
    if (base <= 0) continue;
    const price = Math.round(base + (a.priceOffset ?? 0));
    await db.assets.update(a.id, { latestUnitPrice: price, priceUpdatedAt: Date.now() });
  }
}

// ── Tự kéo giá (best-effort qua proxy công khai). Có thể cần tinh chỉnh parser. ──
// Thử lần lượt nhiều proxy công khai (chúng hay chập chờn).
const PROXIES: ((u: string) => string)[] = [
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];
async function proxyText(url: string): Promise<string | null> {
  for (const mk of PROXIES) {
    try {
      const r = await fetch(mk(url));
      if (r.ok) { const t = await r.text(); if (t && t.length > 10) return t; }
    } catch { /* thử proxy kế tiếp */ }
  }
  return null;
}

// Gọi function riêng trên Netlify (cùng tên miền → không CORS). Localhost sẽ trượt về proxy.
async function ownFn(path: string): Promise<{ ok?: boolean; perLuong?: number; perKg?: number } | null> {
  try { const r = await fetch(path); if (r.ok) return await r.json(); } catch { /* không có function */ }
  return null;
}

// Bảo Tín Minh Châu — API JSON công khai (gọi qua proxy để tránh CORS + mixed-content).
export async function fetchGoldBTMC(): Promise<number | null> {
  const own = await ownFn('/.netlify/functions/gold');
  if (own?.ok && own.perLuong) return own.perLuong;
  try {
    const url = 'http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v';
    const text = await proxyText(url);
    if (!text) return null;
    const json = JSON.parse(text);
    let data = json?.DataList?.Data;
    if (!Array.isArray(data)) data = data ? [data] : [];
    const cands: { name: string; sell: number }[] = [];
    for (const it of data as Record<string, string>[]) {
      const row = it['@row'];
      const name = String(it['@n_' + row] ?? '');
      const sell = parseFloat(String(it['@ps_' + row] ?? '').replace(/[^\d]/g, ''));
      if (sell) cands.push({ name, sell });
    }
    const pick = cands.find((c) => /SJC/i.test(c.name)) || cands.find((c) => /999/.test(c.name)) || cands[0];
    if (!pick) return null;
    let v = pick.sell;
    if (v > 0 && v < 30_000_000) v *= 10; // BTMC báo theo chỉ → quy về lượng
    return v || null;
  } catch { return null; }
}

export async function fetchSilverAncarat(): Promise<number | null> {
  const own = await ownFn('/.netlify/functions/silver');
  if (own?.ok && own.perKg) return own.perKg;
  try {
    const html = await proxyText('https://ancarat.com/');
    if (!html) return null;
    const m = html.match(/1\s?kg[\s\S]{0,300}?([\d.]{7,})/i);
    if (!m) return null;
    const raw = parseFloat(m[1].replace(/\./g, ''));
    return raw || null;
  } catch { return null; }
}
