import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db, type AssetClass, ASSET_CLASS_META, profitLoss,
} from '../db/db';
import { valuation, converter } from '../lib/services';
import { money, vnd, billions } from '../lib/format';
import { Section } from '../components/ui';
import { LineChart, Donut, GroupedBars, PLBars } from '../components/charts';

const ALLOC_COLORS: Partial<Record<AssetClass, string>> = {
  realEstate: '#6E8FB0', stock: '#4FB286', crypto: '#C98A5A',
  preciousMetal: '#C9A96A', gemstone: '#A98FC9', jewelry: '#C98AA8',
  cash: '#8A8F98', bankAccount: '#8A8F98', other: '#5A6068',
};
const RANGES = [
  { k: 7, label: 'Tuần' }, { k: 30, label: 'Tháng' }, { k: 365, label: 'Năm' },
];

export function Reports() {
  const [range, setRange] = useState(365);
  const snapshots = useLiveQuery(() => db.snapshots.orderBy('date').toArray(), [], []);
  const nw = useLiveQuery(() => valuation.netWorthBreakdown());
  const txns = useLiveQuery(() => db.transactions.toArray(), [], []);
  const assets = useLiveQuery(() => db.assets.toArray(), [], []);

  // 1) Net worth theo thời gian
  const nwSeries = useMemo(() => {
    const since = Date.now() - range * 86_400_000;
    return (snapshots ?? []).filter((s) => s.date >= since).map((s) => s.netWorth);
  }, [snapshots, range]);
  const nwDelta = nwSeries.length >= 2 ? nwSeries[nwSeries.length - 1] - nwSeries[0] : 0;

  // 2) Phân bổ tài sản
  const allocSlices = useMemo(() => {
    if (!nw) return [];
    return Object.entries(nw.allocation)
      .filter(([, v]) => v > 0)
      .map(([cls, v]) => ({
        label: ASSET_CLASS_META[cls as AssetClass]?.label ?? cls,
        value: v, color: ALLOC_COLORS[cls as AssetClass] ?? '#5A6068',
      }))
      .sort((a, b) => b.value - a.value);
  }, [nw]);

  // 3) Thu–chi 6 tháng gần nhất
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; income: number; expense: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: `T${d.getMonth() + 1}`, income: 0, expense: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const t of txns ?? []) {
      const d = new Date(t.date);
      const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i == null) continue;
      if (t.kind === 'income') buckets[i].income += t.amount;
      else if (t.kind === 'expense') buckets[i].expense += t.amount;
    }
    return buckets;
  }, [txns]);

  // 4) Lời/lỗ theo lớp tài sản
  const plByClass = useMemo(() => {
    const map = new Map<AssetClass, number>();
    for (const a of assets ?? []) {
      map.set(a.assetClass, (map.get(a.assetClass) ?? 0) + converter.convertToBase(profitLoss(a), a.currencyCode));
    }
    return [...map.entries()]
      .map(([cls, value]) => ({ label: ASSET_CLASS_META[cls].label, value }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  return (
    <>
      {/* 1. Net worth theo thời gian */}
      <Section title="Giá trị ròng theo thời gian"
        extra={
          <div className="flex bg-surface2 rounded-[10px] p-[2px]">
            {RANGES.map((r) => (
              <button key={r.k} onClick={() => setRange(r.k)}
                className="px-[10px] py-[4px] rounded-[8px] text-[11.5px] border-0 cursor-pointer"
                style={{ fontWeight: range === r.k ? 600 : 400,
                  background: range === r.k ? 'var(--surface)' : 'transparent',
                  color: range === r.k ? 'var(--ink)' : 'var(--mut)' }}>{r.label}</button>
            ))}
          </div>
        }>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[22px] font-semibold tnum gold-text">
            {nw ? billions(nw.netWorth) : '—'} tỷ
          </span>
          <span className="text-[12.5px] font-semibold tnum" style={{ color: nwDelta >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
            {nwDelta >= 0 ? '+' : ''}{money(nwDelta)} ₫
          </span>
        </div>
        <LineChart values={nwSeries} />
      </Section>

      {/* 2. Phân bổ */}
      <Section title="Phân bổ tài sản">
        {allocSlices.length ? <Donut slices={allocSlices} /> :
          <div className="text-[13px] text-mut">Chưa có tài sản.</div>}
      </Section>

      {/* 3. Thu–chi theo kỳ */}
      <Section title="Thu – chi 6 tháng gần nhất">
        <GroupedBars data={monthly} />
      </Section>

      {/* 4. Hiệu suất từng lớp tài sản */}
      <Section title="Lời / lỗ theo loại tài sản">
        {plByClass.length ? <PLBars rows={plByClass} /> :
          <div className="text-[13px] text-mut">Chưa có tài sản.</div>}
      </Section>
      <div className="h-2" />
    </>
  );
}
