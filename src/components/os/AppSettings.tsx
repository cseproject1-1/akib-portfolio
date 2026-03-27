import { useState } from 'react';
import { Monitor, Palette, Info, User, HardDrive, Keyboard } from 'lucide-react';
import { vfs } from '@/lib/virtual-fs';
import { saveOsData } from '@/lib/os-persistence';
import { accountKey, getCurrentAccount } from '@/lib/session-context';

export interface Wallpaper {
  name: string;
  type: 'gradient' | 'image';
  from?: string;
  to?: string;
  image?: string;
}

const wallpapers: Wallpaper[] = [
  { name: 'Mountain Sunset', type: 'image', image: '/wallpapers/mountain-sunset.jpg' },
  { name: 'Plasma Flow', type: 'image', image: '/wallpapers/plasma-flow.jpg' },
  { name: 'Nebula', type: 'image', image: '/wallpapers/plasma-nebula.jpg' },
  { name: 'Ember', type: 'image', image: '/wallpapers/plasma-ember.jpg' },
  { name: 'Aurora', type: 'image', image: '/wallpapers/plasma-aurora.jpg' },
  { name: 'Deep Ocean', type: 'image', image: '/wallpapers/plasma-ocean.jpg' },
  { name: 'Deep Space', type: 'gradient', from: '220, 60%, 8%', to: '240, 50%, 15%' },
  { name: 'Sunset', type: 'gradient', from: '350, 50%, 12%', to: '20, 60%, 20%' },
  { name: 'Forest', type: 'gradient', from: '140, 40%, 8%', to: '160, 50%, 18%' },
  { name: 'Midnight', type: 'gradient', from: '260, 50%, 6%', to: '280, 40%, 14%' },
];

interface AppSettingsProps {
  wallpaperIndex: number;
  onWallpaperChange: (index: number) => void;
}

const AppSettings = ({ wallpaperIndex, onWallpaperChange }: AppSettingsProps) => {
  const [tab, setTab] = useState<'display' | 'user' | 'storage' | 'shortcuts' | 'about'>('display');
  const [username, setUsername] = useState(() => {
    const name = getCurrentAccount() === 'guest' ? 'Guest' : (localStorage.getItem(accountKey('username')) || 'Akib');
    // Sync global key for lock screen
    localStorage.setItem('akibos-username', name);
    return name;
  });
  const [accentHue, setAccentHue] = useState(() => parseInt(localStorage.getItem(accountKey('accent-hue')) || '217'));

  const handleUsernameChange = (name: string) => {
    setUsername(name);
    localStorage.setItem(accountKey('username'), name);
    // Also update global key so lock screen shows correct name
    localStorage.setItem('akibos-username', name);
    saveOsData('settings', { username: name, accentHue, wallpaperIndex });
  };

  const handleAccentChange = (hue: number) => {
    setAccentHue(hue);
    localStorage.setItem(accountKey('accent-hue'), String(hue));
    document.documentElement.style.setProperty('--os-accent-hue', String(hue));
    saveOsData('settings', { username, accentHue: hue, wallpaperIndex });
  };

  const handleWallpaperChange = (index: number) => {
    onWallpaperChange(index);
    saveOsData('settings', { username, accentHue, wallpaperIndex: index });
  };

  const stats = vfs.getStats();

  const shortcuts = [
    { keys: 'Alt + F4', action: 'Close active window' },
    { keys: 'Alt + Tab', action: 'Switch windows' },
    { keys: 'Ctrl + S', action: 'Save file (Text Editor)' },
    { keys: 'Tab', action: 'Autocomplete (Terminal)' },
    { keys: 'Escape', action: 'Close menu / dialog' },
    { keys: 'Super / Meta', action: 'Toggle Start Menu' },
    { keys: 'F11', action: 'Toggle fullscreen' },
  ];

  const tabs = [
    { id: 'display' as const, icon: Monitor, label: 'Display' },
    { id: 'user' as const, icon: User, label: 'User' },
    { id: 'storage' as const, icon: HardDrive, label: 'Storage' },
    { id: 'shortcuts' as const, icon: Keyboard, label: 'Shortcuts' },
    { id: 'about' as const, icon: Info, label: 'About' },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-44 border-r border-os-panel-border p-2 space-y-0.5 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${tab === t.id ? 'bg-os-accent text-white' : 'text-os-window-body-foreground hover:bg-white/5'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {tab === 'display' && (
          <div>
            <h3 className="text-sm font-semibold text-os-window-body-foreground mb-3 flex items-center gap-2">
              <Palette size={16} /> Wallpaper
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {wallpapers.map((wp, i) => (
                <button
                  key={i}
                  onClick={() => handleWallpaperChange(i)}
                  className={`h-16 rounded-lg border-2 transition-all overflow-hidden ${i === wallpaperIndex ? 'border-os-accent shadow-lg' : 'border-transparent hover:border-white/20'}`}
                  style={wp.type === 'image'
                    ? { backgroundImage: `url(${wp.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: `linear-gradient(135deg, hsl(${wp.from}), hsl(${wp.to}))` }
                  }
                >
                  <span className="text-[9px] text-white/70 drop-shadow-md">{wp.name}</span>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-os-window-body-foreground mb-3">Accent Color</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="360"
                value={accentHue}
                onChange={e => handleAccentChange(parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))` }}
              />
              <div className="w-8 h-8 rounded-lg" style={{ background: `hsl(${accentHue}, 91%, 60%)` }} />
            </div>
          </div>
        )}

        {tab === 'user' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-os-window-body-foreground">User Profile</h3>
            <div>
              <label className="text-xs text-os-window-body-foreground opacity-60 mb-1 block">Display Name</label>
              <input
                className="w-full px-3 py-2 rounded text-xs bg-black/30 text-os-window-body-foreground outline-none border border-os-panel-border"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
              />
              <p className="text-[10px] mt-1 opacity-40 text-os-window-body-foreground">Shown on lock screen, terminal prompt, and system info</p>
            </div>
          </div>
        )}

        {tab === 'storage' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-os-window-body-foreground">Storage</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-os-window-body-foreground">{stats.files}</div>
                <div className="text-[10px] opacity-50 text-os-window-body-foreground">Files</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-os-window-body-foreground">{stats.dirs}</div>
                <div className="text-[10px] opacity-50 text-os-window-body-foreground">Folders</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-os-window-body-foreground">{(stats.totalSize / 1024).toFixed(1)}</div>
                <div className="text-[10px] opacity-50 text-os-window-body-foreground">KB Used</div>
              </div>
            </div>
            <p className="text-[10px] text-os-window-body-foreground/50">Data is synced to the cloud automatically.</p>
            <button
              onClick={() => { vfs.reset(); }}
              className="px-3 py-2 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Reset Filesystem
            </button>
          </div>
        )}

        {tab === 'shortcuts' && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-os-window-body-foreground mb-3">Keyboard Shortcuts</h3>
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5">
                <span className="text-xs text-os-window-body-foreground opacity-70">{s.action}</span>
                <kbd className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-os-window-body-foreground font-mono">{s.keys}</kbd>
              </div>
            ))}
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-3 text-os-window-body-foreground">
            <div className="flex items-center gap-3">
              <svg width="48" height="48" viewBox="0 0 80 80" fill="none">
                <defs>
                  <linearGradient id="aboutGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop stopColor="hsl(217, 91%, 60%)" />
                    <stop offset="1" stopColor="hsl(260, 80%, 65%)" />
                  </linearGradient>
                </defs>
                <rect x="10" y="10" width="60" height="60" rx="14" stroke="url(#aboutGrad)" strokeWidth="2" fill="none" />
                <text x="40" y="48" textAnchor="middle" fill="url(#aboutGrad)" fontSize="24" fontWeight="700" fontFamily="Inter, sans-serif">A</text>
              </svg>
              <div>
                <h2 className="text-base font-bold">AkibOS</h2>
                <p className="text-xs opacity-60">Version 1.0.0</p>
              </div>
            </div>
            <div className="text-xs space-y-1 opacity-70">
              <p>Desktop Environment: Plasma Web</p>
              <p>Kernel: Browser Engine</p>
              <p>Architecture: WebAssembly-compatible</p>
              <p>User: {username}</p>
              <p>Cloud: Connected ☁️</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { wallpapers };
export default AppSettings;
