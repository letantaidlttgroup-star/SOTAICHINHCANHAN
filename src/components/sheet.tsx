import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconBtn } from './ui';

export function Backdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-40 transition-opacity duration-200"
      style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
  );
}

export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
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

export function SaveBtn({ enabled, onClick, label }: { enabled: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={!enabled} className="mt-1 w-full py-[15px] rounded-[15px] border-0 text-[15.5px] font-semibold"
      style={{ cursor: enabled ? 'pointer' : 'default', background: enabled ? 'var(--grad-gold)' : 'var(--surface2)', color: enabled ? '#20160C' : 'var(--faint)' }}>
      {label}
    </button>
  );
}

export const inputCls = 'w-full bg-surface2 border border-line rounded-[12px] px-3 py-[11px] text-[14px] text-ink outline-none';
export const SWATCHES = ['#8A8F98', '#6E8FB0', '#4FB286', '#C98A5A', '#C9A96A', '#A98FC9', '#C98AA8', '#E0705E'];
