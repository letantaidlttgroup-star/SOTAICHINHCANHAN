import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react';
import { db, type Transaction, type TransactionKind, type Category, type Wallet } from '../db/db';
import { catIcon } from '../lib/catIcons';
import { money, vnd, compactVnd } from '../lib/format';
import { TransactionEdit } from '../components/TransactionEdit';

const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayLabel = (ms: number) => new Date(ms).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
type KindFilter = 'all' | TransactionKind;

export function Transactions({ onToast }: { onToast: (m: string) => void }) {
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [kindF, setKindF] = useState<KindFilter>('all');
  const [walletF, setWalletF] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selDay, setSelDay] = useState<number | null>(
    today.getMonth() === today.getMonth() ? today.getDate() : null,
  );

  const start = new Date(ym.y, ym.m, 1).getTime();
  const end = new Date(ym.y, ym.m + 1, 1).getTime();

  const txns = useLiveQuery(() => db.transactions.where('date').between(start, end, true, false).toArray(), [start, end], []);
  const cats = useLiveQuery(() => db.categories.toArray(), [], []);
  const wallets = useLiveQuery(() => db.wallets.orderBy('sortOrder').toArray(), [], []);
  const catMap = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c])), [cats]);
  const walletMap = useMemo(() => new Map((wallets ?? []).map((w) => [w.id, w])), [wallets]);

  const filtered = useMemo(() => {
    let list = (txns ?? []).slice();
    if (kindF !== 'all') list = list.filter((t) => t.kind === kindF);
    if (walletF) list = list.filter((t) => t.walletId === walletF || t.fromWalletId === walletF || t.toWalletId === walletF);
    return list.sort((a, b) => b.date - a.date);
  }, [txns, kindF, walletF]);

  const income = filtered.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<number, Transaction[]>();
    for (const t of filtered) { const d = startOfDay(t.date); (map.get(d) ?? map.set(d, []).get(d)!).push(t); }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  // Lịch: net theo từng ngày
  const dayNet = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of filtered) {
      const day = new Date(t.date).getDate();
      const delta = t.kind === 'income' ? t.amount : t.kind === 'expense' ? -t.amount : 0;
      map.set(day, (map.get(day) ?? 0) + delta);
    }
    return map;
  }, [filtered]);

  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const leadBlanks = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;
  const isToday = (d: number) => today.getFullYear() === ym.y && today.getMonth() === ym.m && today.getDate() === d;

  const selDayTxns = useMemo(() => {
    if (selDay == null) return [];
    return filtered.filter((t) => new Date(t.date).getDate() === selDay);
  }, [filtered, selDay]);

  const shift = (delta: number) => setYm(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const kinds: { k: KindFilter; label: string }[] = [
    { k: 'all', label: 'Tất cả' }, { k: 'expense', label: 'Chi' }, { k: 'income', label: 'Thu' }, { k: 'transfer', label: 'Chuyển' },
  ];

  return (
    <>
      {/* Điều hướng tháng + chuyển chế độ xem */}
      <div className="px-5 pt-[10px]">
        <div className="flex items-center justify-between">
          <button onClick={() => shift(-1)} className="w-9 h-9 grid place-items-center rounded-[10px] border border-line bg-surface text-ink"><ChevronLeft size={18} /></button>
          <span className="text-[15px] font-semibold">Tháng {ym.m + 1}, {ym.y}</span>
          <button onClick={() => shift(1)} className="w-9 h-9 grid place-items-center rounded-[10px] border border-line bg-surface text-ink"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-3 mt-4 items-end">
          <div className="flex-1"><div className="text-[12px] text-mut">Thu</div><div className="text-[15px] font-semibold tnum" style={{ color: 'var(--pos)' }}>{money(income)}</div></div>
          <div className="flex-1"><div className="text-[12px] text-mut">Chi</div><div className="text-[15px] font-semibold tnum" style={{ color: 'var(--neg)' }}>{money(expense)}</div></div>
          <div className="flex bg-surface2 rounded-[10px] p-[2px]">
            {([['list', List], ['calendar', CalendarDays]] as const).map(([v, Ic]) => (
              <button key={v} onClick={() => setView(v)} className="w-9 h-8 grid place-items-center rounded-[8px]"
                style={{ background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--ink)' : 'var(--mut)' }}>
                <Ic size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="px-5 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {kinds.map(({ k, label }) => (
          <button key={k} onClick={() => setKindF(k)} className="whitespace-nowrap rounded-[20px] px-[13px] py-[6px] text-[12.5px] cursor-pointer bg-surface text-ink"
            style={{ border: `1px solid ${kindF === k ? 'var(--gold)' : 'var(--line)'}`, fontWeight: kindF === k ? 600 : 400 }}>{label}</button>
        ))}
        <span className="w-px shrink-0" style={{ background: 'var(--line)' }} />
        <button onClick={() => setWalletF(null)} className="whitespace-nowrap rounded-[20px] px-[13px] py-[6px] text-[12.5px] cursor-pointer bg-surface text-ink"
          style={{ border: `1px solid ${!walletF ? 'var(--ink)' : 'var(--line)'}`, fontWeight: !walletF ? 600 : 400 }}>Mọi ví</button>
        {(wallets ?? []).map((w) => (
          <button key={w.id} onClick={() => setWalletF(w.id)} className="whitespace-nowrap rounded-[20px] px-[13px] py-[6px] text-[12.5px] cursor-pointer bg-surface text-ink"
            style={{ border: `1px solid ${walletF === w.id ? 'var(--ink)' : 'var(--line)'}`, fontWeight: walletF === w.id ? 600 : 400 }}>{w.name}</button>
        ))}
      </div>

      {view === 'list' ? (
        <>
          {groups.length === 0 && <div className="px-5 py-12 text-center text-mut text-[13px]">Không có giao dịch trong bộ lọc này.</div>}
          {groups.map(([day, items]) => {
            const net = items.reduce((s, t) => s + (t.kind === 'income' ? t.amount : t.kind === 'expense' ? -t.amount : 0), 0);
            return (
              <div key={day} className="mx-[14px] my-[10px] bg-surface border border-line rounded-[18px] overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
                <div className="flex justify-between items-center px-4 pt-3 pb-2">
                  <span className="text-[12.5px] text-mut capitalize">{dayLabel(day)}</span>
                  <span className="text-[12px] text-faint tnum">{net >= 0 ? '+' : ''}{money(net)}</span>
                </div>
                {items.map((t) => <TxnRow key={t.id} t={t} catMap={catMap} walletMap={walletMap} onClick={() => setEditing(t)} />)}
              </div>
            );
          })}
        </>
      ) : (
        <>
          {/* Lịch tháng */}
          <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[18px] p-3" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="grid grid-cols-7 mb-1">
              {WD.map((w) => <div key={w} className="text-center text-[11px] text-faint py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: leadBlanks }).map((_, i) => <span key={'b' + i} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const net = dayNet.get(d) ?? 0;
                const on = selDay === d;
                return (
                  <button key={d} onClick={() => setSelDay(d)}
                    className="aspect-square rounded-[9px] flex flex-col items-center justify-center gap-[1px]"
                    style={{ background: on ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'transparent',
                      border: on ? '1px solid var(--gold)' : isToday(d) ? '1px solid var(--line)' : '1px solid transparent' }}>
                    <span className="text-[12px]" style={{ color: isToday(d) ? 'var(--gold)' : 'var(--ink)', fontWeight: isToday(d) ? 700 : 400 }}>{d}</span>
                    {net !== 0 && (
                      <span className="text-[8.5px] leading-none tnum" style={{ color: net >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                        {compactVnd(net)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Giao dịch của ngày đã chọn */}
          {selDay != null && (
            <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[18px] overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
              <div className="px-4 pt-3 pb-2 text-[12.5px] text-mut">Ngày {selDay}/{ym.m + 1}/{ym.y}</div>
              {selDayTxns.length === 0
                ? <div className="px-4 pb-4 text-[13px] text-faint">Không có giao dịch.</div>
                : selDayTxns.map((t) => <TxnRow key={t.id} t={t} catMap={catMap} walletMap={walletMap} onClick={() => setEditing(t)} />)}
            </div>
          )}
        </>
      )}
      <div className="h-2" />

      <TransactionEdit txn={editing} onClose={() => setEditing(null)} onToast={onToast} />
    </>
  );
}

function TxnRow({ t, catMap, walletMap, onClick }: {
  t: Transaction; catMap: Map<string, Category>; walletMap: Map<string, Wallet>; onClick: () => void;
}) {
  const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
  const Icon = t.kind === 'transfer' ? catIcon('arrow-left-right') : catIcon(cat?.icon);
  const w = walletMap.get(t.walletId ?? t.fromWalletId ?? '');
  const sign = t.kind === 'expense' ? '−' : t.kind === 'income' ? '+' : '';
  const color = t.kind === 'expense' ? 'var(--neg)' : t.kind === 'income' ? 'var(--pos)' : 'var(--ink)';
  const title = t.kind === 'transfer' ? 'Chuyển tiền' : cat?.name ?? 'Khác';
  const iconCol = t.kind === 'transfer' ? '#6E8FB0' : (cat?.colorHex ?? '#8A8F98');
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-[11px] border-t border-line text-left">
      <span className="w-[34px] h-[34px] rounded-[10px] shrink-0 grid place-items-center"
        style={{ background: `color-mix(in srgb, ${iconCol} 16%, transparent)` }}>
        <Icon size={16} style={{ color: iconCol }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium truncate">{title}</div>
        <div className="text-[12px] text-mut truncate">{[w?.name, t.note].filter(Boolean).join(' · ') || '—'}</div>
      </div>
      <span className="text-[14px] font-semibold tnum" style={{ color }}>{sign}{money(t.amount)}</span>
    </button>
  );
}
