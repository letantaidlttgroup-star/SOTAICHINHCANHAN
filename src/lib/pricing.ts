// Nguồn giá thật (chạy trong trình duyệt của người dùng).
// - Crypto: CoinGecko (công khai, cho phép CORS).
// - Tỷ giá USD→VND: open.er-api.com (công khai, CORS).
// - Vàng/chứng khoán VN: chưa có nguồn gọi trực tiếp được (CORS) → cập nhật tay
//   ở màn chi tiết, hoặc nối API qua proxy sau này.
import { db, type AssetClass } from '../db/db';
import { PriceUpdateService, type PriceProvider, type MarketPrice } from '../db/valuation';
import { converter } from './services';
import { fetchGoldBTMC, fetchSilverAncarat, setGoldRefPerLuong, setSilverRefPerKg, applyReferences } from './reference';

// Ánh xạ mã crypto phổ biến → id CoinGecko
const CG: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  ADA: 'cardano', XRP: 'ripple', DOGE: 'dogecoin', USDT: 'tether',
  TON: 'the-open-network', DOT: 'polkadot', MATIC: 'matic-network',
  AVAX: 'avalanche-2', LINK: 'chainlink', TRX: 'tron', NEAR: 'near',
};

class CryptoProvider implements PriceProvider {
  readonly supportedClass: AssetClass = 'crypto';
  async fetchPrice(symbol: string): Promise<MarketPrice> {
    const id = CG[symbol.toUpperCase()] ?? symbol.toLowerCase();
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=vnd`);
    if (!res.ok) throw new Error('coingecko ' + res.status);
    const json = await res.json();
    const price = json?.[id]?.vnd;
    if (!price) throw new Error('no price for ' + symbol);
    return { symbol, unitPrice: price, currencyCode: 'VND', asOf: Date.now() };
  }
}

export const priceUpdater = new PriceUpdateService([new CryptoProvider()]);

/** Cập nhật tỷ giá USD→VND cho bộ quy đổi. Lỗi thì giữ tỷ giá cũ. */
export async function refreshFxRate(): Promise<void> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await res.json();
    const vnd = json?.rates?.VND;
    if (typeof vnd === 'number') converter.setRate('USD', vnd);
  } catch {
    /* giữ tỷ giá mặc định */
  }
}

/** Làm mới toàn bộ: tỷ giá + giá các tài sản có nguồn (hiện: crypto). */
export async function refreshMarketData(): Promise<void> {
  await refreshFxRate();
  await priceUpdater.refreshPrices();
  // kéo giá tham chiếu (best-effort) rồi áp vào tài sản vàng/bạc
  const g = await fetchGoldBTMC(); if (g) setGoldRefPerLuong(g);
  const s = await fetchSilverAncarat(); if (s) setSilverRefPerKg(s);
  await applyReferences();
}
