import { useState, useEffect, useRef } from 'react';
import { User, UserCircle, Lock, Hash, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (account: 'akib' | 'guest') => void;
}

const OS_PASSWORD = 'akib-ctx';
const OS_PIN = '8105';

type AuthMode = 'password' | 'pin';

const LockScreen = ({ onUnlock }: LockScreenProps) => {
  const [time, setTime] = useState(new Date());
  const [fadeOut, setFadeOut] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showInput && authMode === 'password') {
      inputRef.current?.focus();
    }
    if (showInput && authMode === 'pin') {
      pinRefs.current[0]?.focus();
    }
  }, [showInput, authMode]);

  const handleUnlock = (account: 'akib' | 'guest' = 'akib') => {
    setFadeOut(true);
    setTimeout(() => onUnlock(account), 500);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === OS_PASSWORD) {
      handleUnlock('akib');
    } else {
      setError('Incorrect password');
      setPassword('');
      triggerShake();
    }
  };

  const handlePinInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = pin.substring(0, index) + value + pin.substring(index + 1);
    setPin(newPin.substring(0, 4));
    setError('');

    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (newPin.length === 4 && index === 3) {
      if (newPin === OS_PIN) {
        handleUnlock('akib');
      } else {
        setError('Incorrect PIN');
        setPin('');
        triggerShake();
        setTimeout(() => pinRefs.current[0]?.focus(), 100);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const username = localStorage.getItem('akibos-username') || 'Akib';

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-[9999] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{
        backgroundImage: 'url(/wallpapers/mountain-sunset.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={() => { if (!showInput) setShowInput(true); }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* Time */}
      <div className="relative z-10 animate-boot-in flex flex-col items-center gap-2 mb-12">
        <h1 className="text-7xl font-light tracking-tight" style={{ color: 'hsl(210, 20%, 92%)' }}>
          {formatTime(time)}
        </h1>
        <p className="text-lg font-light tracking-wide" style={{ color: 'hsl(220, 15%, 55%)' }}>
          {formatDate(time)}
        </p>
      </div>

      {/* Avatar + name */}
      <div className="relative z-10 flex flex-col items-center gap-4 mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(217, 91%, 50%), hsl(260, 80%, 55%))' }}
        >
          <User size={36} color="white" />
        </div>
        <h2 className="text-xl font-medium" style={{ color: 'hsl(210, 20%, 90%)' }}>
          {username}
        </h2>
      </div>

      {/* Auth input area */}
      {showInput ? (
        <div className={`relative z-10 flex flex-col items-center gap-4 w-72 ${shake ? 'animate-shake' : ''}`}>
          {/* Mode toggle */}
          <div className="flex gap-2 mb-1">
            <button
              onClick={(e) => { e.stopPropagation(); setAuthMode('password'); setError(''); setPin(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                authMode === 'password'
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Lock size={12} /> Password
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setAuthMode('pin'); setError(''); setPassword(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                authMode === 'pin'
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Hash size={12} /> PIN
            </button>
          </div>

          {authMode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
              <div className="relative w-full">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: 'hsla(220, 20%, 15%, 0.8)',
                    border: error ? '1px solid hsla(0, 70%, 55%, 0.6)' : '1px solid hsla(217, 91%, 60%, 0.3)',
                    color: 'hsl(210, 20%, 92%)',
                    backdropFilter: 'blur(10px)',
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: 'hsla(217, 91%, 60%, 0.25)',
                  border: '1px solid hsla(217, 91%, 60%, 0.4)',
                  color: 'hsl(217, 91%, 75%)',
                }}
              >
                Unlock
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
              <div className="flex gap-3">
                {[0, 1, 2, 3].map(i => (
                  <input
                    key={i}
                    ref={el => { pinRefs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[i] || ''}
                    onChange={e => handlePinInput(i, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(i, e)}
                    className="w-12 h-14 text-center text-lg rounded-lg outline-none transition-all"
                    style={{
                      background: 'hsla(220, 20%, 15%, 0.8)',
                      border: error ? '1px solid hsla(0, 70%, 55%, 0.6)' : '1px solid hsla(217, 91%, 60%, 0.3)',
                      color: 'hsl(210, 20%, 92%)',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(0, 70%, 65%)' }}>
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          {/* Guest button inside auth area */}
          <button
            onClick={(e) => { e.stopPropagation(); handleUnlock('guest'); }}
            className="mt-2 text-xs transition-all hover:scale-105"
            style={{ color: 'hsl(220, 15%, 55%)' }}
          >
            Continue as Guest →
          </button>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setShowInput(true); }}
            className="px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'hsla(217, 91%, 60%, 0.2)',
              border: '1px solid hsla(217, 91%, 60%, 0.4)',
              color: 'hsl(217, 91%, 75%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            Click to Login
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleUnlock('guest'); }}
            className="text-xs transition-all hover:scale-105"
            style={{ color: 'hsl(220, 15%, 50%)' }}
          >
            Continue as Guest →
          </button>
        </div>
      )}

      {!showInput && (
        <p className="absolute bottom-8 text-xs animate-pulse z-10" style={{ color: 'hsl(220, 15%, 40%)' }}>
          Click anywhere to unlock
        </p>
      )}
    </div>
  );
};

export default LockScreen;
