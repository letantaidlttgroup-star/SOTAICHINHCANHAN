// valuation.ts — Personal Wealth (Web/PWA)
// Module 2a: Tầng nghiệp vụ phía TÀI SẢN — quy đổi tiền tệ, lấy giá thị trường,
// tính Net Worth (đã gồm phải-thu/phải-trả cá nhân), phân bổ, snapshot theo ngày.

import {
  db,
  type Asset,
  type Liability,
  type Debt,
  type DebtPayment,
  type AssetClass,
  type NetWorthSnapshot,
  currentValue,
  totalCost,
  debtOutstanding,
  computeWalletBalance,
  newId,
} from './db';

export const startOfDay = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* ────────────────────────────────────────────────────────────
 * Quy đổi tiền tệ (base = VND)
 * ──────────────────────────────────────────────────────────── */

export interface ExchangeRateProviding {
  rateToBase(currencyCode: string): number;
}

export class CurrencyConverter implements ExchangeRateProviding {
  static readonly baseCode = 'VND';
  private rates: Record<string, number> = { VND: 1, USD: 25_400, EUR: 27_500 };

  rateToBase(code: string): number { return this.rates[code] ?? 1; }
  convertToBase(amount: number, code: string): number { return amount * this.rateToBase(code); }
  setRate(code: string, ratePerUnit: number): void { this.rates[code] = ratePerUnit; }
  get allRates(): Readonly<Record<string, number>> { return this.rates; }
}

/* ────────────────────────────────────────────────────────────
 * Lấy giá thị trường — pluggable
 * ──────────────────────────────────────────────────────────── */

export interface MarketPrice {
  symbol: string;
  unitPrice: number;
  currencyCode: string;
  asOf: number;
}

export interface PriceProvider {
  readonly supportedClass: AssetClass;
  fetchPrice(symbol: string): Promise<MarketPrice>;
}

export class PriceUpdateService {
  private providers = new Map<AssetClass, PriceProvider>();
  constructor(providers: PriceProvider[]) {
    for (const p of providers) this.providers.set(p.supportedClass, p);
  }

  async refreshPrices(): Promise<void> {
    const assets = await db.assets.toArray();
    for (const asset of assets) {
      const provider = this.providers.get(asset.assetClass);
      if (!provider || !asset.marketSymbol) continue;
      try {
        const price = await provider.fetchPrice(asset.marketSymbol);
        await db.assets.update(asset.id, {
          latestUnitPrice: price.unitPrice,
          priceUpdatedAt: price.asOf,
        });
        await db.pricePoints.add({
          id: newId(), assetId: asset.id, date: price.asOf, unitPrice: price.unitPrice,
        });
      } catch {
        // Lỗi mạng → giữ giá cũ.
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────
 * ValuationService — Net Worth, phân bổ, snapshot
 * ──────────────────────────────────────────────────────────── */

export interface NetWorthBreakdown {
  assets: number;       // tổng tài sản (VND)
  liabilities: number;  // vay chính thức (VND)
  receivable: number;   // người khác nợ mình (VND)
  payable: number;      // mình nợ người khác (VND)
  netWorth: number;     // assets + receivable − liabilities − payable
  allocation: Record<AssetClass, number>;
}

export class ValuationService {
  constructor(private converter: CurrencyConverter) {}

  valueInBase(a: Asset): number {
    return this.converter.convertToBase(currentValue(a), a.currencyCode);
  }
  costInBase(a: Asset): number {
    return this.converter.convertToBase(totalCost(a), a.currencyCode);
  }
  balanceInBase(l: Liability): number {
    return this.converter.convertToBase(l.currentBalance, l.currencyCode);
  }

  totalAssets(assets: Asset[]): number {
    return assets.reduce((s, a) => s + this.valueInBase(a), 0);
  }
  totalLiabilities(liabilities: Liability[]): number {
    return liabilities.reduce((s, l) => s + this.balanceInBase(l), 0);
  }

  allocationByClass(assets: Asset[]): Partial<Record<AssetClass, number>> {
    const out: Partial<Record<AssetClass, number>> = {};
    for (const a of assets) {
      out[a.assetClass] = (out[a.assetClass] ?? 0) + this.valueInBase(a);
    }
    return out;
  }

  /** Tổng phải-thu / phải-trả cá nhân đang mở, quy về VND. */
  private outstandingTotals(
    debts: Debt[],
    payments: DebtPayment[],
  ): { receivable: number; payable: number } {
    const byDebt = new Map<string, DebtPayment[]>();
    for (const p of payments) {
      const arr = byDebt.get(p.debtId) ?? [];
      arr.push(p);
      byDebt.set(p.debtId, arr);
    }
    let receivable = 0;
    let payable = 0;
    for (const d of debts) {
      if (d.isSettled) continue;
      const out = debtOutstanding(d, byDebt.get(d.id) ?? []);
      const inBase = this.converter.convertToBase(out, d.currencyCode);
      if (d.direction === 'owedToMe') receivable += inBase;
      else payable += inBase;
    }
    return { receivable, payable };
  }

  /** Bức tranh Net Worth hiện tại (cho Dashboard). */
  /** Bức tranh Net Worth hiện tại (cho Dashboard). Tài sản GỒM cả tiền trong ví. */
  async netWorthBreakdown(): Promise<NetWorthBreakdown> {
    const [assets, liabilities, debts, payments, wallets, txns] = await Promise.all([
      db.assets.toArray(),
      db.liabilities.toArray(),
      db.debts.toArray(),
      db.debtPayments.toArray(),
      db.wallets.toArray(),
      db.transactions.toArray(),
    ]);

    // Tiền trong ví (quy về VND) — cũng là tài sản.
    let cash = 0;
    for (const w of wallets) {
      if (w.isArchived) continue;
      cash += this.converter.convertToBase(computeWalletBalance(w, txns), w.currencyCode);
    }

    const assetVal = this.totalAssets(assets);
    const totalA = assetVal + cash;
    const l = this.totalLiabilities(liabilities);
    const { receivable, payable } = this.outstandingTotals(debts, payments);

    const allocation = this.allocationByClass(assets) as Record<AssetClass, number>;
    allocation.cash = (allocation.cash ?? 0) + cash; // gộp tiền ví vào lớp "Tiền mặt"

    return {
      assets: totalA,
      liabilities: l,
      receivable,
      payable,
      netWorth: totalA + receivable - l - payable,
      allocation,
    };
  }

  /** Chụp/ghi đè snapshot của HÔM NAY. */
  async captureDailySnapshot(now: number = Date.now()): Promise<NetWorthSnapshot> {
    const b = await this.netWorthBreakdown();
    const snapshots = await db.snapshots.toArray();
    const today = startOfDay(now);

    const base = {
      date: today,
      totalAssets: b.assets,
      totalLiabilities: b.liabilities,
      totalReceivable: b.receivable,
      totalPayable: b.payable,
      netWorth: b.netWorth,
      allocation: b.allocation,
    };

    const existing = snapshots.find((s) => startOfDay(s.date) === today);
    if (existing) {
      const updated: NetWorthSnapshot = { ...existing, ...base };
      await db.snapshots.put(updated);
      return updated;
    }
    const snap: NetWorthSnapshot = { id: newId(), ...base };
    await db.snapshots.add(snap);
    return snap;
  }
}
