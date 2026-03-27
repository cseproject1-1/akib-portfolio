import { useState, useEffect } from 'react';
import { icons } from 'lucide-react';
import { Wifi, Volume2, ChevronUp, Battery } from 'lucide-react';
import type { WindowState } from '@/hooks/useWindowManager';
import { osApps, OsApp } from '@/lib/os-apps';
import NotificationCenter, { type Notification } from './NotificationCenter';
import SystemTrayPopup from './SystemTrayPopup';

interface TaskbarProps {
  windows: WindowState[];
  onWindowFocus: (id: string) => void;
  onStartMenuToggle: () => void;
  startMenuOpen: boolean;
  notifications: Notification[];
  onRemoveNotification: (id: string) => void;
  onLaunchApp: (app: OsApp) => void;
  hidden: boolean;
  onReveal: (visible: boolean) => void;
}

const dockAppIds = ['ctxnote', 'routine-tracker', 'hisabkhata', 'browser', 'file-manager', 'terminal'];

const Taskbar = ({ windows, onWindowFocus, onStartMenuToggle, startMenuOpen, notifications, onRemoveNotification, onLaunchApp, hidden, onReveal }: TaskbarProps) => {
  const [time, setTime] = useState(new Date());
  const [hoveredDockIndex, setHoveredDockIndex] = useState<number | null>(null);
  const [trayPopup, setTrayPopup] = useState<'volume' | 'wifi' | 'battery' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const dockApps = dockAppIds.map(id => osApps.find(a => a.id === id)!).filter(Boolean);

  const getScale = (index: number) => {
    if (hoveredDockIndex === null) return 1;
    const dist = Math.abs(index - hoveredDockIndex);
    if (dist === 0) return 1.3;
    if (dist === 1) return 1.12;
    return 1;
  };

  const hasOpenWindow = (appId: string) => windows.some(w => w.appId === appId && !w.minimized);

  const toggleTray = (type: 'volume' | 'wifi' | 'battery') => {
    setTrayPopup(prev => prev === type ? null : type);
  };

  return (
    <>
      {hidden && (
        <div
          className="fixed bottom-0 left-0 right-0 h-2 z-[9100]"
          onMouseEnter={() => onReveal(true)}
        />
      )}
      <div
        className="h-14 flex items-center px-2 gap-1 bg-os-panel/90 backdrop-blur-xl border-t border-os-panel-border shrink-0 select-none transition-transform duration-300 ease-in-out"
        style={{
          zIndex: 9000,
          transform: hidden ? 'translateY(100%)' : 'translateY(0)',
        }}
        onMouseLeave={() => { if (hidden) onReveal(false); }}
      >
        {/* Start button */}
        <button
          onClick={(e) => { e.stopPropagation(); onStartMenuToggle(); }}
          className={`h-9 px-3 rounded flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${startMenuOpen ? 'bg-os-accent text-white' : 'text-os-panel-foreground hover:bg-white/10'}`}
        >
          <svg width="16" height="16" viewBox="0 0 80 80" fill="none">
            <rect x="10" y="10" width="60" height="60" rx="14" stroke="currentColor" strokeWidth="4" fill="none" />
            <text x="40" y="48" textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="700" fontFamily="Inter">A</text>
          </svg>
          Start
        </button>

        {/* Window tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto mx-1 shrink-0">
          {windows.map(win => {
            const app = osApps.find(a => a.id === win.appId);
            const IconComp = app ? (icons as any)[app.icon] : null;
            return (
              <button
                key={win.id}
                onClick={() => onWindowFocus(win.id)}
                className={`h-8 px-2 rounded flex items-center gap-1 text-[10px] transition-colors shrink-0 ${win.minimized ? 'text-os-panel-foreground/50 hover:bg-white/5' : 'bg-white/10 text-os-panel-foreground hover:bg-white/15'}`}
              >
                {IconComp && <IconComp size={12} />}
                <span className="max-w-[80px] truncate">{win.title}</span>
              </button>
            );
          })}
        </div>

        {/* Dock icons */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="flex items-end gap-1 px-2 py-1 rounded-xl"
            style={{
              background: 'hsla(220, 20%, 18%, 0.6)',
              border: '1px solid hsla(220, 15%, 25%, 0.4)',
            }}
            onMouseLeave={() => setHoveredDockIndex(null)}
          >
            {dockApps.map((app, i) => {
              const IconComp = (icons as any)[app.icon];
              const scale = getScale(i);
              const isOpen = hasOpenWindow(app.id);
              return (
                <button
                  key={app.id}
                  className="flex flex-col items-center transition-transform duration-150 ease-out origin-bottom relative"
                  style={{ transform: `scale(${scale})` }}
                  onMouseEnter={() => setHoveredDockIndex(i)}
                  onClick={() => onLaunchApp(app)}
                  title={app.name}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md"
                    style={{ background: app.iconBg }}
                  >
                    {app.iconImage ? (
                      <img src={app.iconImage} alt={app.name} className="w-5 h-5 rounded object-cover" />
                    ) : IconComp ? (
                      <IconComp size={18} color={app.iconColor} />
                    ) : null}
                  </div>
                  {isOpen && (
                    <div className="w-1 h-1 rounded-full bg-os-accent mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* System tray */}
        <div className="flex items-center gap-2 text-os-panel-foreground shrink-0 relative">
          <ChevronUp size={13} className="opacity-50" />
          <NotificationCenter notifications={notifications} onRemove={onRemoveNotification} />
          <button onClick={() => toggleTray('wifi')} className="opacity-70 hover:opacity-100 transition-opacity">
            <Wifi size={14} />
          </button>
          <button onClick={() => toggleTray('volume')} className="opacity-70 hover:opacity-100 transition-opacity">
            <Volume2 size={14} />
          </button>
          <button onClick={() => toggleTray('battery')} className="opacity-70 hover:opacity-100 transition-opacity">
            <Battery size={14} />
          </button>
          <div className="text-right pl-2">
            <div className="text-[11px] font-medium">{formatTime(time)}</div>
            <div className="text-[9px] opacity-50">{formatDate(time)}</div>
          </div>
          {trayPopup && (
            <SystemTrayPopup type={trayPopup} onClose={() => setTrayPopup(null)} />
          )}
        </div>
      </div>
    </>
  );
};

export default Taskbar;
