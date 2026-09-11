import type { ReactNode } from 'react';

export function IconBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="w-[38px] h-[38px] rounded-[11px] border border-line bg-surface text-ink grid place-items-center">
      {children}
    </button>
  );
}

export function Section({ title, action, extra, onAction, children }: {
  title: string; action?: string; extra?: ReactNode; onAction?: () => void; children: ReactNode;
}) {
  return (
    <div className="mx-[14px] my-[10px] bg-surface border border-line rounded-[18px] p-4"
      style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="flex items-center justify-between mb-[14px]">
        <span className="flex items-center gap-[8px] text-sm font-semibold -tracking-[0.2px]">
          <span className="grad-gold-bg" style={{ width: 5, height: 14, borderRadius: 3 }} />
          {title}
        </span>
        {extra ?? (action && (
          <button onClick={onAction} className="text-[12.5px] bg-transparent border-0 cursor-pointer" style={{ color: 'var(--mut)' }}>{action}</button>
        ))}
      </div>
      {children}
    </div>
  );
}

export function Delta({ value, up }: { value: string; up: boolean }) {
  return (
    <span className="text-[12.5px] font-semibold rounded-lg px-2 py-[3px]"
      style={{ color: up ? 'var(--pos)' : 'var(--neg)',
        background: up ? 'color-mix(in srgb, var(--pos) 15%, transparent)'
                       : 'color-mix(in srgb, var(--neg) 15%, transparent)' }}>
      {value}
    </span>
  );
}

export function Spark({ data }: { data: number[] }) {
  const w = 340, h = 44;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="mt-[10px] block">
      <defs>
        <linearGradient id="sparkG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--copper)" /><stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="url(#sparkG)" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
