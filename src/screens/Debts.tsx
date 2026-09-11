import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, X, Trash2, CheckCircle2 } from 'lucide-react';
import {
  db, newId, type DebtDirection, type DebtPayment, debtPaid, debtOutstanding,
} from '../db/db';
import { debtViews, recordDebtPayment } from '../db/debts';
import { money, vnd, daysFromNow } from '../lib/format';
import { IconBtn } from '../components/ui';

export function Debts({ onBack, onToast }: { onBack: () => void; onToast: (m: string) => void }) {
  const views = useLiveQuery(() => debtViews({ includeSettled: true }), [], []);
  const [dir, setDir] = useState<DebtDirection>('iOwe');
  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const totals = useMemo(() => {
    let iOwe = 0, owed = 0;
    for (const v of views ?? []) {
      if (v.debt.isSettled) continue;
      if (v.debt.direction === 'iOwe') iOwe += v.outstanding; else owed += v.outstanding;
    }
    return { iOwe, owed };
  }, [views]);

  const list = useMemo(
    () => (views ?? []).filter((v) => v.debt.direction === dir)
      .sort((a, b) => Number(a.debt.isSettled) - Number(b.debt.isSettled) || (a.debt.dueDate ?? 9e15) - (b.debt.dueDate ?? 9e15)),
    [views, dir],
  );

  return (
    <div className="absolute inset-0 z-30 bg-bg overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconBtn onClick={onBack}><ArrowLeft size={18} /></IconBtn>
        <span className="text-[17px] font-semibold">Vay – Nợ</span>
      </div>

      {/* Tổng hai chiều */}
      <div className="flex gap-3 px-4 pt-2">
        <SummaryCard label="Mình đang nợ" value={totals.iOwe} color="var(--neg)" />
        <SummaryCard label="Người khác nợ mình" value={totals.owed} color="var(--pos)" />
      </div>

      {/* Chọn chiều */}
      <div className="px-4 pt-4">
        <div className="flex bg-surface2 rounded-xl p-[3px]">
          {([['iOwe', 'Mình nợ'], ['owedToMe', 'Người khác nợ mình']] as [DebtDirection, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setDir(k)}
              className="flex-1 py-2 rounded-[9px] border-0 cursor-pointer text-[13px]"
              style={{ fontWeight: dir === k ? 600 : 400,
                background: dir === k ? 'var(--surface)' : 'transparent',
                color: dir === k ? 'var(--ink)' : 'var(--mut)' }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      {list.length === 0 && (
        <div className="px-5 py-10 text-center text-mut text-[13px]">Chưa có khoản nào ở mục này.</div>
      )}
      {list.map((v) => {
        const overdue = !v.debt.isSettled && v.debt.dueDate != null && v.debt.dueDate < Date.now();
        const ratio = v.debt.principal ? v.paid / v.debt.principal : 0;
        return (
          <button key={v.debt.id} onClick={() => setDetailId(v.debt.id)}
            className="w-full text-left mx-[14px] my-2 block" style={{ width: 'calc(100% - 28px)' }}>
            <div className="bg-surface border border-line rounded-[16px] p-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold truncate">{v.debt.counterparty}</div>
                  <div className="text-[12px]" style={{ color: overdue ? 'var(--neg)' : 'var(--mut)' }}>
                    {v.debt.isSettled ? 'Đã tất toán'
                      : v.debt.dueDate ? (overdue ? `Quá hạn ${-daysFromNow(v.debt.dueDate)} ngày`
                        : `Còn ${daysFromNow(v.debt.dueDate)} ngày`) : 'Không hạn'}
                    {v.debt.note ? ` · ${v.debt.note}` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-[14.5px] font-semibold tnum">{vnd(v.outstanding)}</div>
                  {v.paid > 0 && <div className="text-[11px] text-faint tnum">đã trả {money(v.paid)}</div>}
                </div>
              </div>
              {!v.debt.isSettled && v.debt.principal > 0 && (
                <div className="h-[5px] bg-surface2 rounded-[4px] overflow-hidden mt-3">
                  <div className="h-full rounded-[4px]" style={{ width: `${Math.min(100, ratio * 100)}%`, background: 'var(--gold)' }} />
                </div>
              )}
            </div>
          </button>
        );
      })}
      <div className="h-24" />

      {/* Nút thêm */}
      <button onClick={() => setAdding(true)}
        className="absolute right-6 z-10 w-[52px] h-[52px] rounded-full border-0 grid place-items-center cursor-pointer"
        style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))', background: 'var(--grad-gold)', color: '#20160C', boxShadow: '0 10px 22px color-mix(in srgb, var(--copper) 45%, transparent)' }}>
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <DebtForm open={adding} initialDir={dir} onClose={() => setAdding(false)} onToast={onToast} />
      <DebtDetail debtId={detailId} onClose={() => setDetailId(null)} onToast={onToast} />
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 bg-surface border border-line rounded-[16px] p-4">
      <div className="text-[12px] text-mut">{label}</div>
      <div className="text-[17px] font-semibold tnum mt-1" style={{ color }}>{vnd(value)}</div>
    </div>
  );
}

/* ── Thêm khoản vay/nợ ── */
function DebtForm({ open, initialDir, onClose, onToast }: {
  open: boolean; initialDir: DebtDirection; onClose: () => void; onToast: (m: string) => void;
}) {
  const [dir, setDir] = useState<DebtDirection>(initialDir);
  const [who, setWho] = useState('');
  const [amount, setAmount] = useState('');
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const [remind, setRemind] = useState(true);

  const num = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
  const inputCls = 'w-full bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';
  const reset = () => { setWho(''); setAmount(''); setDue(''); setNote(''); setRemind(true); };
  const close = () => { reset(); onClose(); };

  const save = async () => {
    if (!who.trim() || num <= 0) return;
    await db.debts.add({
      id: newId(), direction: dir, counterparty: who.trim(), principal: num, currencyCode: 'VND',
      startDate: new Date(start).getTime(), dueDate: due ? new Date(due).getTime() : undefined,
      note: note.trim() || undefined, isSettled: false,
      reminderEnabled: remind, reminderLeadDays: 3, createdAt: Date.now(),
    });
    onToast('Đã thêm khoản vay–nợ'); reset(); onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Thêm khoản vay – nợ">
      <div className="flex bg-surface2 rounded-xl p-[3px]">
        {([['iOwe', 'Mình vay'], ['owedToMe', 'Cho vay']] as [DebtDirection, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setDir(k)}
            className="flex-1 py-2 rounded-[9px] border-0 cursor-pointer text-[13px]"
            style={{ fontWeight: dir === k ? 600 : 400, background: dir === k ? 'var(--surface)' : 'transparent',
              color: dir === k ? 'var(--ink)' : 'var(--mut)' }}>{label}</button>
        ))}
      </div>
      <input className={inputCls} placeholder={dir === 'iOwe' ? 'Vay của ai?' : 'Ai vay mình?'} value={who} onChange={(e) => setWho(e.target.value)} />
      <input className={inputCls} inputMode="numeric" placeholder="Số tiền (VND)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div className="text-right -mt-1 text-[12px] text-mut tnum">{money(num)} ₫</div>
      <label className="text-[12px] text-mut -mb-2">Ngày vay/cho vay</label>
      <input className={inputCls} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      <label className="text-[12px] text-mut -mb-2">Hạn trả (tùy chọn)</label>
      <input className={inputCls} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <input className={inputCls} placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
      <label className="flex items-center justify-between py-1">
        <span className="text-[13.5px]">Nhắc trước hạn 3 ngày</span>
        <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="w-5 h-5 accent-current" style={{ accentColor: 'var(--gold)' }} />
      </label>
      <SaveBtn enabled={!!who.trim() && num > 0} onClick={save} label="Lưu khoản" />
    </Sheet>
  );
}

/* ── Chi tiết + ghi nhận trả/thu ── */
function DebtDetail({ debtId, onClose, onToast }: {
  debtId: string | null; onClose: () => void; onToast: (m: string) => void;
}) {
  const debt = useLiveQuery(() => (debtId ? db.debts.get(debtId) : undefined), [debtId]);
  const payments = useLiveQuery(
    () => (debtId ? db.debtPayments.where('debtId').equals(debtId).sortBy('date') : Promise.resolve([] as DebtPayment[])),
    [debtId], [] as DebtPayment[],
  );
  const [pay, setPay] = useState('');

  if (!debtId || !debt) return <Backdrop open={false} onClose={onClose} />;

  const paid = debtPaid(payments);
  const outstanding = debtOutstanding(debt, payments);
  const num = parseFloat(pay.replace(/[^\d.]/g, '')) || 0;
  const inputCls = 'flex-1 bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';

  const doPay = async () => {
    if (num <= 0) return;
    await recordDebtPayment({ debtId, amount: num });
    setPay(''); onToast(debt.direction === 'iOwe' ? 'Đã ghi nhận trả' : 'Đã ghi nhận thu');
  };
  const settle = async () => { await db.debts.update(debtId, { isSettled: true }); onToast('Đã tất toán'); onClose(); };
  const remove = async () => {
    await db.debtPayments.where('debtId').equals(debtId).delete();
    await db.debts.delete(debtId); onToast('Đã xóa'); onClose();
  };

  return (
    <>
      <Backdrop open onClose={onClose} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line pb-5 px-5"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxHeight: '88%', overflowY: 'auto' }}>
        <div className="flex items-center justify-between pt-4 pb-2">
          <div>
            <div className="text-[12.5px] text-mut">{debt.direction === 'iOwe' ? 'Mình nợ' : 'Người khác nợ mình'}</div>
            <div className="text-[18px] font-semibold">{debt.counterparty}</div>
          </div>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>

        <div className="text-[26px] font-semibold tnum gold-text">
          {money(outstanding)}<span className="text-[16px] ml-1">₫ còn lại</span>
        </div>
        <div className="text-[12.5px] text-mut tnum mt-1">Gốc {money(debt.principal)} · đã {debt.direction === 'iOwe' ? 'trả' : 'thu'} {money(paid)}</div>

        {!debt.isSettled && (
          <div className="flex gap-2 mt-4">
            <input className={inputCls} inputMode="numeric"
              placeholder={debt.direction === 'iOwe' ? 'Số tiền trả' : 'Số tiền thu'} value={pay} onChange={(e) => setPay(e.target.value)} />
            <button onClick={doPay} disabled={num <= 0}
              className="px-4 rounded-[12px] border-0 text-[13.5px] font-semibold"
              style={{ background: num > 0 ? 'var(--grad-gold)' : 'var(--surface2)', color: num > 0 ? '#20160C' : 'var(--faint)' }}>
              Ghi nhận
            </button>
          </div>
        )}

        {payments.length > 0 && (
          <div className="mt-4">
            <div className="text-[12.5px] text-mut mb-2">Lịch sử {debt.direction === 'iOwe' ? 'trả' : 'thu'}</div>
            <div className="rounded-[12px] border border-line divide-y" style={{ borderColor: 'var(--line)' }}>
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between px-3 py-[10px]">
                  <span className="text-[13px] text-mut">{new Date(p.date).toLocaleDateString('vi-VN')}</span>
                  <span className="text-[13.5px] font-medium tnum">{vnd(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!debt.isSettled && (
          <button onClick={settle}
            className="mt-4 w-full py-[13px] rounded-[14px] border border-line bg-surface text-ink text-[14px] font-medium flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> Đánh dấu đã tất toán
          </button>
        )}
        <button onClick={remove}
          className="mt-2 w-full py-[13px] rounded-[14px] border-0 text-[14px] font-medium flex items-center justify-center gap-2"
          style={{ background: 'color-mix(in srgb, var(--neg) 12%, transparent)', color: 'var(--neg)' }}>
          <Trash2 size={16} /> Xóa khoản
        </button>
      </div>
    </>
  );
}

/* ── tiện ích sheet dùng lại ── */
function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <>
      <Backdrop open={open} onClose={onClose} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line pb-5"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .3s cubic-bezier(.22,1,.36,1)', maxHeight: '90%', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <span className="text-[16px] font-semibold">{title}</span>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="px-5 flex flex-col gap-3">{children}</div>
      </div>
    </>
  );
}
function SaveBtn({ enabled, onClick, label }: { enabled: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={!enabled}
      className="mt-1 w-full py-[15px] rounded-[15px] border-0 text-[15.5px] font-semibold"
      style={{ cursor: enabled ? 'pointer' : 'default',
        background: enabled ? 'var(--grad-gold)' : 'var(--surface2)', color: enabled ? '#20160C' : 'var(--faint)' }}>
      {label}
    </button>
  );
}
function Backdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-40 transition-opacity duration-200"
      style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
  );
}
