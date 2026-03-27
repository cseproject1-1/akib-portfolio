import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Info, CheckCircle } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success';
  time: Date;
}

let notifId = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((title: string, message: string, type: 'info' | 'success' = 'info') => {
    const id = `notif-${++notifId}`;
    setNotifications(prev => [{ id, title, message, type, time: new Date() }, ...prev]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, addNotification, removeNotification };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationCenter = ({ notifications, onRemove }: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const hasUnread = notifications.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
      >
        <Bell size={14} className="text-os-panel-foreground opacity-70" />
        {hasUnread && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-os-accent" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[8998]" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full right-0 mb-2 w-72 max-h-80 rounded-lg overflow-hidden animate-slide-up z-[8999]"
            style={{
              background: 'hsl(220, 20%, 14%)',
              border: '1px solid hsl(220, 15%, 22%)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: 'hsl(220, 15%, 22%)' }}>
              <span className="text-xs font-medium text-os-panel-foreground">Notifications</span>
            </div>
            <div className="overflow-y-auto max-h-64">
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-os-panel-foreground/50">
                  No notifications
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="px-3 py-2 flex gap-2 hover:bg-white/5 transition-colors">
                    {n.type === 'success' ? (
                      <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <Info size={14} className="text-os-panel-foreground/60 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-os-panel-foreground">{n.title}</p>
                      <p className="text-[10px] text-os-panel-foreground/60">{n.message}</p>
                    </div>
                    <button onClick={() => onRemove(n.id)} className="shrink-0 hover:bg-white/10 rounded p-0.5">
                      <X size={10} className="text-os-panel-foreground/40" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
