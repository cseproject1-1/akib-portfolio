import { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, Volume2, VolumeX, Battery, BatteryCharging } from 'lucide-react';
import { accountKey } from '@/lib/session-context';

interface SystemTrayPopupProps {
  type: 'volume' | 'wifi' | 'battery';
  onClose: () => void;
}

const SystemTrayPopup = ({ type, onClose }: SystemTrayPopupProps) => {
  const [volume, setVolume] = useState(() => parseInt(localStorage.getItem(accountKey('volume')) || '70'));
  const [wifiOn, setWifiOn] = useState(() => localStorage.getItem(accountKey('wifi')) !== 'false');
  const [batteryLevel, setBatteryLevel] = useState(() => parseInt(localStorage.getItem(accountKey('battery')) || '85'));
  const [charging, setCharging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Battery drain/charge simulation
  useEffect(() => {
    if (type !== 'battery') return;
    const interval = setInterval(() => {
      setBatteryLevel(prev => {
        const next = charging ? Math.min(100, prev + 1) : Math.max(5, prev - 1);
        localStorage.setItem(accountKey('battery'), String(next));
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [type, charging]);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    localStorage.setItem(accountKey('volume'), String(v));
  };

  const handleWifiToggle = () => {
    const next = !wifiOn;
    setWifiOn(next);
    localStorage.setItem(accountKey('wifi'), String(next));
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 w-56 rounded-xl overflow-hidden shadow-2xl z-[9200] animate-slide-up"
      style={{
        background: 'hsl(220, 20%, 12%)',
        border: '1px solid hsl(220, 15%, 22%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {type === 'volume' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {volume === 0 ? <VolumeX size={16} className="text-os-panel-foreground" /> : <Volume2 size={16} className="text-os-panel-foreground" />}
            <span className="text-xs text-os-panel-foreground font-medium">Volume</span>
            <span className="text-xs text-os-panel-foreground opacity-50 ml-auto">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={e => handleVolumeChange(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, hsl(217, 91%, 60%) ${volume}%, hsl(220, 15%, 25%) ${volume}%)` }}
          />
        </div>
      )}

      {type === 'wifi' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {wifiOn ? <Wifi size={16} className="text-os-panel-foreground" /> : <WifiOff size={16} className="text-os-panel-foreground opacity-50" />}
              <span className="text-xs text-os-panel-foreground font-medium">Wi-Fi</span>
            </div>
            <button
              onClick={handleWifiToggle}
              className={`w-9 h-5 rounded-full transition-colors relative ${wifiOn ? 'bg-os-accent' : 'bg-white/20'}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${wifiOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {wifiOn && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5">
                <span className="text-[11px] text-os-panel-foreground">AkibOS-Network</span>
                <span className="text-[9px] text-os-accent">Connected</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                <span className="text-[11px] text-os-panel-foreground opacity-50">Guest-WiFi</span>
                <Wifi size={10} className="opacity-30" />
              </div>
            </div>
          )}
        </div>
      )}

      {type === 'battery' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {charging ? <BatteryCharging size={16} className="text-green-400" /> : <Battery size={16} className="text-os-panel-foreground" />}
            <span className="text-xs text-os-panel-foreground font-medium">Battery</span>
            <span className="text-xs text-os-panel-foreground opacity-50 ml-auto">{batteryLevel}%</span>
          </div>
          {/* Battery bar */}
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${batteryLevel}%`,
                background: batteryLevel > 20 ? 'hsl(120, 60%, 50%)' : 'hsl(0, 80%, 55%)',
              }}
            />
          </div>
          <button
            onClick={() => setCharging(!charging)}
            className="text-[11px] text-os-panel-foreground opacity-60 hover:opacity-100 transition-opacity"
          >
            {charging ? '⚡ Charging...' : 'Plug in charger'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemTrayPopup;
