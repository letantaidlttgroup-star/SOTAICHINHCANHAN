import { db } from '../db/db';

const TABLES = [
  'wallets', 'assets', 'pricePoints', 'transactions', 'categories', 'tags',
  'budgets', 'recurringRules', 'liabilities', 'debts', 'debtPayments',
  'sinkingFunds', 'sinkingContributions', 'snapshots',
] as const;

export async function exportData(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return JSON.stringify({ app: 'personal-wealth', version: 1, exportedAt: Date.now(), data }, null, 2);
}

export function downloadBackup(json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sao-luu-tai-chinh-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(json: string): Promise<void> {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.data) throw new Error('File không hợp lệ');
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = parsed.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}

/** Xóa sạch toàn bộ dữ liệu trong mọi bảng. */
export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
}
