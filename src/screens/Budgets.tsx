import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { db, newId, type BudgetPeriod, type Category } from '../db/db';
import { budgetProgress } from '../db/cashflow';
import { money } from '../lib/format';
import { IconBtn } from '../components/ui';
import { Sheet, SaveBtn, inputCls, MoneyInput } from '../components/sheet';

const PERIODS: { p: BudgetPeriod; label: string }[] = [
  { p: 'weekly', label: 'Tuần' }, { p: 'monthly', label: 'Tháng' },
  { p: 'quarterly', label: 'Quý' }, { p: 'yearly', label: 'Năm' },
];
const periodLabel = (p: BudgetPeriod) => PERIODS.find((x) => x.p === p)?.label ?? p;

export function Budgets({ onBack, onToast }: { onBack: () => void; onToast: (m: string) => void }) {
  const items = useLiveQuery(() => budgetProgress(), [], []);
  const cats = useLiveQuery(() => db.categories.where('kind').equals('expense').toArray(), [], []);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const catMap = new Map((cats ?? []).map((c) => [c.id, c]));

  return (
    <div className="absolute inset-0 z-30 bg-bg overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconBtn onClick={onBack}><ArrowLeft size={18} /></IconBtn>
        <span className="text-[17px] font-semibold">Ngân sách</span>
      </div>

      {(items ?? []).length === 0 && (
        <div className="px-5 py-10 text-center text-mut text-[13px]">Chưa có hạn mức nào. Bấm + để cấp hạn mức cho một hạng mục.</div>
      )}
      {(items ?? []).map((b) => {
        const c = b.status === 'exceeded' ? 'var(--neg)' : b.status === 'warning' ? 'var(--gold)' : 'var(--pos)';
        const cat = b.budget.categoryId ? catMap.get(b.budget.categoryId) : undefined;
        return (
          <button key={b.budget.id} onClick={() => setEditId(b.budget.id)} className="block text-left mx-[14px] my-[8px]" style={{ width: 'calc(100% - 28px)' }}>
            <div className="bg-surface border border-line rounded-[16px] p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
              <div className="flex justify-between items-baseline mb-2">
                <div>
                  <div className="text-[14.5px] font-semibold">{b.budget.name}</div>
                  <div className="text-[11.5px] text-mut">{cat ? cat.name + ' · ' : ''}mỗi {periodLabel(b.budget.period).toLowerCase()}</div>
                </div>
                <span className="text-[12.5px] text-mut tnum">{money(b.spent)} / {money(b.budget.limitAmount)}</span>
              </div>
              <div className="h-[6px] bg-surface2 rounded-[4px] overflow-hidden">
                <div className="h-full rounded-[4px]" style={{ width: `${Math.min(100, b.ratio * 100)}%`, background: c }} />
              </div>
            </div>
          </button>
        );
      })}
      <div className="h-8" />

      <button onClick={() => setAdding(true)} className="absolute right-6 z-10 w-[52px] h-[52px] rounded-full border-0 grid place-items-center cursor-pointer"
        style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))', background: 'var(--grad-gold)', color: '#20160C', boxShadow: '0 10px 22px color-mix(in srgb, var(--copper) 45%, transparent)' }}>
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <BudgetForm open={adding} cats={cats ?? []} onClose={() => setAdding(false)} onToast={onToast} />
      <BudgetEdit budgetId={editId} cats={cats ?? []} onClose={() => setEditId(null)} onToast={onToast} />
    </div>
  );
}

function CatPicker({ cats, value, onChange }: { cats: Category[]; value?: string; onChange: (id: string, name: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {cats.map((c) => {
        const on = value === c.id;
        return (
          <button key={c.id} onClick={() => onChange(c.id, c.name)} className="whitespace-nowrap rounded-[20px] px-[13px] py-[8px] text-[12.5px] cursor-pointer text-ink bg-surface"
            style={{ border: `1px solid ${on ? 'var(--gold)' : 'var(--line)'}`, fontWeight: on ? 600 : 400 }}>{c.name}</button>
        );
      })}
    </div>
  );
}
function PeriodPicker({ value, onChange }: { value: BudgetPeriod; onChange: (p: BudgetPeriod) => void }) {
  return (
    <div className="flex bg-surface2 rounded-xl p-[3px]">
      {PERIODS.map(({ p, label }) => (
        <button key={p} onClick={() => onChange(p)} className="flex-1 py-2 rounded-[9px] border-0 cursor-pointer text-[13px]"
          style={{ fontWeight: value === p ? 600 : 400, background: value === p ? 'var(--surface)' : 'transparent', color: value === p ? 'var(--ink)' : 'var(--mut)' }}>{label}</button>
      ))}
    </div>
  );
}

function BudgetForm({ open, cats, onClose, onToast }: { open: boolean; cats: Category[]; onClose: () => void; onToast: (m: string) => void }) {
  const [name, setName] = useState('');
  const [catId, setCatId] = useState<string | undefined>();
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const num = parseFloat(limit.replace(/[^\d.]/g, '')) || 0;
  const reset = () => { setName(''); setCatId(undefined); setLimit(''); setPeriod('monthly'); };
  const close = () => { reset(); onClose(); };
  const save = async () => {
    if (!catId || num <= 0) return;
    await db.budgets.add({ id: newId(), name: name.trim() || (cats.find((c) => c.id === catId)?.name ?? 'Ngân sách'), limitAmount: num, period, startDate: Date.now(), alertThreshold: 0.8, categoryId: catId });
    onToast('Đã tạo ngân sách'); reset(); onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Thêm ngân sách">
      <label className="text-[12px] text-mut -mb-2">Hạng mục</label>
      <CatPicker cats={cats} value={catId} onChange={(id, nm) => { setCatId(id); if (!name) setName(nm); }} />
      <MoneyInput value={limit} onChange={setLimit} placeholder="Hạn mức (VND)" className={inputCls} />
      <div className="text-right -mt-1 text-[12px] text-mut tnum">{money(num)} ₫</div>
      <label className="text-[12px] text-mut -mb-2">Chu kỳ</label>
      <PeriodPicker value={period} onChange={setPeriod} />
      <input className={inputCls} placeholder="Tên hiển thị (tùy chọn)" value={name} onChange={(e) => setName(e.target.value)} />
      <SaveBtn enabled={!!catId && num > 0} onClick={save} label="Lưu ngân sách" />
    </Sheet>
  );
}

function BudgetEdit({ budgetId, cats, onClose, onToast }: { budgetId: string | null; cats: Category[]; onClose: () => void; onToast: (m: string) => void }) {
  const b = useLiveQuery(() => (budgetId ? db.budgets.get(budgetId) : undefined), [budgetId]);
  const [name, setName] = useState('');
  const [catId, setCatId] = useState<string | undefined>();
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [loaded, setLoaded] = useState<string | null>(null);
  if (b && loaded !== b.id) { setLoaded(b.id); setName(b.name); setCatId(b.categoryId); setLimit(String(b.limitAmount)); setPeriod(b.period); }

  if (!budgetId || !b) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const num = parseFloat(limit.replace(/[^\d.]/g, '')) || 0;
  const save = async () => {
    await db.budgets.update(b.id, { name: name.trim() || b.name, categoryId: catId, limitAmount: num, period });
    onToast('Đã cập nhật ngân sách'); setLoaded(null); onClose();
  };
  const remove = async () => { await db.budgets.delete(b.id); onToast('Đã xóa ngân sách'); setLoaded(null); onClose(); };

  return (
    <Sheet open onClose={() => { setLoaded(null); onClose(); }} title="Sửa ngân sách">
      <label className="text-[12px] text-mut -mb-2">Hạng mục</label>
      <CatPicker cats={cats} value={catId} onChange={(id) => setCatId(id)} />
      <MoneyInput value={limit} onChange={setLimit} placeholder="Hạn mức (VND)" className={inputCls} />
      <div className="text-right -mt-1 text-[12px] text-mut tnum">{money(num)} ₫</div>
      <label className="text-[12px] text-mut -mb-2">Chu kỳ</label>
      <PeriodPicker value={period} onChange={setPeriod} />
      <input className={inputCls} placeholder="Tên hiển thị" value={name} onChange={(e) => setName(e.target.value)} />
      <SaveBtn enabled={!!catId && num > 0} onClick={save} label="Lưu thay đổi" />
      <button onClick={remove} className="w-full py-[13px] rounded-[14px] border-0 text-[14px] font-medium flex items-center justify-center gap-2"
        style={{ background: 'color-mix(in srgb, var(--neg) 12%, transparent)', color: 'var(--neg)' }}>
        <Trash2 size={16} /> Xóa ngân sách
      </button>
    </Sheet>
  );
}
