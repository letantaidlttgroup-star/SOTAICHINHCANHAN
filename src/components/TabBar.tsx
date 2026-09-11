import { Home, Gem, Receipt, TrendingUp, Plus } from 'lucide-react';

const ITEMS = [
  { i: 0, label: 'Tổng quan', Icon: Home },
  { i: 1, label: 'Tài sản', Icon: Gem },
  { i: 3, label: 'Sổ', Icon: Receipt },
  { i: 4, label: 'Báo cáo', Icon: TrendingUp },
];

export function TabBar({ tab, setTab, onAdd }: {
  tab: number; setTab: (i: number) => void; onAdd: () => void;
}) {
  const Tab = ({ i, label, Icon }: { i: number; label: string; Icon: typeof Home }) => {
    const on = tab === i;
    return (
      <button onClick={() => setTab(i)}
        className="bg-transparent border-0 cursor-pointer flex flex-col items-center gap-[4px] w-16"
        style={{ color: on ? 'var(--ink)' : 'var(--faint)' }}>
        <Icon size={23} strokeWidth={on ? 2.2 : 1.8} />
        <span className="text-[11px] leading-none" style={{ fontWeight: on ? 600 : 400 }}>{label}</span>
      </button>
    );
  };
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line flex items-center justify-around"
      style={{ paddingTop: 12, paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}>
      {ITEMS.slice(0, 2).map((it) => <Tab key={it.i} {...it} />)}
      <button onClick={onAdd}
        className="w-[56px] h-[56px] rounded-full border-0 grid place-items-center cursor-pointer -mt-[22px]"
        style={{ background: 'var(--grad-gold)', color: '#20160C',
          boxShadow: '0 10px 22px color-mix(in srgb, var(--copper) 45%, transparent)' }}>
        <Plus size={27} strokeWidth={2.4} />
      </button>
      {ITEMS.slice(2).map((it) => <Tab key={it.i} {...it} />)}
    </div>
  );
}
