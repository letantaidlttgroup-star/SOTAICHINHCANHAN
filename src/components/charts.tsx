import { money } from '../lib/format';

export function LineChart({ values, height = 130 }: { values: number[]; height?: number }) {
  if (values.length < 2) {
    return <div className="text-[13px] text-mut py-6 text-center">Chưa đủ dữ liệu để vẽ.</div>;
  }
  const w = 320, h = height, pad = 8;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="block" preserveAspectRatio="none">
      <polygon points={area} style={{ fill: 'var(--gold)', opacity: 0.09 }} />
      <polyline points={pts.join(' ')} fill="none" style={{ stroke: 'var(--gold)' }}
        strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52, C = 2 * Math.PI * r, cx = 64, cy = 64;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={128} height={128} viewBox="0 0 128 128" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" style={{ stroke: 'var(--surface2)' }} strokeWidth={15} />
        {slices.map((s) => {
          const len = (s.value / total) * C;
          const el = (
            <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={15}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
              transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
          );
          off += len;
          return el;
        })}
      </svg>
      <div className="flex flex-col gap-2 min-w-0">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: s.color }} />
            <span className="text-[12.5px] text-mut truncate">{s.label}</span>
            <span className="text-[12.5px] font-semibold tnum ml-auto">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupedBars({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const H = 120;
  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: H }}>
        {data.map((d) => (
          <div key={d.label} className="flex flex-col items-center justify-end gap-1 flex-1">
            <div className="flex items-end gap-[3px]" style={{ height: H }}>
              <div style={{ width: 10, height: Math.max(2, (d.income / max) * H), background: 'var(--pos)', borderRadius: 3 }} />
              <div style={{ width: 10, height: Math.max(2, (d.expense / max) * H), background: 'var(--neg)', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 mt-2">
        {data.map((d) => <span key={d.label} className="flex-1 text-center text-[10.5px] text-mut">{d.label}</span>)}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        <Legend color="var(--pos)" label="Thu" />
        <Legend color="var(--neg)" label="Chi" />
      </div>
    </div>
  );
}

export function PLBars({ rows }: { rows: { label: string; value: number }[] }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const up = r.value >= 0;
        return (
          <div key={r.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[13px]">{r.label}</span>
              <span className="text-[12.5px] font-semibold tnum" style={{ color: up ? 'var(--pos)' : 'var(--neg)' }}>
                {up ? '+' : ''}{money(r.value)}
              </span>
            </div>
            <div className="h-[6px] bg-surface2 rounded-[4px] overflow-hidden">
              <div className="h-full rounded-[4px]"
                style={{ width: `${(Math.abs(r.value) / maxAbs) * 100}%`, background: up ? 'var(--pos)' : 'var(--neg)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      <span className="w-2 h-2 rounded-[2px]" style={{ background: color }} />
      <span className="text-[12px] text-mut">{label}</span>
    </div>
  );
}
