import { useState } from 'react';
import { ArrowLeft, RefreshCw, Coins, CircleDollarSign } from 'lucide-react';
import { IconBtn } from '../components/ui';
import { inputCls, MoneyInput } from '../components/sheet';
import { money } from '../lib/format';
import {
  getGoldRefPerLuong, getSilverRefPerKg, setGoldRefPerLuong, setSilverRefPerKg,
  getGoldTs, getSilverTs, fetchGoldBTMC, fetchSilverAncarat, applyReferences,
} from '../lib/reference';

const ago = (ts: number) => ts ? `cập nhật ${new Date(ts).toLocaleString('vi-VN')}` : 'chưa có';

export function Reference({ onBack, onToast }: { onBack: () => void; onToast: (m: string) => void }) {
  const [gold, setGold] = useState(String(getGoldRefPerLuong() || ''));
  const [silver, setSilver] = useState(String(getSilverRefPerKg() || ''));
  const [gTs, setGTs] = useState(getGoldTs());
  const [sTs, setSTs] = useState(getSilverTs());
  const [busy, setBusy] = useState<'' | 'gold' | 'silver'>('');

  const gNum = parseFloat(gold.replace(/[^\d.]/g, '')) || 0;
  const sNum = parseFloat(silver.replace(/[^\d.]/g, '')) || 0;

  const saveGold = () => { setGoldRefPerLuong(gNum); setGTs(getGoldTs()); onToast('Đã lưu giá vàng tham chiếu'); };
  const saveSilver = () => { setSilverRefPerKg(sNum); setSTs(getSilverTs()); onToast('Đã lưu giá bạc tham chiếu'); };
  const fetchGold = async () => { setBusy('gold'); const v = await fetchGoldBTMC(); if (v) { setGold(String(v)); onToast('Đã lấy: ' + money(v) + ' đ/lượng — kiểm tra rồi bấm Lưu'); } else onToast('Chưa lấy được từ BTMC — nhập tay'); setBusy(''); };
  const fetchSilver = async () => { setBusy('silver'); const v = await fetchSilverAncarat(); if (v) { setSilver(String(v)); onToast('Đã lấy: ' + money(v) + ' đ/kg — kiểm tra rồi bấm Lưu'); } else onToast('Chưa lấy được từ Ancarat — nhập tay'); setBusy(''); };
  const apply = async () => { await applyReferences(); onToast('Đã áp giá vào tài sản vàng/bạc'); };

  return (
    <div className="absolute inset-0 z-30 bg-bg overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconBtn onClick={onBack}><ArrowLeft size={18} /></IconBtn>
        <span className="text-[17px] font-semibold">Giá tham chiếu</span>
      </div>

      {/* Vàng SJC */}
      <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[16px] p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-[34px] h-[34px] rounded-[10px] grid place-items-center" style={{ background: 'color-mix(in srgb, #C9A96A 18%, transparent)' }}>
            <Coins size={17} style={{ color: '#C9A96A' }} />
          </span>
          <div><div className="text-[14px] font-semibold">Vàng (BTMC)</div><div className="text-[11.5px] text-mut">đồng / lượng · {ago(gTs)}</div></div>
        </div>
        <MoneyInput value={gold} onChange={setGold} placeholder="Giá vàng (đ/lượng)" className={inputCls} />
        {gNum > 0 && <div className="text-[12px] text-mut mt-1 tnum">≈ {money(gNum / 10)} đ/chỉ</div>}
        <div className="flex gap-2 mt-3">
          <button onClick={fetchGold} disabled={busy === 'gold'} className="flex-1 py-[11px] rounded-[12px] border border-line bg-surface text-ink text-[13.5px] font-medium flex items-center justify-center gap-2">
            <RefreshCw size={15} className={busy === 'gold' ? 'animate-spin' : ''} /> Lấy từ BTMC
          </button>
          <button onClick={saveGold} className="flex-1 py-[11px] rounded-[12px] border-0 text-[13.5px] font-semibold" style={{ background: 'var(--grad-gold)', color: '#20160C' }}>Lưu</button>
        </div>
      </div>

      {/* Bạc Ancarat */}
      <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[16px] p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-[34px] h-[34px] rounded-[10px] grid place-items-center" style={{ background: 'color-mix(in srgb, #8A8F98 20%, transparent)' }}>
            <CircleDollarSign size={17} style={{ color: '#8A8F98' }} />
          </span>
          <div><div className="text-[14px] font-semibold">Bạc Ancarat (1 kg)</div><div className="text-[11.5px] text-mut">đồng / kg · {ago(sTs)}</div></div>
        </div>
        <MoneyInput value={silver} onChange={setSilver} placeholder="Giá bạc Ancarat (đ/kg)" className={inputCls} />
        {sNum > 0 && <div className="text-[12px] text-mut mt-1 tnum">≈ {money(sNum / 1000)} đ/gram</div>}
        <div className="flex gap-2 mt-3">
          <button onClick={fetchSilver} disabled={busy === 'silver'} className="flex-1 py-[11px] rounded-[12px] border border-line bg-surface text-ink text-[13.5px] font-medium flex items-center justify-center gap-2">
            <RefreshCw size={15} className={busy === 'silver' ? 'animate-spin' : ''} /> Lấy từ Ancarat
          </button>
          <button onClick={saveSilver} className="flex-1 py-[11px] rounded-[12px] border-0 text-[13.5px] font-semibold" style={{ background: 'var(--grad-gold)', color: '#20160C' }}>Lưu</button>
        </div>
      </div>

      <div className="px-[14px]">
        <button onClick={apply} className="w-full py-[13px] rounded-[14px] border-0 text-[14px] font-semibold" style={{ background: 'var(--grad-gold)', color: '#20160C' }}>
          Áp giá tham chiếu vào tài sản vàng/bạc
        </button>
      </div>
      <div className="px-6 pt-3 text-[11.5px] text-faint leading-relaxed">
        Mỗi khoản vàng/bạc có thể đặt <b>biên độ ±</b> riêng (khi thêm/sửa tài sản) — giá dùng = giá tham chiếu quy theo đơn vị ± biên độ. Nút "Cập nhật giá" ở màn Tài sản cũng tự áp giá này.
      </div>
    </div>
  );
}
