// cashflow.ts — Personal Wealth (Web/PWA)
// Module 2b: Tầng nghiệp vụ phía DÒNG TIỀN — số dư ví, tổng hợp thu/chi theo kỳ,
// tiến độ & cảnh báo ngân sách, sinh giao dịch định kỳ + danh sách nhắc nhở.

import {
  db,
  type Wallet,
  type Transaction,
  type Budget,
  type RecurringRule,
  type BudgetPeriod,
  type Frequency,
  newId,
} from './db';

const DAY = 86_400_000;

/* ────────────────────────────────────────────────────────────
 * 1. Số dư ví (tính một lượt, không lưu cứng)
 * ──────────────────────────────────────────────────────────── */

export interface WalletBalance {
  wallet: Wallet;
  balance: number;
}

/** Số dư mọi ví = initialBalance + biến động giao dịch, tính trong 1 vòng lặp. */
export async function walletBalances(): Promise<WalletBalance[]> {
  const [wallets, txns] = await Promise.all([
    db.wallets.toArray(),
    db.transactions.toArray(),
  ]);

  const bal = new Map<string, number>(wallets.map((w) => [w.id, w.initialBalance]));
  const add = (id: string | undefined, delta: number) => {
    if (id && bal.has(id)) bal.set(id, (bal.get(id) as number) + delta);
  };

  for (const t of txns) {
    if (t.kind === 'income') add(t.walletId, t.amount);
    else if (t.kind === 'expense') add(t.walletId, -t.amount);
    else if (t.kind === 'transfer') {
      add(t.fromWalletId, -t.amount);
      add(t.toWalletId, t.amount);
    }
  }

  return wallets
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((w) => ({ wallet: w, balance: bal.get(w.id) ?? w.initialBalance }));
}

/** Tổng số dư mọi ví đang hoạt động (cùng đơn vị tiền; đa tiền tệ → quy đổi ở Module 2a). */
export async function totalBalance(): Promise<number> {
  const list = await walletBalances();
  return list.filter((b) => !b.wallet.isArchived).reduce((s, b) => s + b.balance, 0);
}

/* ────────────────────────────────────────────────────────────
 * 2. Khoảng thời gian & tổng hợp thu/chi
 * ──────────────────────────────────────────────────────────── */

export interface PeriodRange {
  start: number; // bao gồm
  end: number;   // không bao gồm
}

/** Cửa sổ kỳ hiện tại chứa `now`, canh theo startDate cho weekly, theo lịch cho tháng/quý/năm. */
export function currentPeriodRange(
  period: BudgetPeriod,
  startDate: number,
  now: number = Date.now(),
): PeriodRange {
  const d = new Date(now);
  switch (period) {
    case 'weekly': {
      const week = 7 * DAY;
      const k = Math.floor((now - startDate) / week);
      const start = startDate + k * week;
      return { start, end: start + week };
    }
    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return { start, end };
    }
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3);
      const start = new Date(d.getFullYear(), q * 3, 1).getTime();
      const end = new Date(d.getFullYear(), q * 3 + 3, 1).getTime();
      return { start, end };
    }
    case 'yearly': {
      const start = new Date(d.getFullYear(), 0, 1).getTime();
      const end = new Date(d.getFullYear() + 1, 0, 1).getTime();
      return { start, end };
    }
  }
}

export interface CashflowSummary {
  income: number;
  expense: number;
  net: number;
  expenseByCategory: { categoryId: string | null; amount: number }[];
}

/** Tổng hợp thu/chi trong một khoảng. LƯU Ý: transfer KHÔNG tính vào thu/chi. */
export async function cashflowSummary(range: PeriodRange): Promise<CashflowSummary> {
  const txns = await db.transactions
    .where('date')
    .between(range.start, range.end, true, false)
    .toArray();

  let income = 0;
  let expense = 0;
  const byCat = new Map<string | null, number>();

  for (const t of txns) {
    if (t.kind === 'income') income += t.amount;
    else if (t.kind === 'expense') {
      expense += t.amount;
      const key = t.categoryId ?? null;
      byCat.set(key, (byCat.get(key) ?? 0) + t.amount);
    }
    // transfer bỏ qua — chỉ là chuyển tiền nội bộ.
  }

  const expenseByCategory = [...byCat.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { income, expense, net: income - expense, expenseByCategory };
}

/* ────────────────────────────────────────────────────────────
 * 3. Ngân sách — tiến độ & cảnh báo (bao gồm cả danh mục con)
 * ──────────────────────────────────────────────────────────── */

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  ratio: number;        // spent / limit
  status: BudgetStatus;
  range: PeriodRange;
}

/** Gom 1 danh mục cùng mọi danh mục con của nó (khớp quyết định "danh mục 2 cấp"). */
async function categoryWithChildren(categoryId: string): Promise<Set<string>> {
  const ids = new Set<string>([categoryId]);
  const children = await db.categories.where('parentId').equals(categoryId).toArray();
  for (const c of children) ids.add(c.id);
  return ids;
}

export async function budgetProgress(now: number = Date.now()): Promise<BudgetProgress[]> {
  const budgets = await db.budgets.toArray();
  const out: BudgetProgress[] = [];

  for (const b of budgets) {
    const range = currentPeriodRange(b.period, b.startDate, now);
    const txns = await db.transactions
      .where('date')
      .between(range.start, range.end, true, false)
      .toArray();

    const catIds = b.categoryId ? await categoryWithChildren(b.categoryId) : null;

    let spent = 0;
    for (const t of txns) {
      if (t.kind !== 'expense') continue;
      if (catIds && !(t.categoryId && catIds.has(t.categoryId))) continue;
      spent += t.amount;
    }

    const ratio = b.limitAmount === 0 ? 0 : spent / b.limitAmount;
    const status: BudgetStatus =
      ratio >= 1 ? 'exceeded' : ratio >= b.alertThreshold ? 'warning' : 'ok';

    out.push({ budget: b, spent, ratio, status, range });
  }

  return out;
}

/* ────────────────────────────────────────────────────────────
 * 4. Giao dịch định kỳ — sinh giao dịch tới hạn + nhắc nhở
 * ──────────────────────────────────────────────────────────── */

export function advanceDate(ms: number, freq: Frequency, interval: number): number {
  const d = new Date(ms);
  switch (freq) {
    case 'daily':   d.setDate(d.getDate() + interval); break;
    case 'weekly':  d.setDate(d.getDate() + 7 * interval); break;
    case 'monthly': d.setMonth(d.getMonth() + interval); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + interval); break;
  }
  return d.getTime();
}

/**
 * Sinh mọi giao dịch tới hạn (nextRunDate <= now) cho các rule đang bật.
 * Có "sinh bù" nếu app lâu không mở khiến bỏ lỡ nhiều kỳ.
 */
export async function generateDueTransactions(now: number = Date.now()): Promise<Transaction[]> {
  const rules = (await db.recurringRules.toArray()).filter((r) => r.isActive);
  const created: Transaction[] = [];

  for (const rule of rules) {
    let next = rule.nextRunDate;

    while (next <= now && (rule.endDate == null || next <= rule.endDate)) {
      created.push({
        id: newId(),
        amount: rule.amount,
        kind: rule.kind,
        date: next,
        note: rule.note,
        currencyCode: rule.currencyCode,
        categoryId: rule.categoryId,
        tagIds: [...rule.tagIds],
        walletId: rule.walletId,
        fromWalletId: rule.fromWalletId,
        toWalletId: rule.toWalletId,
        recurringRuleId: rule.id,
      });
      next = advanceDate(next, rule.frequency, rule.interval);
    }

    if (next !== rule.nextRunDate) {
      const stillActive = rule.endDate == null || next <= rule.endDate;
      await db.recurringRules.update(rule.id, { nextRunDate: next, isActive: stillActive });
    }
  }

  if (created.length) await db.transactions.bulkAdd(created);
  return created;
}

export interface UpcomingRecurring {
  rule: RecurringRule;
  dueDate: number;
  remindOn: number; // dueDate - reminderLeadDays
}

/** Danh sách "sắp tới hạn" trong `withinDays` ngày — dùng cho nhắc in-app & web push. */
export async function upcomingRecurring(
  withinDays = 14,
  now: number = Date.now(),
): Promise<UpcomingRecurring[]> {
  const horizon = now + withinDays * DAY;
  const rules = (await db.recurringRules.toArray()).filter(
    (r) => r.isActive && r.reminderEnabled,
  );

  return rules
    .filter((r) => r.nextRunDate <= horizon)
    .map((r) => ({
      rule: r,
      dueDate: r.nextRunDate,
      remindOn: r.nextRunDate - r.reminderLeadDays * DAY,
    }))
    .sort((a, b) => a.dueDate - b.dueDate);
}

/* ────────────────────────────────────────────────────────────
 * 5. Tổng quan hạn mức — toàn cảnh ngân sách đã cấp
 * ──────────────────────────────────────────────────────────── */

export interface BudgetSummary {
  items: BudgetProgress[];
  totalLimit: number;   // tổng hạn mức đã cấp cho mọi hạng mục
  totalSpent: number;   // tổng đã tiêu trong kỳ tương ứng
  overBudgetCount: number;
}

export async function budgetSummary(now: number = Date.now()): Promise<BudgetSummary> {
  const items = await budgetProgress(now);
  return {
    items,
    totalLimit: items.reduce((s, i) => s + i.budget.limitAmount, 0),
    totalSpent: items.reduce((s, i) => s + i.spent, 0),
    overBudgetCount: items.filter((i) => i.status === 'exceeded').length,
  };
}
