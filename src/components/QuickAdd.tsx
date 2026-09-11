import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Delete } from 'lucide-react';
import { db, newId, type TransactionKind } from '../db/db';
import { WALLET_ICON } from '../lib/walletIcons';
import { money } from '../lib/format';
import { IconBtn } from './ui';

export function QuickAdd({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('0');
  const [catId, setCatId] = useState<string | null>(null);
  const [walletIdx, setWalletIdx] = useState(0);

  const wallets = useLiveQuery(() => db.wallets.orderBy('sortOrder').toArray(), [], []);
  const cats = useLiveQuery(
    () => db.categories.where('kind').equals(kind === 'income' ? 'income' : 'expense').toArray(),
    [kind], [],
  );
  const topCats = useMemo(() => (cats ?? []).filter((c) => !c.parentId), [cats]);

  const num = parseInt(amount, 10) || 0;
  const kinds: { k: TransactionKind; label: string }[] = [
    { k: 'expense', label: 'Chi' }, { k: 'income', label: 'Thu' }, { k: 'transfer', label: 'Chuyển' },
  ];

  const press = (key: string) => {
    setAmount((a) => {
      if (key === 'del') return a.length <= 1 ? '0' : a.slice(0, -1);
      if (key === '000') return a === '0' ? '0' : (a + '000').slice(0, 13);
      return (a === '0' ? key : a + key).slice(0, 13);
    });
  };

  const reset = () => { setKind('expense'); setAmount('0'); setCatId(null); setWalletIdx(0); };
  const close = () => { reset(); onClose(); };

  const save = async () => {
    if (num <= 0) return;
    const w = (wallets ?? [])[walletIdx];
    const chosenCat = catId ?? topCats[0]?.id;
    await db.transactions.add({
      id: newId(), amount: num, kind, date: Date.now(), currencyCode: 'VND',
      categoryId: kind === 'transfer' ? undefined : chosenCat, tagIds: [],
      walletId: kind === 'transfer' ? undefined : w?.id,
      fromWalletId: kind === 'transfer' ? w?.id : undefined,
    });
    onSaved(`Đã lưu ${kind === 'income' ? 'khoản thu' : kind === 'expense' ? 'khoản chi' : 'chuyển'} ${money(num)} ₫`);
    reset();
    onClose();
  };

  const sign = kind === 'expense' ? '−' : kind === 'income' ? '+' : '';
  const amountColor = num > 0
    ? (kind === 'expense' ? 'var(--neg)' : kind === 'income' ? 'var(--pos)' : 'var(--ink)')
    : 'var(--faint)';

  return (
    <>
      <div onClick={close}
        className="absolute inset-0 z-40 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line pb-4"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .3s cubic-bezier(.22,1,.36,1)' }}>

        <div className="flex items-center gap-[10px] px-4 pt-[14px] pb-1">
          <div className="flex flex-1 bg-surface2 rounded-xl p-[3px]">
            {kinds.map(({ k, label }) => (
              <button key={k} onClick={() => setKind(k)}
                className="flex-1 py-2 rounded-[9px] border-0 cursor-pointer text-[13.5px]"
                style={{ fontWeight: kind === k ? 600 : 400,
                  background: kind === k ? 'var(--surface)' : 'transparent',
                  color: kind === k ? 'var(--ink)' : 'var(--mut)' }}>
                {label}
              </button>
            ))}
          </div>
          <IconBtn onClick={close}><X size={18} /></IconBtn>
        </div>

        <div className="text-right px-[22px] pt-[14px] pb-[6px]">
          <span className="text-[34px] font-semibold -tracking-[1px] tnum" style={{ color: amountColor }}>
            {sign}{money(num)}<span className="text-[20px] ml-1">₫</span>
          </span>
        </div>

        {kind !== 'transfer' ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-[6px] pb-3">
            {topCats.map((c) => {
              const on = (catId ?? topCats[0]?.id) === c.id;
              return (
                <button key={c.id} onClick={() => setCatId(c.id)}
                  className="min-w-[70px] rounded-[14px] px-[6px] py-[10px] cursor-pointer flex flex-col items-center gap-[6px] text-ink"
                  style={{ border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`,
                    background: on ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'var(--surface)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.colorHex }} />
                  <span className="text-[11px]">{c.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-4 pt-[6px] pb-3 text-[13px] text-mut text-center">
            Chọn ví nguồn bên dưới; ví đích chọn ở bước lưu chi tiết.
          </div>
        )}

        <div className="flex gap-2 px-4 pb-[10px] overflow-x-auto no-scrollbar">
          {(wallets ?? []).map((w, i) => (
            <button key={w.id} onClick={() => setWalletIdx(i)}
              className="whitespace-nowrap rounded-[20px] px-[14px] py-[7px] text-[12.5px] cursor-pointer text-ink bg-surface"
              style={{ border: `1px solid ${walletIdx === i ? 'var(--ink)' : 'var(--line)'}`,
                fontWeight: walletIdx === i ? 600 : 400 }}>
              {w.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 pt-1">
          {['1','2','3','4','5','6','7','8','9','000','0','del'].map((k) => (
            <button key={k} onClick={() => press(k)}
              className="py-[15px] text-[19px] font-medium border-0 rounded-[14px] cursor-pointer bg-keypad text-ink tnum grid place-items-center">
              {k === 'del' ? <Delete size={20} /> : k}
            </button>
          ))}
        </div>

        <div className="px-4 pt-3">
          <button onClick={save} disabled={num <= 0}
            className="w-full py-[15px] rounded-[15px] border-0 text-[15.5px] font-semibold"
            style={{ cursor: num > 0 ? 'pointer' : 'default',
              background: num > 0 ? 'var(--grad-gold)' : 'var(--surface2)',
              color: num > 0 ? '#20160C' : 'var(--faint)' }}>
            Lưu giao dịch
          </button>
        </div>
      </div>
    </>
  );
}
