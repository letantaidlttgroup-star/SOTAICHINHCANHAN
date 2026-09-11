// db.ts — Personal Wealth (Web/PWA)
// Module 1 (cập nhật): Kiến trúc dữ liệu — local-first bằng Dexie.js trên IndexedDB.
//
// Cài đặt:  npm i dexie
// Lần này thêm: Vay–Nợ cá nhân HAI CHIỀU (Debt) + lịch sử trả từng lần (DebtPayment),
// và bổ sung phải-thu / phải-trả vào NetWorthSnapshot.

import Dexie, { type EntityTable } from 'dexie';

/* ────────────────────────────────────────────────────────────
 * 1. Enums
 * ──────────────────────────────────────────────────────────── */

export const ASSET_CLASSES = [
  'cash', 'bankAccount', 'realEstate', 'stock',
  'crypto', 'preciousMetal', 'gemstone', 'jewelry', 'other',
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const MARKET_PRICED_CLASSES: AssetClass[] = ['stock', 'crypto', 'preciousMetal'];
export const isMarketPriced = (c: AssetClass) => MARKET_PRICED_CLASSES.includes(c);

export const ASSET_CLASS_META: Record<AssetClass, { label: string; icon: string }> = {
  cash:          { label: 'Tiền mặt',       icon: 'banknote' },
  bankAccount:   { label: 'Ngân hàng',      icon: 'building-columns' },
  realEstate:    { label: 'Bất động sản',   icon: 'home' },
  stock:         { label: 'Chứng khoán',    icon: 'trending-up' },
  crypto:        { label: 'Crypto',         icon: 'bitcoin' },
  preciousMetal: { label: 'Kim loại quý',   icon: 'hexagon' },
  gemstone:      { label: 'Đá quý',         icon: 'diamond' },
  jewelry:       { label: 'Trang sức',      icon: 'sparkles' },
  other:         { label: 'Khác',           icon: 'box' },
};

export type MetalType = 'goldBar' | 'goldRing' | 'silver' | 'platinum';

// Quy đổi vàng VN: 1 lượng = 10 chỉ ≈ 37.5 gram
export type QuantityUnit = 'chi' | 'luong' | 'gram' | 'carat' | 'share' | 'unit';

export type TransactionKind = 'income' | 'expense' | 'transfer';
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Vay CHÍNH THỨC (ngân hàng): thế chấp, thẻ tín dụng, trả góp...
export type LiabilityKind =
  | 'creditCard' | 'mortgage' | 'personalLoan' | 'autoLoan' | 'other';

// Vay–Nợ CÁ NHÂN (người với người), hai chiều:
export type DebtDirection = 'iOwe' | 'owedToMe';
// iOwe     = mình vay người khác  → phải TRẢ
// owedToMe = người khác vay mình  → phải THU

export const WALLET_TYPES = ['cash', 'bank', 'ewallet', 'savings', 'other'] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const WALLET_TYPE_META: Record<WalletType, { label: string; icon: string }> = {
  cash:    { label: 'Tiền mặt',   icon: 'wallet' },
  bank:    { label: 'Ngân hàng',  icon: 'building-columns' },
  ewallet: { label: 'Ví điện tử', icon: 'smartphone' },
  savings: { label: 'Tiết kiệm',  icon: 'piggy-bank' },
  other:   { label: 'Khác',       icon: 'wallet' },
};

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/* ────────────────────────────────────────────────────────────
 * 2. Value types
 * ──────────────────────────────────────────────────────────── */

export interface GemSpec {
  caratWeight?: number;
  color?: string;
  clarity?: string;
  cut?: string;
  certificate?: string;
}

/* ────────────────────────────────────────────────────────────
 * 3. Entities
 * ──────────────────────────────────────────────────────────── */

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  currencyCode: string;
  initialBalance: number;
  icon: string;
  colorHex: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface Asset {
  id: string;
  name: string;
  assetClass: AssetClass;
  currencyCode: string;
  notes?: string;
  createdAt: number;
  purchaseDate?: number;

  quantity: number;
  unit: QuantityUnit;
  costBasisPerUnit: number;

  manualUnitValue?: number;

  marketSymbol?: string;
  latestUnitPrice?: number;
  priceUpdatedAt?: number;

  metalType?: MetalType;
  purity?: string;
  gemSpec?: GemSpec;
  priceOffset?: number;   // ± biên độ so với giá tham chiếu (VND / đơn vị)
}

export interface PricePoint {
  id: string;
  assetId: string;
  date: number;
  unitPrice: number;
}

export interface Transaction {
  id: string;
  amount: number;
  kind: TransactionKind;
  date: number;
  note?: string;
  currencyCode: string;
  categoryId?: string;
  tagIds: string[];
  linkedAssetId?: string;

  walletId?: string;       // income → ví NHẬN | expense → ví CHI
  fromWalletId?: string;   // transfer: ví nguồn
  toWalletId?: string;     // transfer: ví đích
  recurringRuleId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  colorHex: string;
  kind: TransactionKind;
  parentId?: string;       // danh mục cha (2 cấp)
}

export interface Tag {
  id: string;
  name: string;
}

export interface Budget {
  id: string;
  name: string;
  limitAmount: number;
  period: BudgetPeriod;
  startDate: number;
  alertThreshold: number;
  categoryId?: string;
}

export interface RecurringRule {
  id: string;
  name: string;

  amount: number;
  kind: TransactionKind;
  currencyCode: string;
  categoryId?: string;
  walletId?: string;
  fromWalletId?: string;
  toWalletId?: string;
  note?: string;
  tagIds: string[];

  frequency: Frequency;
  interval: number;
  startDate: number;
  nextRunDate: number;
  endDate?: number;

  reminderEnabled: boolean;
  reminderLeadDays: number;

  isActive: boolean;
}

// Vay chính thức (ngân hàng)
export interface Liability {
  id: string;
  name: string;
  kind: LiabilityKind;
  currentBalance: number;
  originalAmount: number;
  currencyCode: string;
  interestRate?: number;
  startDate: number;
  dueDate?: number;
  notes?: string;
}

// MỚI: Vay–Nợ cá nhân (hai chiều)
export interface Debt {
  id: string;
  direction: DebtDirection;     // iOwe | owedToMe
  counterparty: string;         // tên người vay / cho vay
  counterpartyContact?: string; // sđt / ghi chú liên hệ
  principal: number;            // số tiền gốc
  currencyCode: string;
  startDate: number;            // ngày vay / cho vay
  dueDate?: number;             // hạn trả / hạn thu
  interestRate?: number;        // %/năm (thường 0 với vay cá nhân)
  note?: string;
  isSettled: boolean;           // đã tất toán

  reminderEnabled: boolean;     // nhắc trả / nhắc đòi
  reminderLeadDays: number;     // nhắc trước mấy ngày
  createdAt: number;
}

// MỚI: mỗi lần trả/thu một phần khoản nợ
export interface DebtPayment {
  id: string;
  debtId: string;
  date: number;
  amount: number;
  note?: string;
  walletId?: string;            // (tùy chọn) ví thực nhận/chi khi thanh toán
}

// MỚI: Quỹ tích lũy dần — để dành trước cho khoản chi lớn theo chu kỳ
// (vd bảo hiểm nhân thọ 15tr đóng vào tháng 10 → dành ~1,25tr/tháng).
export interface SinkingFund {
  id: string;
  name: string;
  targetAmount: number;         // số cần đủ khi tới hạn
  currencyCode: string;
  dueDate: number;              // ngày cần đủ tiền
  recurringRuleId?: string;     // (tùy chọn) khoản định kỳ nó dành cho
  walletId?: string;            // (tùy chọn) ví giữ tiền tích lũy
  reminderEnabled: boolean;
  reminderDayOfMonth?: number;  // nhắc để dành vào ngày nào mỗi tháng
  isActive: boolean;
  createdAt: number;
}

export interface SinkingContribution {
  id: string;
  fundId: string;
  date: number;
  amount: number;               // earmark: đánh dấu phần tiền đã để dành
}

export interface NetWorthSnapshot {
  id: string;
  date: number;
  totalAssets: number;
  totalLiabilities: number;     // vay chính thức (ngân hàng)
  totalReceivable: number;      // người khác nợ mình (phải thu) — cộng vào net worth
  totalPayable: number;         // mình nợ người khác (phải trả) — trừ khỏi net worth
  netWorth: number;
  allocation: Record<AssetClass, number>;
}

/* ────────────────────────────────────────────────────────────
 * 4. Hàm thuần cho giá trị dẫn xuất
 * ──────────────────────────────────────────────────────────── */

// --- Tài sản ---
export const currentUnitValue = (a: Asset): number =>
  a.latestUnitPrice ?? a.manualUnitValue ?? a.costBasisPerUnit;
export const currentValue  = (a: Asset): number => currentUnitValue(a) * a.quantity;
export const totalCost     = (a: Asset): number => a.costBasisPerUnit * a.quantity;
export const profitLoss    = (a: Asset): number => currentValue(a) - totalCost(a);
export const profitLossPct = (a: Asset): number => {
  const c = totalCost(a);
  return c === 0 ? 0 : profitLoss(a) / c;
};

// --- Ví: số dư luôn được TÍNH, không lưu cứng ---
export const walletDelta = (t: Transaction, walletId: string): number => {
  if (t.kind === 'income'  && t.walletId === walletId)     return  t.amount;
  if (t.kind === 'expense' && t.walletId === walletId)     return -t.amount;
  if (t.kind === 'transfer') {
    if (t.fromWalletId === walletId) return -t.amount;
    if (t.toWalletId   === walletId) return  t.amount;
  }
  return 0;
};
export const computeWalletBalance = (wallet: Wallet, txns: Transaction[]): number =>
  wallet.initialBalance + txns.reduce((s, t) => s + walletDelta(t, wallet.id), 0);
export const totalWalletBalance = (wallets: Wallet[], txns: Transaction[]): number =>
  wallets
    .filter(w => !w.isArchived)
    .reduce((s, w) => s + computeWalletBalance(w, txns), 0);

// --- Nợ chính thức ---
export const paidOffRatio = (l: Liability): number =>
  l.originalAmount === 0 ? 0 : Math.max(0, 1 - l.currentBalance / l.originalAmount);

// --- Vay–Nợ cá nhân ---
export const debtPaid = (payments: DebtPayment[]): number =>
  payments.reduce((s, p) => s + p.amount, 0);
export const debtOutstanding = (debt: Debt, payments: DebtPayment[]): number =>
  Math.max(0, debt.principal - debtPaid(payments));

// --- Quỹ tích lũy dần ---
export const sinkingSaved = (contribs: SinkingContribution[]): number =>
  contribs.reduce((s, c) => s + c.amount, 0);
export const sinkingProgress = (fund: SinkingFund, saved: number): number =>
  fund.targetAmount === 0 ? 0 : Math.min(1, saved / fund.targetAmount);
// Số tháng còn tới hạn (tối thiểu 1 để không chia cho 0).
export const monthsUntil = (dueDate: number, now: number = Date.now()): number => {
  const d = new Date(dueDate);
  const n = new Date(now);
  const months = (d.getFullYear() - n.getFullYear()) * 12 + (d.getMonth() - n.getMonth());
  return Math.max(1, months);
};
// Nên để dành bao nhiêu MỖI THÁNG để kịp đủ đúng hạn.
export const suggestedContribution = (
  fund: SinkingFund, saved: number, now: number = Date.now(),
): number => Math.max(0, fund.targetAmount - saved) / monthsUntil(fund.dueDate, now);

export const newId = (): string =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/* ────────────────────────────────────────────────────────────
 * 5. Dexie database (IndexedDB) — local-first
 * ──────────────────────────────────────────────────────────── */

export class WealthDB extends Dexie {
  wallets!:        EntityTable<Wallet, 'id'>;
  assets!:         EntityTable<Asset, 'id'>;
  pricePoints!:    EntityTable<PricePoint, 'id'>;
  transactions!:   EntityTable<Transaction, 'id'>;
  categories!:     EntityTable<Category, 'id'>;
  tags!:           EntityTable<Tag, 'id'>;
  budgets!:        EntityTable<Budget, 'id'>;
  recurringRules!: EntityTable<RecurringRule, 'id'>;
  liabilities!:    EntityTable<Liability, 'id'>;
  debts!:          EntityTable<Debt, 'id'>;
  debtPayments!:   EntityTable<DebtPayment, 'id'>;
  sinkingFunds!:        EntityTable<SinkingFund, 'id'>;
  sinkingContributions!: EntityTable<SinkingContribution, 'id'>;
  snapshots!:      EntityTable<NetWorthSnapshot, 'id'>;

  constructor() {
    super('PersonalWealthDB');
    // Chuỗi = các trường ĐƯỢC ĐÁNH INDEX. Không index trường boolean
    // (isActive, isSettled) vì IndexedDB không nhận khóa boolean → lọc bằng JS.
    this.version(1).stores({
      wallets:        'id, type, sortOrder',
      assets:         'id, assetClass, marketSymbol, currencyCode',
      pricePoints:    'id, assetId, date',
      transactions:   'id, kind, date, categoryId, walletId, fromWalletId, toWalletId, linkedAssetId, recurringRuleId',
      categories:     'id, kind, parentId',
      tags:           'id, name',
      budgets:        'id, period, categoryId',
      recurringRules: 'id, nextRunDate',
      liabilities:    'id, kind',
      debts:          'id, direction, dueDate',
      debtPayments:   'id, debtId, date',
      sinkingFunds:         'id, dueDate',
      sinkingContributions: 'id, fundId, date',
      snapshots:      'id, date',
    });
  }
}

export const db = new WealthDB();
