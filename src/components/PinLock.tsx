import { useEffect, useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { verifyPin } from '../lib/pin';

const LEN = 4;

export function PinPad({ onComplete }: { onComplete: (pin: string) => void }) {
  const [v, setV] = useState('');
  useEffect(() => {
    if (v.length === LEN) { const pin = v; setV(''); onComplete(pin); }
  }, [v]);
  const press = (k: string) => {
    if (k === 'del') return setV((x) => x.slice(0, -1));
    setV((x) => (x + k).slice(0, LEN));
  };
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-4 mb-8">
        {Array.from({ length: LEN }).map((_, i) => (
          <span key={i} className="w-[14px] h-[14px] rounded-full"
            style={{ background: i < v.length ? 'var(--gold)' : 'transparent',
              border: `2px solid ${i < v.length ? 'var(--gold)' : 'var(--faint)'}` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button key={i} onClick={() => press(k)}
              className="w-[68px] h-[68px] rounded-full grid place-items-center text-[24px] font-medium tnum"
              style={{ background: 'var(--surface2)', color: 'var(--ink)', border: `1px solid var(--line)` }}>
              {k === 'del' ? <Delete size={22} /> : k}
            </button>
          ))}
      </div>
    </div>
  );
}

export function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [err, setErr] = useState(false);
  const check = async (pin: string) => {
    if (await verifyPin(pin)) onUnlock();
    else { setErr(true); setTimeout(() => setErr(false), 700); }
  };
  return (
    <div className="absolute inset-0 z-[60] bg-bg flex flex-col items-center justify-center px-6">
      <span className="w-[56px] h-[56px] rounded-full grid place-items-center mb-5"
        style={{ background: 'color-mix(in srgb, var(--gold) 16%, transparent)' }}>
        <Lock size={24} style={{ color: 'var(--gold)' }} />
      </span>
      <div className="text-[16px] font-semibold mb-1">Nhập mã PIN</div>
      <div className="text-[13px] mb-8" style={{ color: err ? 'var(--neg)' : 'var(--mut)' }}>
        {err ? 'Mã PIN không đúng' : 'Mở khóa để tiếp tục'}
      </div>
      <PinPad onComplete={check} />
    </div>
  );
}
