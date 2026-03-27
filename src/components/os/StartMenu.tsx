import { useState, useEffect } from 'react';
import { icons, Search, Power, Lock, RotateCw, User, LogOut } from 'lucide-react';
import { osApps, OsApp } from '@/lib/os-apps';
import { accountKey, getCurrentAccount, setCurrentAccount, type AccountType } from '@/lib/session-context';
import { vfs } from '@/lib/virtual-fs';

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
  onLaunchApp: (app: OsApp) => void;
  onLockScreen?: () => void;
}

const pinnedAppIds = ['ctxnote', 'routine-tracker', 'hisabkhata', 'browser', 'file-manager', 'terminal'];

const StartMenu = ({ open, onClose, onLaunchApp, onLockScreen }: StartMenuProps) => {
  const [search, setSearch] = useState('');
  const currentUser = getCurrentAccount();
  const [recentAppIds, setRecentAppIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(accountKey('recent-apps')) || '[]'); } catch { return []; }
  });

  if (!open) return null;

  const filteredApps = search
    ? osApps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase()))
    : null;

  const pinnedApps = pinnedAppIds.map(id => osApps.find(a => a.id === id)!).filter(Boolean);
  const recentApps = recentAppIds.map(id => osApps.find(a => a.id === id)!).filter(Boolean).slice(0, 3);
  const allApps = osApps;

  const handleLaunch = (app: OsApp) => {
    const newRecent = [app.id, ...recentAppIds.filter(id => id !== app.id)].slice(0, 5);
    setRecentAppIds(newRecent);
    localStorage.setItem(accountKey('recent-apps'), JSON.stringify(newRecent));
    onLaunchApp(app);
    onClose();
  };

  const handleSwitchAccount = (account: AccountType) => {
    setCurrentAccount(account);
    sessionStorage.setItem('akibos-current-account', account);
    vfs.init();
    onClose();
  };

  const renderAppButton = (app: OsApp) => {
    const IconComp = (icons as any)[app.icon];
    return (
      <button
        key={app.id}
        onClick={() => handleLaunch(app)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors group"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
          style={{ background: app.iconImage ? 'transparent' : app.iconBg }}
        >
          {app.iconImage ? (
            <img src={app.iconImage} alt={app.name} className="w-full h-full object-contain" />
          ) : (
            IconComp && <IconComp size={18} color={app.iconColor} />
          )}
        </div>
        <div className="text-left">
          <div className="text-xs font-medium" style={{ color: 'hsl(210, 20%, 92%)' }}>{app.name}</div>
          {app.description && (
            <div className="text-[10px]" style={{ color: 'hsl(220, 15%, 50%)' }}>{app.description}</div>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[8998]" onClick={onClose} />
      <div
        className="absolute bottom-12 left-2 w-80 rounded-xl overflow-hidden shadow-2xl animate-slide-up z-[8999] border border-os-panel-border"
        style={{ background: 'hsl(220, 20%, 12%)', backdropFilter: 'blur(20px)' }}
      >
        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-os-panel-border">
            <Search size={13} className="opacity-40" style={{ color: 'hsl(210, 20%, 80%)' }} />
            <input
              autoFocus
              placeholder="Search apps..."
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: 'hsl(210, 20%, 92%)' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[380px] overflow-auto">
          {filteredApps ? (
            <div className="px-2 pb-2 space-y-0.5">
              {filteredApps.length === 0 && (
                <div className="text-xs text-center py-4 opacity-40" style={{ color: 'hsl(210, 20%, 80%)' }}>No results</div>
              )}
              {filteredApps.map(renderAppButton)}
            </div>
          ) : (
            <>
              {/* Pinned */}
              <div className="px-4 pt-1 pb-1">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider opacity-40" style={{ color: 'hsl(210, 20%, 80%)' }}>Pinned</h4>
              </div>
              <div className="px-2 pb-2 grid grid-cols-3 gap-1">
                {pinnedApps.map(app => {
                  const IconComp = (icons as any)[app.icon];
                  return (
                    <button
                      key={app.id}
                      onClick={() => handleLaunch(app)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/8 transition-colors group"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden"
                        style={{ background: app.iconImage ? 'transparent' : app.iconBg }}
                      >
                        {app.iconImage ? (
                          <img src={app.iconImage} alt={app.name} className="w-full h-full object-contain" />
                        ) : (
                          IconComp && <IconComp size={20} color={app.iconColor} />
                        )}
                      </div>
                      <span className="text-[10px] truncate w-full text-center" style={{ color: 'hsl(210, 20%, 85%)' }}>{app.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Recent */}
              {recentApps.length > 0 && (
                <>
                  <div className="px-4 pt-1 pb-1">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider opacity-40" style={{ color: 'hsl(210, 20%, 80%)' }}>Recent</h4>
                  </div>
                  <div className="px-2 pb-2 space-y-0.5">
                    {recentApps.map(renderAppButton)}
                  </div>
                </>
              )}

              {/* All apps */}
              <div className="px-4 pt-1 pb-1">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider opacity-40" style={{ color: 'hsl(210, 20%, 80%)' }}>All Apps</h4>
              </div>
              <div className="px-2 pb-2 space-y-0.5">
                {allApps.map(renderAppButton)}
              </div>
            </>
          )}
        </div>

        {/* User Section Footer */}
        <div className="border-t border-os-panel-border">
          <div className="flex items-center justify-between px-3 py-2">
            <button 
              onClick={() => handleSwitchAccount(currentUser === 'akib' ? 'guest' : 'akib')}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-os-accent to-purple-500 flex items-center justify-center">
                <User size={14} color="white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-xs font-medium" style={{ color: 'hsl(210, 20%, 92%)' }}>{currentUser}</div>
                <div className="text-[10px] hover:underline" style={{ color: 'hsl(217, 91%, 60%)' }}>
                  {currentUser === 'akib' ? 'Switch to Guest' : 'Switch to Akib'}
                </div>
              </div>
              <LogOut size={14} style={{ color: 'hsl(210, 20%, 60%)' }} />
            </button>
          </div>
          <div className="border-t border-os-panel-border px-3 py-2 flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'hsl(220, 15%, 40%)' }}>AkibOS v1.0</span>
            <div className="flex items-center gap-1">
              {onLockScreen && (
                <button onClick={() => { onLockScreen(); onClose(); }} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Lock Screen">
                  <Lock size={13} style={{ color: 'hsl(210, 20%, 70%)' }} />
                </button>
              )}
              <button onClick={() => window.location.reload()} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Refresh">
                <RotateCw size={13} style={{ color: 'hsl(210, 20%, 70%)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StartMenu;