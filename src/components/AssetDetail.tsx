import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, RefreshCw, Trash2 } from 'lucide-react';
import {
  db, newId, type Asset, type PricePoint, ASSET_CLASS_META,
  currentValue, totalCost, profitLoss, profitLossPct, currentUnitValue,
} from '../db/db';
import { refreshMarketData } from '../lib/pricing';
import { applyReferences } from '../lib/reference';
import { isMarketPriced } from '../db/db';
import { money, vnd } from '../lib/format';
import { IconBtn, Spark } from './ui';

const UNIT_LABEL: Record<string, string> = {
  chi: 'chỉ', luong: 'lượng', gram: 'g', carat: 'ct', share: 'cp', unit: 'đv',
};

export function AssetDetail({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const points = useLiveQuery(
    () => (asset ? db.pricePoints.where('assetId').equals(asset.id).sortBy('date') : Promise.resolve([] as PricePoint[])),
    [asset?.id], [] as PricePoint[],
  );
  const [px, setPx] = useState('');
  const [offset, setOffset] = useState('');
  const [loadedOffset, setLoadedOffset] = useState<string | null>(null);

  if (!asset) return <Backdrop open={false} onClose={onClose} />;

  const pl = profitLoss(asset);
  const up = pl >= 0;
  const market = isMarketPriced(asset.assetClass);
  if (loadedOffset !== asset.id) { setLoadedOffset(asset.id); setOffset(asset.priceOffset != null ? String(asset.priceOffset) : ''); }
  const saveOffset = async () => {
    const v = parseFloat(offset.replace(/[^\d.-]/g, ''));
    await db.assets.update(asset.id, { priceOffset: isNaN(v) ? undefined : v });
    await applyReferences();
  };

  const pxNum = parseFloat(px.replace(/[^\d.]/g, '')) || 0;
  const refresh = async () => { await refreshMarketData(); };
  const saveManualPrice = async () => {
    if (pxNum <= 0 || !asset) return;
    await db.assets.update(asset.id, { latestUnitPrice: pxNum, priceUpdatedAt: Date.now() });
    await db.pricePoints.add({ id: newId(), assetId: asset.id, date: Date.now(), unitPrice: pxNum });
    setPx('');
  };
  const remove = async () => { await db.assets.delete(asset.id); onClose(); };

  return (
    <>
      <Backdrop open onClose={onClose} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line pb-5 px-5"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxHeight: '86%', overflowY: 'auto' }}>
        <div className="flex items-center justify-between pt-4 pb-3">
          <div>
            <div className="text-[12.5px] text-mut">{ASSET_CLASS_META[asset.assetClass].label}</div>
            <div className="text-[18px] font-semibold -tracking-[0.2px]">{asset.name}</div>
          </div>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>

        <div className="text-[28px] font-semibold -tracking-[0.6px] tnum" style={{ color: 'var(--gold)' }}>
          {money(currentValue(asset))}<span className="text-[17px] ml-1">₫</span>
        </div>
        <div className="text-[13.5px] font-semibold tnum mt-1" style={{ color: up ? 'var(--pos)' : 'var(--neg)' }}>
          {up ? '+' : ''}{vnd(pl)} · {up ? '+' : ''}{(profitLossPct(asset) * 100).toFixed(1)}%
        </div>

        {points.length >= 2 && <Spark data={points.map((p) => p.unitPrice)} />}

        <div className="mt-4 rounded-[14px] border border-line divide-y" style={{ borderColor: 'var(--line)' }}>
          <Row label="Khối lượng" value={`${money(asset.quantity)} ${UNIT_LABEL[asset.unit] ?? asset.unit}`} />
          <Row label="Giá hiện tại / đv" value={vnd(currentUnitValue(asset))} />
          <Row label="Giá vốn / đv" value={vnd(asset.costBasisPerUnit)} />
          <Row label="Tổng vốn" value={vnd(totalCost(asset))} />
          {asset.purchaseDate && <Row label="Ngày mua" value={new Date(asset.purchaseDate).toLocaleDateString('vi-VN')} />}
          {asset.purity && <Row label="Tuổi/độ tinh khiết" value={asset.purity} />}
          {market && asset.priceUpdatedAt && (
            <Row label="Cập nhật giá" value={new Date(asset.priceUpdatedAt).toLocaleString('vi-VN')} />
          )}
        </div>

        {/* Cập nhật giá tay — dùng cho vàng, chứng khoán, BĐS... */}
        <div className="mt-4">
          <div className="text-[12.5px] text-mut mb-2">Cập nhật giá hiện tại / đơn vị</div>
          <div className="flex gap-2">
            <input value={px} onChange={(e) => setPx(e.target.value)} inputMode="numeric"
              placeholder="Nhập giá mới (VND)"
              className="flex-1 bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none" />
            <button onClick={saveManualPrice} disabled={pxNum <= 0}
              className="px-4 rounded-[12px] border-0 text-[13.5px] font-semibold"
              style={{ background: pxNum > 0 ? 'var(--grad-gold)' : 'var(--surface2)', color: pxNum > 0 ? '#20160C' : 'var(--faint)' }}>
              Lưu
            </button>
          </div>
        </div>

        {asset.assetClass === 'preciousMetal' && (
          <div className="mt-3">
            <div className="text-[12.5px] text-mut mb-2">Biên độ ± so với giá tham chiếu (đ/đơn vị)</div>
            <div className="flex gap-2">
              <input value={offset} onChange={(e) => setOffset(e.target.value)} inputMode="numeric" placeholder="vd -500000 (vàng nhẫn thấp hơn)"
                className="flex-1 bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none" />
              <button onClick={saveOffset} className="px-4 rounded-[12px] border-0 text-[13.5px] font-semibold" style={{ background: 'var(--grad-gold)', color: '#20160C' }}>Áp giá</button>
            </div>
          </div>
        )}

        {asset.assetClass === 'crypto' && (
          <button onClick={refresh}
            className="mt-3 w-full py-[13px] rounded-[14px] border border-line bg-surface text-ink text-[14px] font-medium flex items-center justify-center gap-2">
            <RefreshCw size={16} /> Lấy giá thị trường (tự động)
          </button>
        )}

        <button onClick={remove}
          className="mt-2 w-full py-[13px] rounded-[14px] border-0 text-[14px] font-medium flex items-center justify-center gap-2"
          style={{ background: 'color-mix(in srgb, var(--neg) 12%, transparent)', color: 'var(--neg)' }}>
          <Trash2 size={16} /> Xóa tài sản
        </button>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-[11px]">
      <span className="text-[13px] text-mut">{label}</span>
      <span className="text-[13.5px] font-medium tnum">{value}</span>
    </div>
  );
}

function Backdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-40 transition-opacity duration-200"
      style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
  );
}
