import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Trash2 } from 'lucide-react';
import { db, type Transaction, type TransactionKind } from '../db/db';
import { money } from '../lib/format';
import { IconBtn } from './ui';

export function TransactionEdit({ txn, onClose, onToast }: {
  txn: Transaction | null; onClose: () => void; onToast: (m: string) => void;
}) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<string | undefined>();
  const [walletId, setWalletId] = useState<string | undefined>();
  const [toWalletId, setToWalletId] = useState<string | undefined>();
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const wallets = useLiveQuery(() => db.wallets.orderBy('sortOrder').toArray(), [], []);
  const cats = useLiveQuery(
    () => db.categories.where('kind').equals(kind === 'income' ? 'income' : 'expense').toArray(),
    [kind], [],
  );
  const topCats = (cats ?? []).filter((c) => !c.parentId || true); // cho chọn cả con

  useEffect(() => {
    if (!txn) return;
    setKind(txn.kind);
    setAmount(String(txn.amount));
    setCatId(txn.categoryId);
    setWalletId(txn.walletId ?? txn.fromWalletId);
    setToWalletId(txn.toWalletId);
    setDate(new Date(txn.date).toISOString().slice(0, 10));
    setNote(txn.note ?? '');
  }, [txn]);

  if (!txn) return <Backdrop open={false} onClose={onClose} />;

  const num = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
  const inputCls = 'w-full bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';

  const save = async () => {
    if (num <= 0) return;
    await db.transactions.update(txn.id, {
      kind, amount: num, date: new Date(date).getTime(), note: note.trim() || undefined,
      categoryId: kind === 'transfer' ? undefined : catId,
      walletId: kind === 'transfer' ? undefined : walletId,
      fromWalletId: kind === 'transfer' ? walletId : undefined,
      toWalletId: kind === 'transfer' ? toWalletId : undefined,
    });
    onToast('Đã cập nhật giao dịch');
    onClose();
  };
  const remove = async () => { await db.transactions.delete(txn.id); onToast('Đã xóa giao dịch'); onClose(); };

  const kinds: { k: TransactionKind; label: string }[] = [
    { k: 'expense', label: 'Chi' }, { k: 'income', label: 'Thu' }, { k: 'transfer', label: 'Chuyển' },
  ];

  return (
    <>
      <Backdrop open onClose={onClose} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line pb-5"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxHeight: '90%', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <span className="text-[16px] font-semibold">Sửa giao dịch</span>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>

        <div className="px-5 flex flex-col gap-3">
          <div className="flex bg-surface2 rounded-xl p-[3px]">
            {kinds.map(({ k, label }) => (
              <button key={k} onClick={() => setKind(k)}
                className="flex-1 py-2 rounded-[9px] border-0 cursor-pointer text-[13.5px]"
                style={{ fontWeight: kind === k ? 600 : 400,
                  background: kind === k ? 'var(--surface)' : 'transparent',
                  color: kind === k ? 'var(--ink)' : 'var(--mut)' }}>{label}</button>
            ))}
          </div>

          <input className={inputCls} inputMode="numeric" placeholder="Số tiền"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="text-right -mt-1 text-[12px] text-mut tnum">{money(num)} ₫</div>

          {kind !== 'transfer' ? (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {topCats.map((c) => {
                const on = catId === c.id;
                return (
                  <button key={c.id} onClick={() => setCatId(c.id)}
                    className="whitespace-nowrap rounded-[20px] px-[13px] py-[7px] text-[12.5px] cursor-pointer text-ink bg-surface"
                    style={{ border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, fontWeight: on ? 600 : 400 }}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div>
            <div className="text-[12px] text-mut mb-1">{kind === 'transfer' ? 'Từ ví' : 'Ví'}</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(wallets ?? []).map((w) => {
                const on = walletId === w.id;
                return (
                  <button key={w.id} onClick={() => setWalletId(w.id)}
                    className="whitespace-nowrap rounded-[20px] px-[13px] py-[7px] text-[12.5px] cursor-pointer text-ink bg-surface"
                    style={{ border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`, fontWeight: on ? 600 : 400 }}>
                    {w.name}
                  </button>
                );
              })}
            </div>
          </div>

          {kind === 'transfer' && (
            <div>
              <div className="text-[12px] text-mut mb-1">Đến ví</div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(wallets ?? []).map((w) => {
                  const on = toWalletId === w.id;
                  return (
                    <button key={w.id} onClick={() => setToWalletId(w.id)}
                      className="whitespace-nowrap rounded-[20px] px-[13px] py-[7px] text-[12.5px] cursor-pointer text-ink bg-surface"
                      style={{ border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`, fontWeight: on ? 600 : 400 }}>
                      {w.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className={inputCls} placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />

          <button onClick={save} disabled={num <= 0}
            className="mt-1 w-full py-[15px] rounded-[15px] border-0 text-[15.5px] font-semibold"
            style={{ cursor: num > 0 ? 'pointer' : 'default',
              background: num > 0 ? 'var(--grad-gold)' : 'var(--surface2)', color: num > 0 ? '#20160C' : 'var(--faint)' }}>
            Lưu thay đổi
          </button>
          <button onClick={remove}
            className="w-full py-[13px] rounded-[14px] border-0 text-[14px] font-medium flex items-center justify-center gap-2"
            style={{ background: 'color-mix(in srgb, var(--neg) 12%, transparent)', color: 'var(--neg)' }}>
            <Trash2 size={16} /> Xóa giao dịch
          </button>
        </div>
      </div>
    </>
  );
}

function Backdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-40 transition-opacity duration-200"
      style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
  );
}
