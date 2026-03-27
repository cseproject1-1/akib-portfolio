import { useState, useCallback, useEffect } from 'react';
import BootScreen from '@/components/os/BootScreen';
import LockScreen from '@/components/os/LockScreen';
import Desktop from '@/components/os/Desktop';
import { loadOrFallback } from '@/lib/os-persistence';
import { setCurrentAccount, accountKey, registerAccountSwitchHook, type AccountType } from '@/lib/session-context';
import { reinitVFS } from '@/lib/virtual-fs';
import { fullCookieCleanup } from '@/lib/cookie-jar';

// Register cleanup hook: clear browser cookies when switching accounts
registerAccountSwitchHook(() => {
  fullCookieCleanup();
});

const Index = () => {
  const [phase, setPhase] = useState<'boot' | 'lock' | 'desktop'>('boot');

  const handleBootComplete = useCallback(() => {
    setPhase('lock');
  }, []);

  const handleUnlock = useCallback((account: AccountType) => {
    setCurrentAccount(account);
    reinitVFS(); // Re-initialize VFS for the current account
    setPhase('desktop');
    try {
      document.documentElement.requestFullscreen?.();
    } catch {}
  }, []);

  // F11 fullscreen toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen?.();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load persisted settings on boot
  useEffect(() => {
    (async () => {
      const settings = await loadOrFallback('settings', null);
      if (settings) {
        if (settings.accentHue !== undefined) {
          localStorage.setItem(accountKey('accent-hue'), String(settings.accentHue));
          document.documentElement.style.setProperty('--os-accent-hue', String(settings.accentHue));
        }
      }
    })();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: '#000' }}>
      {phase === 'boot' && <BootScreen onBootComplete={handleBootComplete} />}
      {phase === 'lock' && <LockScreen onUnlock={handleUnlock} />}
      {phase === 'desktop' && <Desktop />}
    </div>
  );
};

export default Index;
