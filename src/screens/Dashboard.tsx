import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, ArrowLeftRight, PiggyBank } from 'lucide-react';
import { WALLET_ICON } from '../lib/walletIcons';
import { db, ASSET_CLASS_META, type AssetClass } from '../db/db';
import { walletBalances, cashflowSummary, budgetSummary } from '../db/cashflow';
import { upcomingRecurring } from '../db/cashflow';
import { upcomingDebtReminders } from '../db/debts';
import { sinkingReminders } from '../db/sinking';
import { valuation } from '../lib/services';
import { money, vnd, billions, currentMonthRange, daysFromNow } from '../lib/format';
import { Section, Delta, Spark } from '../components/ui';

const ALLOC_COLORS: Partial<Record<AssetClass, string>> = {
  realEstate: '#6E8FB0', stock: '#4FB286', crypto: '#C98A5A',
  preciousMetal: '#C9A96A', gemstone: '#A98FC9', jewelry: '#C98AA8',
  cash: '#8A8F98', bankAccount: '#8A8F98',
};

export function Dashboard({ onNav }: { onNav: (r: 'wallets' | 'budgets') => void }) {
  const nw = useLiveQuery(() => valuation.netWorthBreakdown());
  const snaps = useLiveQuery(() => db.snapshots.orderBy('date').toArray(), [], []);
  const nwSeries = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    return (snaps ?? []).filter((x) => x.date >= since).map((x) => x.netWorth);
  }, [snaps]);
  const nwDelta = useMemo(() => {
    if (!nw || nwSeries.length < 2) return null;
    const first = nwSeries[0];
    if (!first) return null;
    return ((nw.netWorth - first) / Math.abs(first)) * 100;
  }, [nw, nwSeries]);
  const balances = useLiveQuery(() => walletBalances(), [], []);
  const flow = useLiveQuery(() => cashflowSummary(currentMonthRange()));
  const budgets = useLiveQuery(() => budgetSummary(), [], undefined);
  const reminders = useLiveQuery(async () => {
    const [rec, deb, sink] = await Promise.all([
      upcomingRecurring(30), upcomingDebtReminders(30), sinkingReminders(),
    ]);
    type R = { key: string; label: string; sub: string; amount: number; days: number; kind: string };
    const rows: R[] = [];
    for (const r of rec) rows.push({ key: 'r' + r.rule.id, label: r.rule.name, sub: 'Định kỳ', amount: r.rule.amount, days: daysFromNow(r.dueDate), kind: 'recurring' });
    for (const d of deb) rows.push({ key: 'd' + d.view.debt.id, label: (d.view.debt.direction === 'iOwe' ? 'Trả ' : '') + d.view.debt.counterparty + (d.view.debt.direction === 'owedToMe' ? ' trả nợ' : ''), sub: d.view.debt.direction === 'iOwe' ? 'Mình nợ' : 'Người khác nợ mình', amount: d.view.outstanding, days: daysFromNow(d.dueDate), kind: 'debt' });
    for (const s of sink) rows.push({ key: 's' + s.view.fund.id, label: 'Để dành: ' + s.view.fund.name, sub: s.behindBy > 0 ? 'Đang chậm tiến độ' : 'Quỹ tích lũy', amount: Math.max(s.behindBy, s.view.suggested), days: daysFromNow(s.view.fund.dueDate), kind: 'sinking' });
    return rows.sort((a, b) => a.days - b.days).slice(0, 5);
  }, [], []);

  const alloc = useMemo(() => {
    if (!nw) return [] as { label: string; value: number; color: string; pct: number }[];
    const rows = Object.entries(nw.allocation)
      .filter(([, v]) => v > 0)
      .map(([cls, v]) => ({
        label: ASSET_CLASS_META[cls as AssetClass]?.label ?? cls,
        value: v, color: ALLOC_COLORS[cls as AssetClass] ?? 'var(--faint)',
      }));
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.map((r) => ({ ...r, pct: (r.value / total) * 100 })).sort((a, b) => b.value - a.value);
  }, [nw]);

  const walletTotal = (balances ?? []).filter((b) => !b.wallet.isArchived).reduce((s, b) => s + b.balance, 0);

  return (
    <>
      {/* Hero: Giá trị ròng */}
      <div className="px-5 pt-[10px] pb-1">
        <div className="text-[13px] text-mut mb-[6px]">Giá trị ròng</div>
        <div className="text-[34px] font-semibold -tracking-[1px] tnum leading-[1.05] gold-text">
          {nw ? money(nw.netWorth) : '—'}<span className="text-[20px] ml-1">₫</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {nwDelta != null && <Delta up={nwDelta >= 0} value={`${nwDelta >= 0 ? '+' : ''}${nwDelta.toFixed(1)}% · 30 ngày`} />}
          {nw && <span className="text-[13px] text-faint">≈ {billions(nw.netWorth)} tỷ</span>}
        </div>
        {nwSeries.length >= 2 && <Spark data={nwSeries} />}
      </div>

      {/* Phân bổ tài sản */}
      <Section title="Phân bổ tài sản" action="Chi tiết">
        <div className="flex h-[10px] rounded-[6px] overflow-hidden gap-[2px]">
          {alloc.map((a) => (
            <div key={a.label} title={a.label} style={{ width: `${a.pct}%`, background: a.color }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
          {alloc.map((a) => (
            <div key={a.label} className="flex items-center gap-[6px]">
              <span className="w-2 h-2 rounded-[2px]" style={{ background: a.color }} />
              <span className="text-[12.5px] text-mut">{a.label}</span>
              <span className="text-[12.5px] font-semibold tnum">{a.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Tháng này */}
      <Section title="Tháng này">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-[12.5px] text-mut mb-1">Thu</div>
            <div className="text-[16px] font-semibold tnum" style={{ color: 'var(--pos)' }}>
              {money(flow?.income ?? 0)}</div>
          </div>
          <div className="flex-1">
            <div className="text-[12.5px] text-mut mb-1">Chi</div>
            <div className="text-[16px] font-semibold tnum" style={{ color: 'var(--neg)' }}>
              {money(flow?.expense ?? 0)}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-line flex justify-between items-baseline">
          <span className="text-[13px] text-mut">Còn lại</span>
          <span className="text-[17px] font-semibold tnum"
            style={{ color: (flow?.net ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
            {(flow?.net ?? 0) >= 0 ? '+' : ''}{vnd(flow?.net ?? 0)}</span>
        </div>
      </Section>

      {/* Ngân sách */}
      <Section title="Ngân sách" action="Tất cả" onAction={() => onNav('budgets')}>
        {(budgets?.items ?? []).length === 0 && (
          <button onClick={() => onNav('budgets')} className="text-[13px] text-mut bg-transparent border-0 p-0 text-left">Chưa cấp hạn mức — chạm để thêm.</button>
        )}
        {(budgets?.items ?? []).map((b) => {
          const r = b.ratio;
          const c = r >= 1 ? 'var(--neg)' : r >= 0.85 ? 'var(--gold)' : 'var(--pos)';
          return (
            <div key={b.budget.id} className="mb-3 last:mb-0">
              <div className="flex justify-between mb-[6px]">
                <span className="text-[13.5px]">{b.budget.name}</span>
                <span className="text-[12.5px] text-mut tnum">
                  {money(b.spent)} / {money(b.budget.limitAmount)}</span>
              </div>
              <div className="h-[6px] bg-surface2 rounded-[4px] overflow-hidden">
                <div className="h-full rounded-[4px]"
                  style={{ width: `${Math.min(100, r * 100)}%`, background: c }} />
              </div>
            </div>
          );
        })}
      </Section>

      {/* Ví */}
      <Section title="Ví" action="Quản lý" onAction={() => onNav('wallets')}
        extra={<button onClick={() => onNav('wallets')} className="text-[13px] font-semibold tnum gold-text bg-transparent border-0 cursor-pointer">{vnd(walletTotal)}</button>}>
        <div className="flex gap-[10px] overflow-x-auto no-scrollbar pb-[2px]">
          {(balances ?? []).filter((b) => !b.wallet.isArchived).map((b) => {
            const WIcon = WALLET_ICON[b.wallet.type];
            return (
              <button key={b.wallet.id} onClick={() => onNav('wallets')} className="min-w-[128px] bg-surface2 border border-line rounded-[14px] p-3 text-left">
                <span className="w-[30px] h-[30px] rounded-[9px] grid place-items-center"
                  style={{ background: `color-mix(in srgb, ${b.wallet.colorHex} 20%, transparent)` }}>
                  <WIcon size={16} style={{ color: b.wallet.colorHex }} />
                </span>
                <div className="text-[12.5px] text-mut mt-[10px] truncate">{b.wallet.name}</div>
                <div className="text-[14.5px] font-semibold mt-[2px] tnum" style={{ color: b.balance < 0 ? 'var(--neg)' : 'var(--ink)' }}>{vnd(b.balance)}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Sắp tới hạn */}
      <Section title="Sắp tới hạn">
        {(reminders ?? []).length === 0 && (
          <div className="text-[13px] text-mut">Chưa có khoản nào tới hạn.</div>
        )}
        {(reminders ?? []).map((r) => {
          const overdue = r.days < 0;
          const Icon = r.kind === 'debt' ? Users : r.kind === 'sinking' ? PiggyBank : ArrowLeftRight;
          const kindCol = r.kind === 'debt' ? '#C98A5A' : r.kind === 'sinking' ? '#4FB286' : '#6E8FB0';
          const col = overdue ? 'var(--neg)' : kindCol;
          return (
            <div key={r.key} className="flex items-center gap-3 py-[10px] border-b border-line last:border-0">
              <span className="w-[34px] h-[34px] rounded-[10px] shrink-0 grid place-items-center"
                style={{ background: `color-mix(in srgb, ${col} 16%, transparent)` }}>
                <Icon size={16} style={{ color: col }} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{r.label}</div>
                <div className="text-[12px]" style={{ color: overdue ? 'var(--neg)' : 'var(--mut)' }}>
                  {overdue ? `Quá hạn ${-r.days} ngày` : r.days === 0 ? 'Hôm nay' : `Còn ${r.days} ngày`} · {r.sub}
                </div>
              </div>
              <span className="text-[13.5px] font-semibold tnum">{money(r.amount)}</span>
            </div>
          );
        })}
      </Section>
      <div className="h-2" />
    </>
  );
}
