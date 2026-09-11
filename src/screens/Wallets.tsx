import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, X, Trash2, EyeOff, Eye } from 'lucide-react';
import { db, newId, type Wallet, type WalletType, WALLET_TYPES, WALLET_TYPE_META } from '../db/db';
import { walletBalances } from '../db/cashflow';
import { WALLET_ICON } from '../lib/walletIcons';
import { vnd } from '../lib/format';
import { IconBtn } from '../components/ui';
import { Sheet, SaveBtn, inputCls, SWATCHES } from '../components/sheet';

export function Wallets({ onBack, onToast }: { onBack: () => void; onToast: (m: string) => void }) {
  const balances = useLiveQuery(() => walletBalances(), [], []);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const total = (balances ?? []).filter((b) => !b.wallet.isArchived).reduce((s, b) => s + b.balance, 0);

  return (
    <div className="absolute inset-0 z-30 bg-bg overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconBtn onClick={onBack}><ArrowLeft size={18} /></IconBtn>
        <span className="text-[17px] font-semibold">Ví & tài khoản</span>
      </div>

      <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[16px] p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="text-[12px] text-mut">Tổng số dư</div>
        <div className="text-[24px] font-semibold tnum mt-1 gold-text">{vnd(total)}</div>
      </div>

      {(balances ?? []).map(({ wallet: w, balance }) => {
        const Icon = WALLET_ICON[w.type];
        return (
          <button key={w.id} onClick={() => setEditId(w.id)} className="block text-left mx-[14px] my-[8px]" style={{ width: 'calc(100% - 28px)' }}>
            <div className="bg-surface border border-line rounded-[16px] p-4 flex items-center gap-3" style={{ boxShadow: 'var(--card-shadow)', opacity: w.isArchived ? 0.5 : 1 }}>
              <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${w.colorHex} 20%, transparent)` }}>
                <Icon size={18} style={{ color: w.colorHex }} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold truncate">{w.name}</div>
                <div className="text-[12px] text-mut">{WALLET_TYPE_META[w.type].label}{w.isArchived ? ' · đã ẩn' : ''}</div>
              </div>
              <span className="text-[14.5px] font-semibold tnum" style={{ color: balance < 0 ? 'var(--neg)' : 'var(--ink)' }}>{vnd(balance)}</span>
            </div>
          </button>
        );
      })}
      <div className="h-8" />

      <button onClick={() => setAdding(true)} className="absolute right-6 z-10 w-[52px] h-[52px] rounded-full border-0 grid place-items-center cursor-pointer"
        style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))', background: 'var(--grad-gold)', color: '#20160C', boxShadow: '0 10px 22px color-mix(in srgb, var(--copper) 45%, transparent)' }}>
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <WalletForm open={adding} onClose={() => setAdding(false)} onToast={onToast} />
      <WalletEdit walletId={editId} onClose={() => setEditId(null)} onToast={onToast} />
    </div>
  );
}

function TypePicker({ value, onChange }: { value: WalletType; onChange: (t: WalletType) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {WALLET_TYPES.map((t) => {
        const on = value === t;
        return (
          <button key={t} onClick={() => onChange(t)} className="whitespace-nowrap rounded-[20px] px-[13px] py-[8px] text-[12.5px] cursor-pointer text-ink bg-surface"
            style={{ border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, fontWeight: on ? 600 : 400 }}>
            {WALLET_TYPE_META[t].label}
          </button>
        );
      })}
    </div>
  );
}
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {SWATCHES.map((c) => (
        <button key={c} onClick={() => onChange(c)} className="w-8 h-8 rounded-full" style={{ background: c, border: value === c ? '2px solid var(--ink)' : '2px solid transparent' }} />
      ))}
    </div>
  );
}

function WalletForm({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: (m: string) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [bal, setBal] = useState('');
  const [color, setColor] = useState(SWATCHES[1]);
  const num = parseFloat(bal.replace(/[^\d.-]/g, '')) || 0;
  const reset = () => { setName(''); setType('bank'); setBal(''); setColor(SWATCHES[1]); };
  const close = () => { reset(); onClose(); };
  const save = async () => {
    if (!name.trim()) return;
    const count = await db.wallets.count();
    await db.wallets.add({ id: newId(), name: name.trim(), type, currencyCode: 'VND', initialBalance: num, icon: type, colorHex: color, isArchived: false, sortOrder: count, createdAt: Date.now() });
    onToast('Đã thêm ví'); reset(); onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Thêm ví / tài khoản">
      <label className="text-[12px] text-mut -mb-2">Loại</label>
      <TypePicker value={type} onChange={setType} />
      <input className={inputCls} placeholder={type === 'cash' ? 'Tên (vd Tiền mặt)' : type === 'bank' ? 'Tên ngân hàng (vd Vietcombank)' : 'Tên ví'} value={name} onChange={(e) => setName(e.target.value)} />
      <input className={inputCls} inputMode="numeric" placeholder="Số dư hiện tại (VND)" value={bal} onChange={(e) => setBal(e.target.value)} />
      <label className="text-[12px] text-mut -mb-1">Màu</label>
      <ColorPicker value={color} onChange={setColor} />
      <SaveBtn enabled={!!name.trim()} onClick={save} label="Lưu ví" />
    </Sheet>
  );
}

function WalletEdit({ walletId, onClose, onToast }: { walletId: string | null; onClose: () => void; onToast: (m: string) => void }) {
  const w = useLiveQuery(() => (walletId ? db.wallets.get(walletId) : undefined), [walletId]);
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [bal, setBal] = useState('');
  const [color, setColor] = useState(SWATCHES[1]);
  const [loaded, setLoaded] = useState<string | null>(null);
  if (w && loaded !== w.id) { setLoaded(w.id); setName(w.name); setType(w.type); setBal(String(w.initialBalance)); setColor(w.colorHex); }

  if (!walletId || !w) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const num = parseFloat(bal.replace(/[^\d.-]/g, '')) || 0;
  const save = async () => {
    await db.wallets.update(w.id, { name: name.trim() || w.name, type, icon: type, initialBalance: num, colorHex: color });
    onToast('Đã cập nhật ví'); setLoaded(null); onClose();
  };
  const toggleArchive = async () => { await db.wallets.update(w.id, { isArchived: !w.isArchived }); onToast(w.isArchived ? 'Đã hiện ví' : 'Đã ẩn ví'); };
  const remove = async () => {
    if (!confirm('Xóa ví này? Giao dịch cũ gắn với ví sẽ không còn ví tương ứng.')) return;
    await db.wallets.delete(w.id); onToast('Đã xóa ví'); setLoaded(null); onClose();
  };

  return (
    <Sheet open onClose={() => { setLoaded(null); onClose(); }} title="Sửa ví / tài khoản">
      <label className="text-[12px] text-mut -mb-2">Loại</label>
      <TypePicker value={type} onChange={setType} />
      <input className={inputCls} placeholder="Tên" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="text-[12px] text-mut -mb-2">Số dư khởi tạo (số dư hiện tại sẽ tính thêm giao dịch)</label>
      <input className={inputCls} inputMode="numeric" value={bal} onChange={(e) => setBal(e.target.value)} />
      <label className="text-[12px] text-mut -mb-1">Màu</label>
      <ColorPicker value={color} onChange={setColor} />
      <SaveBtn enabled onClick={save} label="Lưu thay đổi" />
      <button onClick={toggleArchive} className="w-full py-[13px] rounded-[14px] border border-line bg-surface text-ink text-[14px] font-medium flex items-center justify-center gap-2">
        {w.isArchived ? <Eye size={16} /> : <EyeOff size={16} />}{w.isArchived ? 'Hiện lại ví' : 'Ẩn ví'}
      </button>
      <button onClick={remove} className="w-full py-[13px] rounded-[14px] border-0 text-[14px] font-medium flex items-center justify-center gap-2"
        style={{ background: 'color-mix(in srgb, var(--neg) 12%, transparent)', color: 'var(--neg)' }}>
        <Trash2 size={16} /> Xóa ví
      </button>
    </Sheet>
  );
}
