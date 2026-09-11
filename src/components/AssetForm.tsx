import { useState } from 'react';
import { X } from 'lucide-react';
import {
  db, newId, isMarketPriced,
  ASSET_CLASSES, ASSET_CLASS_META,
  type AssetClass, type QuantityUnit, type MetalType,
} from '../db/db';
import { IconBtn } from './ui';

const UNITS: { u: QuantityUnit; label: string }[] = [
  { u: 'unit', label: 'đơn vị' }, { u: 'share', label: 'cổ phiếu' },
  { u: 'chi', label: 'chỉ' }, { u: 'luong', label: 'lượng' },
  { u: 'gram', label: 'gram' }, { u: 'carat', label: 'carat' },
];

export function AssetForm({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [cls, setCls] = useState<AssetClass>('preciousMetal');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<QuantityUnit>('chi');
  const [cost, setCost] = useState('');
  const [curVal, setCurVal] = useState('');
  const [symbol, setSymbol] = useState('');
  const [purity, setPurity] = useState('');
  const [metal, setMetal] = useState<MetalType>('goldBar');
  const [offset, setOffset] = useState('');
  const [buyDate, setBuyDate] = useState('');

  const market = isMarketPriced(cls);
  const num = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;

  const reset = () => {
    setName(''); setCls('preciousMetal'); setQty(''); setUnit('chi');
    setCost(''); setCurVal(''); setSymbol(''); setPurity(''); setBuyDate(''); setMetal('goldBar'); setOffset('');
  };
  const close = () => { reset(); onClose(); };

  const save = async () => {
    if (!name.trim() || num(qty) <= 0) return;
    await db.assets.add({
      id: newId(),
      name: name.trim(),
      assetClass: cls,
      currencyCode: 'VND',
      createdAt: Date.now(),
      purchaseDate: buyDate ? new Date(buyDate).getTime() : undefined,
      quantity: num(qty),
      unit,
      costBasisPerUnit: num(cost),
      manualUnitValue: market ? undefined : (num(curVal) || undefined),
      marketSymbol: market ? (symbol.trim().toUpperCase() || undefined) : undefined,
      latestUnitPrice: market ? (num(curVal) || undefined) : undefined,
      priceUpdatedAt: market && num(curVal) ? Date.now() : undefined,
      purity: cls === 'preciousMetal' ? (purity.trim() || undefined) : undefined,
      metalType: cls === 'preciousMetal' ? metal : undefined,
      priceOffset: cls === 'preciousMetal' ? (parseFloat(offset.replace(/[^\d.-]/g, '')) || undefined) : undefined,
    });
    onSaved(`Đã thêm ${name.trim()}`);
    reset();
    onClose();
  };

  const inputCls =
    'w-full bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';

  return (
    <>
      <div onClick={close} className="absolute inset-0 z-40 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line pb-5"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .3s cubic-bezier(.22,1,.36,1)', maxHeight: '90%', overflowY: 'auto' }}>

        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <span className="text-[16px] font-semibold">Thêm tài sản</span>
          <IconBtn onClick={close}><X size={18} /></IconBtn>
        </div>

        <div className="px-5 flex flex-col gap-3">
          <input className={inputCls} placeholder="Tên tài sản (vd Vàng SJC, Cổ phiếu FPT...)"
            value={name} onChange={(e) => setName(e.target.value)} />

          {/* Loại tài sản */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {ASSET_CLASSES.map((c) => {
              const on = cls === c;
              return (
                <button key={c} onClick={() => setCls(c)}
                  className="whitespace-nowrap rounded-[20px] px-[14px] py-[8px] text-[12.5px] cursor-pointer text-ink bg-surface"
                  style={{ border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`,
                    fontWeight: on ? 600 : 400 }}>
                  {ASSET_CLASS_META[c].label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <input className={inputCls} inputMode="decimal" placeholder="Khối lượng / số lượng"
              value={qty} onChange={(e) => setQty(e.target.value)} />
            <select className={inputCls + ' max-w-[130px]'} value={unit}
              onChange={(e) => setUnit(e.target.value as QuantityUnit)}>
              {UNITS.map((u) => <option key={u.u} value={u.u}>{u.label}</option>)}
            </select>
          </div>

          <input className={inputCls} inputMode="numeric" placeholder="Giá vốn / đơn vị (VND)"
            value={cost} onChange={(e) => setCost(e.target.value)} />

          <input className={inputCls} inputMode="numeric"
            placeholder={market ? 'Giá thị trường hiện tại / đơn vị (VND)' : 'Giá trị hiện tại / đơn vị (VND)'}
            value={curVal} onChange={(e) => setCurVal(e.target.value)} />

          {market && (
            <input className={inputCls} placeholder="Mã lấy giá (vd FPT, BTC, SJC)"
              value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          )}
          {cls === 'preciousMetal' && (
            <>
              <label className="text-[12px] text-mut -mb-1">Loại kim loại</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {([['goldBar','Vàng miếng'],['goldRing','Vàng nhẫn'],['silver','Bạc'],['platinum','Bạch kim']] as [MetalType,string][]).map(([m,label]) => {
                  const on = metal === m;
                  return (
                    <button key={m} onClick={() => setMetal(m)} className="whitespace-nowrap rounded-[20px] px-[13px] py-[8px] text-[12.5px] cursor-pointer text-ink bg-surface"
                      style={{ border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, fontWeight: on ? 600 : 400 }}>{label}</button>
                  );
                })}
              </div>
              <input className={inputCls} placeholder="Tuổi vàng / độ tinh khiết (vd 9999, 24K)" value={purity} onChange={(e) => setPurity(e.target.value)} />
              <input className={inputCls} inputMode="numeric" placeholder="Biên độ ± so với giá tham chiếu (đ/đơn vị, có thể để trống)" value={offset} onChange={(e) => setOffset(e.target.value)} />
              <div className="text-[11.5px] text-faint -mt-1">Để trống nếu bằng đúng giá tham chiếu. Nhập số âm nếu thấp hơn (vd vàng nhẫn).</div>
            </>
          )}

          <label className="text-[12.5px] text-mut -mb-1">Ngày mua</label>
          <input className={inputCls} type="date" value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)} />

          <button onClick={save} disabled={!name.trim() || num(qty) <= 0}
            className="mt-1 w-full py-[15px] rounded-[15px] border-0 text-[15.5px] font-semibold"
            style={{ cursor: name.trim() && num(qty) > 0 ? 'pointer' : 'default',
              background: name.trim() && num(qty) > 0 ? 'var(--grad-gold)' : 'var(--surface2)',
              color: name.trim() && num(qty) > 0 ? '#20160C' : 'var(--faint)' }}>
            Lưu tài sản
          </button>
        </div>
      </div>
    </>
  );
}
