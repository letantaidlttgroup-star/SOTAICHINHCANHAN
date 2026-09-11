// debts.ts — Personal Wealth (Web/PWA)
// Mục Vay–Nợ cá nhân hai chiều: mình vay ai / ai vay mình,
// lịch sử trả từng lần, tổng phải-thu/phải-trả, và nhắc tới hạn.

import {
  db,
  type Debt,
  type DebtPayment,
  type DebtDirection,
  debtPaid,
  debtOutstanding,
  newId,
} from './db';

const DAY = 86_400_000;

/* ── Nhóm payment theo debtId (1 lượt) ── */
async function paymentsByDebt(): Promise<Map<string, DebtPayment[]>> {
  const payments = await db.debtPayments.toArray();
  const map = new Map<string, DebtPayment[]>();
  for (const p of payments) {
    const arr = map.get(p.debtId) ?? [];
    arr.push(p);
    map.set(p.debtId, arr);
  }
  return map;
}

/* ────────────────────────────────────────────────────────────
 * Danh sách khoản nợ kèm số đã trả / còn lại
 * ──────────────────────────────────────────────────────────── */

export interface DebtView {
  debt: Debt;
  paid: number;
  outstanding: number;
  payments: DebtPayment[];
}

export async function debtViews(options?: {
  direction?: DebtDirection;
  includeSettled?: boolean;
}): Promise<DebtView[]> {
  const { direction, includeSettled = false } = options ?? {};
  const [debts, byDebt] = await Promise.all([db.debts.toArray(), paymentsByDebt()]);

  return debts
    .filter((d) => (direction ? d.direction === direction : true))
    .filter((d) => (includeSettled ? true : !d.isSettled))
    .map((d) => {
      const payments = (byDebt.get(d.id) ?? []).sort((a, b) => a.date - b.date);
      return {
        debt: d,
        paid: debtPaid(payments),
        outstanding: debtOutstanding(d, payments),
        payments,
      };
    })
    .sort((a, b) => (a.debt.dueDate ?? Infinity) - (b.debt.dueDate ?? Infinity));
}

/** Tổng phải-thu / phải-trả đang mở (cùng đơn vị tiền; quy đổi VND ở ValuationService). */
export async function outstandingTotals(): Promise<{ receivable: number; payable: number }> {
  const views = await debtViews({ includeSettled: false });
  let receivable = 0;
  let payable = 0;
  for (const v of views) {
    if (v.debt.direction === 'owedToMe') receivable += v.outstanding;
    else payable += v.outstanding;
  }
  return { receivable, payable };
}

/* ────────────────────────────────────────────────────────────
 * Ghi nhận một lần trả / thu; tự tất toán khi trả đủ
 * ──────────────────────────────────────────────────────────── */

export async function recordDebtPayment(input: {
  debtId: string;
  amount: number;
  date?: number;
  note?: string;
  walletId?: string;
}): Promise<void> {
  const payment: DebtPayment = {
    id: newId(),
    debtId: input.debtId,
    date: input.date ?? Date.now(),
    amount: input.amount,
    note: input.note,
    walletId: input.walletId,
  };
  await db.debtPayments.add(payment);

  const [debt, payments] = await Promise.all([
    db.debts.get(input.debtId),
    db.debtPayments.where('debtId').equals(input.debtId).toArray(),
  ]);
  if (debt && !debt.isSettled && debtOutstanding(debt, payments) <= 0) {
    await db.debts.update(debt.id, { isSettled: true });
  }
}

/* ────────────────────────────────────────────────────────────
 * Nhắc tới hạn (cả hai chiều) — dùng cho in-app & web push
 * ──────────────────────────────────────────────────────────── */

export interface DebtReminder {
  view: DebtView;
  dueDate: number;
  remindOn: number;     // dueDate − reminderLeadDays
  isOverdue: boolean;
}

export async function upcomingDebtReminders(
  withinDays = 14,
  now: number = Date.now(),
): Promise<DebtReminder[]> {
  const horizon = now + withinDays * DAY;
  const views = await debtViews({ includeSettled: false });

  return views
    .filter((v) => v.debt.reminderEnabled && v.debt.dueDate != null)
    .filter((v) => (v.debt.dueDate as number) <= horizon)
    .map((v) => {
      const dueDate = v.debt.dueDate as number;
      return {
        view: v,
        dueDate,
        remindOn: dueDate - v.debt.reminderLeadDays * DAY,
        isOverdue: dueDate < now,
      };
    })
    .sort((a, b) => a.dueDate - b.dueDate);
}
