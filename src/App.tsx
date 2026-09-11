import { useEffect, useState } from 'react';
import { Sun, Moon, Menu, X, Users, Settings as SettingsIcon, PiggyBank, Wallet, PieChart, Coins } from 'lucide-react';
import { IconBtn } from './components/ui';
import { TabBar } from './components/TabBar';
import { QuickAdd } from './components/QuickAdd';
import { Dashboard } from './screens/Dashboard';
import { Assets } from './screens/Assets';
import { Transactions } from './screens/Transactions';
import { Reports } from './screens/Reports';
import { Debts } from './screens/Debts';
import { Settings } from './screens/Settings';
import { Sinking } from './screens/Sinking';
import { Wallets } from './screens/Wallets';
import { Budgets } from './screens/Budgets';
import { Reference } from './screens/Reference';
import { PinLock } from './components/PinLock';
import { isPinEnabled } from './lib/pin';


export default function App() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState('');
  const [route, setRoute] = useState<'home' | 'debts' | 'settings' | 'sinking' | 'wallets' | 'budgets' | 'reference'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [locked, setLocked] = useState(isPinEnabled());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  return (
    <div className="min-h-screen flex justify-center items-center" style={{ background: 'var(--backdrop)' }}>
      <div className="relative w-full bg-bg text-ink overflow-hidden"
        style={{ maxWidth: 402, height: '100dvh', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}>

        <div className="absolute inset-0 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(104px + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between px-5 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
            <div>
              <div className="text-[13px] text-mut">Chào buổi sáng</div>
              <div className="text-[17px] font-semibold -tracking-[0.2px]">Tài</div>
            </div>
            <div className="flex gap-[6px]">
              <IconBtn onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconBtn>
              <IconBtn onClick={() => setMenuOpen(true)}><Menu size={18} /></IconBtn>
            </div>
          </div>

          {tab === 0 ? <Dashboard onNav={(r) => setRoute(r)} />
            : tab === 1 ? <Assets onToast={showToast} />
            : tab === 3 ? <Transactions onToast={showToast} />
            : tab === 4 ? <Reports />
            : <Dashboard onNav={(r) => setRoute(r)} />}
        </div>

        {toast && (
          <div className="absolute left-5 right-5 z-30 text-center text-[13.5px] font-medium rounded-xl"
            style={{ bottom: 'calc(104px + env(safe-area-inset-bottom))', background: 'var(--ink)', color: 'var(--bg)', padding: '11px 16px' }}>
            {toast}
          </div>
        )}

        <TabBar tab={tab} setTab={setTab} onAdd={() => setSheet(true)} />
        <QuickAdd open={sheet} onClose={() => setSheet(false)} onSaved={showToast} />

        {/* Menu góc trên */}
        <div onClick={() => setMenuOpen(false)}
          className="absolute inset-0 z-40 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.5)', opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? 'auto' : 'none' }} />
        <div className="absolute left-0 right-0 bottom-0 z-50 bg-bg border-t border-line"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
            transform: menuOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform .3s cubic-bezier(.22,1,.36,1)' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-[16px] font-semibold">Menu</span>
            <IconBtn onClick={() => setMenuOpen(false)}><X size={18} /></IconBtn>
          </div>
          <button onClick={() => { setRoute('debts'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-5 py-[14px] text-left text-ink">
            <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center"
              style={{ background: 'color-mix(in srgb, #C98A5A 16%, transparent)' }}>
              <Users size={18} style={{ color: '#C98A5A' }} />
            </span>
            <span className="text-[14.5px] font-medium">Vay – Nợ</span>
          </button>
          <button onClick={() => { setRoute('sinking'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-5 py-[14px] text-left text-ink">
            <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center"
              style={{ background: 'color-mix(in srgb, #4FB286 16%, transparent)' }}>
              <PiggyBank size={18} style={{ color: '#4FB286' }} />
            </span>
            <span className="text-[14.5px] font-medium">Quỹ tích lũy</span>
          </button>
          <button onClick={() => { setRoute('wallets'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-5 py-[14px] text-left text-ink">
            <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center"
              style={{ background: 'color-mix(in srgb, #C9A96A 16%, transparent)' }}>
              <Wallet size={18} style={{ color: '#C9A96A' }} />
            </span>
            <span className="text-[14.5px] font-medium">Ví & tài khoản</span>
          </button>
          <button onClick={() => { setRoute('budgets'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-5 py-[14px] text-left text-ink">
            <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center"
              style={{ background: 'color-mix(in srgb, #A98FC9 16%, transparent)' }}>
              <PieChart size={18} style={{ color: '#A98FC9' }} />
            </span>
            <span className="text-[14.5px] font-medium">Ngân sách</span>
          </button>
          <button onClick={() => { setRoute('reference'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-5 py-[14px] text-left text-ink">
            <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center"
              style={{ background: 'color-mix(in srgb, #C9A96A 16%, transparent)' }}>
              <Coins size={18} style={{ color: '#C9A96A' }} />
            </span>
            <span className="text-[14.5px] font-medium">Giá tham chiếu (vàng/bạc)</span>
          </button>
          <button onClick={() => { setRoute('settings'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-5 py-[14px] text-left text-ink">
            <span className="w-[38px] h-[38px] rounded-[11px] grid place-items-center"
              style={{ background: 'color-mix(in srgb, #6E8FB0 16%, transparent)' }}>
              <SettingsIcon size={18} style={{ color: '#6E8FB0' }} />
            </span>
            <span className="text-[14.5px] font-medium">Cài đặt chung</span>
          </button>
        </div>

        {route === 'debts' && <Debts onBack={() => setRoute('home')} onToast={showToast} />}
        {route === 'settings' && <Settings onBack={() => setRoute('home')} onToast={showToast} dark={dark} setDark={setDark} />}
        {route === 'sinking' && <Sinking onBack={() => setRoute('home')} onToast={showToast} />}
        {route === 'wallets' && <Wallets onBack={() => setRoute('home')} onToast={showToast} />}
        {route === 'budgets' && <Budgets onBack={() => setRoute('home')} onToast={showToast} />}
        {route === 'reference' && <Reference onBack={() => setRoute('home')} onToast={showToast} />}

        {locked && <PinLock onUnlock={() => setLocked(false)} />}
      </div>
    </div>
  );
}
