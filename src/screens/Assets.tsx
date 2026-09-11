import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, RefreshCw, ChevronRight } from 'lucide-react';
import {
  db, type Asset, type AssetClass, ASSET_CLASS_META,
  currentValue, totalCost, profitLoss, profitLossPct,
} from '../db/db';
import { ASSET_ICON, ASSET_COLOR } from '../lib/assetIcons';
import { refreshMarketData } from '../lib/pricing';
import { valuation } from '../lib/services';
import { money, vnd } from '../lib/format';
import { AssetDetail } from '../components/AssetDetail';
import { AssetForm } from '../components/AssetForm';

export function Assets({ onToast }: { onToast: (m: string) => void }) {
  const assets = useLiveQuery(() => db.assets.toArray(), [], []);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<AssetClass, Asset[]>();
    for (const a of assets ?? []) {
      const arr = map.get(a.assetClass) ?? [];
      arr.push(a);
      map.set(a.assetClass, arr);
    }
    return [...map.entries()]
      .map(([cls, items]) => ({
        cls,
        items,
        subtotal: items.reduce((s, a) => s + valuation.valueInBase(a), 0),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [assets]);

  const totalValue = groups.reduce((s, g) => s + g.subtotal, 0);
  const totalCostBase = (assets ?? []).reduce((s, a) => s + valuation.costInBase(a), 0);
  const totalPL = totalValue - totalCostBase;
  const up = totalPL >= 0;

  const refreshAll = async () => {
    setRefreshing(true);
    await refreshMarketData();
    setRefreshing(false);
    onToast('Đã cập nhật tỷ giá & giá crypto');
  };

  return (
    <>
      {/* Tổng tài sản */}
      <div className="px-5 pt-[10px] pb-1">
        <div className="text-[13px] text-mut mb-[6px]">Tổng tài sản</div>
        <div className="text-[30px] font-semibold -tracking-[0.8px] tnum gold-text">
          {money(totalValue)}<span className="text-[18px] ml-1">₫</span>
        </div>
        <div className="text-[13px] font-semibold tnum mt-1" style={{ color: up ? 'var(--pos)' : 'var(--neg)' }}>
          {up ? '+' : ''}{vnd(totalPL)} · {up ? '+' : ''}{totalCostBase ? ((totalPL / totalCostBase) * 100).toFixed(1) : '0'}% tổng lời/lỗ
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={refreshAll} disabled={refreshing}
            className="flex-1 py-[11px] rounded-[13px] border border-line bg-surface text-ink text-[13.5px] font-medium flex items-center justify-center gap-2">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Cập nhật giá
          </button>
          <button onClick={() => setAdding(true)}
            className="flex-1 py-[11px] rounded-[13px] border-0 text-[13.5px] font-semibold flex items-center justify-center gap-2"
            style={{ background: 'var(--grad-gold)', color: '#20160C' }}>
            <Plus size={16} /> Thêm tài sản
          </button>
        </div>
      </div>

      {/* Nhóm tài sản */}
      {groups.map((g) => {
        const Icon = ASSET_ICON[g.cls];
        return (
          <div key={g.cls} className="mx-[14px] my-2 bg-surface border border-line rounded-[18px] overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-[30px] h-[30px] rounded-[9px] grid place-items-center"
                  style={{ background: `color-mix(in srgb, ${ASSET_COLOR[g.cls]} 18%, transparent)` }}>
                  <Icon size={16} style={{ color: ASSET_COLOR[g.cls] }} />
                </span>
                <span className="text-[14px] font-semibold">{ASSET_CLASS_META[g.cls].label}</span>
              </div>
              <span className="text-[13px] font-semibold tnum gold-text">{vnd(g.subtotal)}</span>
            </div>
            {g.items.map((a) => {
              const pl = profitLoss(a);
              const plUp = pl >= 0;
              return (
                <button key={a.id} onClick={() => setSelected(a)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-t border-line text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">{a.name}</div>
                    <div className="text-[12px] text-mut tnum">
                      {money(a.quantity)} {a.unit === 'chi' ? 'chỉ' : a.unit === 'share' ? 'cp' : a.unit === 'luong' ? 'lượng' : a.unit}
                      {a.marketSymbol ? ` · ${a.marketSymbol}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tnum">{vnd(currentValue(a))}</div>
                    <div className="text-[11.5px] font-medium tnum" style={{ color: plUp ? 'var(--pos)' : 'var(--neg)' }}>
                      {plUp ? '+' : ''}{(profitLossPct(a) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--faint)' }} />
                </button>
              );
            })}
          </div>
        );
      })}

      {(assets ?? []).length === 0 && (
        <div className="px-5 py-10 text-center text-mut text-[13px]">
          Chưa có tài sản nào. Bấm “Thêm tài sản” để bắt đầu.
        </div>
      )}
      <div className="h-2" />

      <AssetDetail asset={selected} onClose={() => setSelected(null)} />
      <AssetForm open={adding} onClose={() => setAdding(false)} onSaved={onToast} />
    </>
  );
}
