import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, X, Trash2, PiggyBank } from 'lucide-react';
import {
  db, newId, type SinkingContribution,
  sinkingSaved, sinkingProgress, suggestedContribution,
} from '../db/db';
import { sinkingViews } from '../db/sinking';
import { money, vnd, daysFromNow } from '../lib/format';
import { IconBtn } from '../components/ui';

export function Sinking({ onBack, onToast }: { onBack: () => void; onToast: (m: string) => void }) {
  const views = useLiveQuery(() => sinkingViews(true), [], []);
  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const totals = useMemo(() => {
    let saved = 0, target = 0;
    for (const v of views ?? []) { if (!v.fund.isActive) continue; saved += v.saved; target += v.target; }
    return { saved, target };
  }, [views]);

  return (
    <div className="absolute inset-0 z-30 bg-bg overflow-y-auto no-scrollbar"
      style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconBtn onClick={onBack}><ArrowLeft size={18} /></IconBtn>
        <span className="text-[17px] font-semibold">Quỹ tích lũy</span>
      </div>

      {/* Tổng quan */}
      <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[16px] p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="text-[12px] text-mut">Đã để dành / mục tiêu</div>
        <div className="text-[22px] font-semibold tnum mt-1 gold-text">{money(totals.saved)} / {money(totals.target)} ₫</div>
        <div className="h-[6px] bg-surface2 rounded-[4px] overflow-hidden mt-3">
          <div className="h-full rounded-[4px] grad-gold-bg" style={{ width: `${totals.target ? Math.min(100, (totals.saved / totals.target) * 100) : 0}%` }} />
        </div>
      </div>

      {(views ?? []).length === 0 && (
        <div className="px-5 py-10 text-center text-mut text-[13px]">Chưa có quỹ nào. Bấm + để tạo quỹ tích lũy.</div>
      )}
      {(views ?? []).map((v) => (
        <button key={v.fund.id} onClick={() => setDetailId(v.fund.id)}
          className="block text-left mx-[14px] my-[10px]" style={{ width: 'calc(100% - 28px)' }}>
          <div className="bg-surface border border-line rounded-[16px] p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold truncate flex items-center gap-2">
                  <PiggyBank size={15} style={{ color: '#4FB286' }} />{v.fund.name}
                </div>
                <div className="text-[12px] text-mut mt-[2px]">
                  Còn {daysFromNow(v.fund.dueDate)} ngày · nên để dành {money(v.suggested)}₫/tháng
                </div>
              </div>
              {!v.fund.isActive
                ? <Badge text="Đã xong" color="var(--mut)" />
                : v.onTrack ? <Badge text="Đúng tiến độ" color="var(--pos)" /> : <Badge text="Đang chậm" color="var(--neg)" />}
            </div>
            <div className="h-[6px] bg-surface2 rounded-[4px] overflow-hidden mt-3">
              <div className="h-full rounded-[4px] grad-gold-bg" style={{ width: `${Math.min(100, v.progress * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[12px] mt-2 tnum">
              <span className="text-mut">{money(v.saved)} / {money(v.target)}</span>
              <span className="text-faint">{Math.round(v.progress * 100)}%</span>
            </div>
          </div>
        </button>
      ))}
      <div className="h-8" />

      <button onClick={() => setAdding(true)}
        className="absolute right-6 z-10 w-[52px] h-[52px] rounded-full border-0 grid place-items-center cursor-pointer"
        style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))', background: 'var(--grad-gold)', color: '#20160C', boxShadow: '0 10px 22px color-mix(in srgb, var(--copper) 45%, transparent)' }}>
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <SinkingForm open={adding} onClose={() => setAdding(false)} onToast={onToast} />
      <SinkingDetail fundId={detailId} onClose={() => setDetailId(null)} onToast={onToast} />
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[11px] font-semibold rounded-[8px] px-2 py-[3px] shrink-0 ml-2"
      style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>{text}</span>
  );
}

function SinkingForm({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: (m: string) => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [due, setDue] = useState('');
  const [remind, setRemind] = useState(true);
  const [dayOfMonth, setDayOfMonth] = useState('5');

  const num = parseFloat(target.replace(/[^\d.]/g, '')) || 0;
  const inputCls = 'w-full bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';
  const reset = () => { setName(''); setTarget(''); setDue(''); setRemind(true); setDayOfMonth('5'); };
  const close = () => { reset(); onClose(); };
  const save = async () => {
    if (!name.trim() || num <= 0 || !due) return;
    await db.sinkingFunds.add({
      id: newId(), name: name.trim(), targetAmount: num, currencyCode: 'VND',
      dueDate: new Date(due).getTime(), reminderEnabled: remind,
      reminderDayOfMonth: parseInt(dayOfMonth, 10) || 1, isActive: true, createdAt: Date.now(),
    });
    onToast('Đã tạo quỹ tích lũy'); reset(); onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Thêm quỹ tích lũy">
      <input className={inputCls} placeholder="Tên quỹ (vd Bảo hiểm, Thuế, Du lịch...)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={inputCls} inputMode="numeric" placeholder="Số tiền cần đủ (VND)" value={target} onChange={(e) => setTarget(e.target.value)} />
      <div className="text-right -mt-1 text-[12px] text-mut tnum">{money(num)} ₫</div>
      <label className="text-[12px] text-mut -mb-2">Ngày cần đủ tiền</label>
      <input className={inputCls} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <label className="flex items-center justify-between py-1">
        <span className="text-[13.5px]">Nhắc để dành mỗi tháng</span>
        <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="w-5 h-5" style={{ accentColor: 'var(--gold)' }} />
      </label>
      {remind && (
        <label className="flex items-center justify-between">
          <span className="text-[13.5px] text-mut">Nhắc vào ngày</span>
          <input className={inputCls + ' max-w-[90px] text-center'} inputMode="numeric" value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)} />
        </label>
      )}
      <SaveBtn enabled={!!name.trim() && num > 0 && !!due} onClick={save} label="Lưu quỹ" />
    </Sheet>
  );
}

function SinkingDetail({ fundId, onClose, onToast }: { fundId: string | null; onClose: () => void; onToast: (m: string) => void }) {
  const fund = useLiveQuery(() => (fundId ? db.sinkingFunds.get(fundId) : undefined), [fundId]);
  const contribs = useLiveQuery(
    () => (fundId ? db.sinkingContributions.where('fundId').equals(fundId).sortBy('date') : Promise.resolve([] as SinkingContribution[])),
    [fundId], [] as SinkingContribution[],
  );
  const [add, setAdd] = useState('');

  if (!fundId || !fund) return <Backdrop open={false} onClose={onClose} />;

  const saved = sinkingSaved(contribs);
  const suggested = suggestedContribution(fund, saved);
  const progress = sinkingProgress(fund, saved);
  const num = parseFloat(add.replace(/[^\d.]/g, '')) || 0;
  const inputCls = 'flex-1 bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';

  const contribute = async () => {
    if (num <= 0) return;
    await db.sinkingContributions.add({ id: newId(), fundId, date: Date.now(), amount: num });
    if (saved + num >= fund.targetAmount) await db.sinkingFunds.update(fundId, { isActive: false });
    setAdd(''); onToast('Đã ghi nhận để dành');
  };
  const remove = async () => {
    await db.sinkingContributions.where('fundId').equals(fundId).delete();
    await db.sinkingFunds.delete(fundId); onToast('Đã xóa quỹ'); onClose();
  };

  return (
    <>
      <Backdrop open onClose={onClose} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line px-5"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxHeight: '88%', overflowY: 'auto' }}>
        <div className="flex items-center justify-between pt-4 pb-2">
          <div><div className="text-[12.5px] text-mut">Quỹ tích lũy</div><div className="text-[18px] font-semibold">{fund.name}</div></div>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>

        <div className="text-[26px] font-semibold tnum gold-text">{money(saved)}<span className="text-[15px] ml-1">/ {money(fund.targetAmount)} ₫</span></div>
        <div className="text-[12.5px] text-mut mt-1">
          Còn {daysFromNow(fund.dueDate)} ngày · nên để dành {money(suggested)}₫/tháng
        </div>
        <div className="h-[7px] bg-surface2 rounded-[4px] overflow-hidden mt-3">
          <div className="h-full rounded-[4px] grad-gold-bg" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>

        {fund.isActive && (
          <div className="flex gap-2 mt-4">
            <input className={inputCls} inputMode="numeric" placeholder="Số tiền để dành" value={add} onChange={(e) => setAdd(e.target.value)} />
            <button onClick={contribute} disabled={num <= 0} className="px-4 rounded-[12px] border-0 text-[13.5px] font-semibold"
              style={{ background: num > 0 ? 'var(--grad-gold)' : 'var(--surface2)', color: num > 0 ? '#20160C' : 'var(--faint)' }}>Ghi nhận</button>
          </div>
        )}

        {contribs.length > 0 && (
          <div className="mt-4">
            <div className="text-[12.5px] text-mut mb-2">Lịch sử để dành</div>
            <div className="rounded-[12px] border border-line divide-y" style={{ borderColor: 'var(--line)' }}>
              {contribs.map((c) => (
                <div key={c.id} className="flex justify-between px-3 py-[10px]">
                  <span className="text-[13px] text-mut">{new Date(c.date).toLocaleDateString('vi-VN')}</span>
                  <span className="text-[13.5px] font-medium tnum">{vnd(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={remove} className="mt-4 w-full py-[13px] rounded-[14px] border-0 text-[14px] font-medium flex items-center justify-center gap-2"
          style={{ background: 'color-mix(in srgb, var(--neg) 12%, transparent)', color: 'var(--neg)' }}>
          <Trash2 size={16} /> Xóa quỹ
        </button>
      </div>
    </>
  );
}

/* helpers dùng lại */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <>
      <Backdrop open={open} onClose={onClose} />
      <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .3s cubic-bezier(.22,1,.36,1)', maxHeight: '90%', overflowY: 'auto' }}>
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
    <button onClick={onClick} disabled={!enabled} className="mt-1 w-full py-[15px] rounded-[15px] border-0 text-[15.5px] font-semibold"
      style={{ cursor: enabled ? 'pointer' : 'default', background: enabled ? 'var(--grad-gold)' : 'var(--surface2)', color: enabled ? '#20160C' : 'var(--faint)' }}>
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
