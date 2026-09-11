import { useRef, useState } from 'react';
import { ArrowLeft, Shield, Download, Upload, Sun, Moon, ChevronRight, KeyRound, Trash2 } from 'lucide-react';
import { IconBtn } from '../components/ui';
import { PinPad } from '../components/PinLock';
import { isPinEnabled, setPin, disablePin } from '../lib/pin';
import { exportData, downloadBackup, importData, wipeAll } from '../lib/backup';

export function Settings({ onBack, onToast, dark, setDark }: {
  onBack: () => void; onToast: (m: string) => void; dark: boolean; setDark: (v: boolean) => void;
}) {
  const [pinOn, setPinOn] = useState(isPinEnabled());
  const [flow, setFlow] = useState<null | 'new' | 'confirm'>(null);
  const [firstPin, setFirstPin] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const startSet = () => { setFirstPin(''); setFlow('new'); };
  const onPin = async (pin: string) => {
    if (flow === 'new') { setFirstPin(pin); setFlow('confirm'); }
    else if (flow === 'confirm') {
      if (pin === firstPin) { await setPin(pin); setPinOn(true); setFlow(null); onToast('Đã đặt mã PIN'); }
      else { onToast('PIN không khớp, nhập lại'); setFlow('new'); setFirstPin(''); }
    }
  };
  const togglePin = () => {
    if (pinOn) { disablePin(); setPinOn(false); onToast('Đã tắt mã PIN'); }
    else startSet();
  };

  const doExport = async () => { downloadBackup(await exportData()); onToast('Đã tạo file sao lưu'); };
  const doWipe = async () => {
    if (!confirm('Xóa TOÀN BỘ dữ liệu (ví, giao dịch, tài sản, vay–nợ...)? Không thể hoàn tác. Nên sao lưu trước.')) return;
    await wipeAll();
    onToast('Đã xóa dữ liệu — đang tải lại...');
    setTimeout(() => location.reload(), 700);
  };
  const doImport = async (file: File) => {
    try { await importData(await file.text()); onToast('Đã khôi phục — đang tải lại...'); setTimeout(() => location.reload(), 700); }
    catch { onToast('File không hợp lệ'); }
  };

  return (
    <div className="absolute inset-0 z-30 bg-bg overflow-y-auto no-scrollbar"
      style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <IconBtn onClick={onBack}><ArrowLeft size={18} /></IconBtn>
        <span className="text-[17px] font-semibold">Cài đặt chung</span>
      </div>

      {/* Bảo mật */}
      <Group title="Bảo mật">
        <Row icon={<Shield size={18} style={{ color: '#6E8FB0' }} />} label="Khóa bằng mã PIN"
          onClick={togglePin} right={<Toggle on={pinOn} />} />
        {pinOn && (
          <Row icon={<KeyRound size={18} style={{ color: 'var(--gold)' }} />} label="Đổi mã PIN"
            onClick={startSet} right={<ChevronRight size={16} style={{ color: 'var(--faint)' }} />} />
        )}
      </Group>

      {/* Dữ liệu */}
      <Group title="Dữ liệu & hệ thống">
        <Row icon={<Download size={18} style={{ color: '#4FB286' }} />} label="Sao lưu (xuất file JSON)"
          onClick={doExport} right={<ChevronRight size={16} style={{ color: 'var(--faint)' }} />} />
        <Row icon={<Upload size={18} style={{ color: '#C98A5A' }} />} label="Khôi phục (nhập file)"
          onClick={() => fileRef.current?.click()} right={<ChevronRight size={16} style={{ color: 'var(--faint)' }} />} />
        <input ref={fileRef} type="file" accept="application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        <Row icon={<Trash2 size={18} style={{ color: 'var(--neg)' }} />} label="Xóa toàn bộ dữ liệu"
          onClick={doWipe} right={<ChevronRight size={16} style={{ color: 'var(--faint)' }} />} />
      </Group>

      {/* Giao diện */}
      <Group title="Giao diện">
        <Row icon={dark ? <Moon size={18} style={{ color: '#A98FC9' }} /> : <Sun size={18} style={{ color: '#C9A96A' }} />}
          label="Chế độ tối" onClick={() => setDark(!dark)} right={<Toggle on={dark} />} />
      </Group>

      <div className="px-6 pt-2 text-[11.5px] text-faint leading-relaxed">
        Mã PIN là khóa tiện lợi ngay trên thiết bị, không mã hóa dữ liệu bên dưới. Hãy giữ file sao lưu ở nơi an toàn.
      </div>

      {/* Luồng đặt/đổi PIN */}
      {flow && (
        <div className="absolute inset-0 z-50 bg-bg flex flex-col items-center justify-center px-6">
          <div className="text-[16px] font-semibold mb-1">{flow === 'new' ? 'Đặt mã PIN mới' : 'Nhập lại để xác nhận'}</div>
          <div className="text-[13px] text-mut mb-8">4 chữ số</div>
          <PinPad onComplete={onPin} />
          <button onClick={() => { setFlow(null); setFirstPin(''); }}
            className="mt-8 text-[13.5px]" style={{ color: 'var(--mut)' }}>Hủy</button>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-[14px] my-[10px]">
      <div className="text-[12px] text-mut px-2 pb-2">{title}</div>
      <div className="bg-surface border border-line rounded-[16px] overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
        {children}
      </div>
    </div>
  );
}
function Row({ icon, label, right, onClick }: {
  icon: React.ReactNode; label: string; right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-[13px] border-b border-line last:border-0 text-left">
      <span className="w-[34px] h-[34px] rounded-[10px] grid place-items-center bg-surface2 shrink-0">{icon}</span>
      <span className="flex-1 text-[14px]">{label}</span>
      {right}
    </button>
  );
}
function Toggle({ on }: { on: boolean }) {
  return (
    <span className="w-[44px] h-[26px] rounded-full relative transition-colors block shrink-0"
      style={{ background: on ? 'var(--gold)' : 'var(--surface2)', border: `1px solid var(--line)` }}>
      <span className="absolute top-[2px] w-[20px] h-[20px] rounded-full transition-all"
        style={{ left: on ? 20 : 2, background: on ? '#20160C' : 'var(--faint)' }} />
    </span>
  );
}
