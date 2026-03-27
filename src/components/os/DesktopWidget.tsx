import { useState, useEffect } from 'react';
import { accountKey, getCurrentAccount } from '@/lib/session-context';

const DesktopWidget = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const username = getCurrentAccount() === 'guest'
    ? 'Guest'
    : (localStorage.getItem(accountKey('username')) || 'Akib');

  return (
    <div
      className="absolute top-6 right-6 z-10 px-5 py-4 rounded-2xl select-none"
      style={{
        background: 'hsla(220, 20%, 12%, 0.5)',
        border: '1px solid hsla(220, 15%, 25%, 0.3)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="text-[11px] font-medium tracking-wide mb-1" style={{ color: 'hsla(217, 91%, 70%, 0.8)' }}>
        {greeting}, {username}
      </p>
      <h2 className="text-3xl font-light tracking-tight" style={{ color: 'hsla(210, 20%, 92%, 0.9)' }}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </h2>
      <p className="text-[10px] mt-0.5" style={{ color: 'hsla(220, 15%, 55%, 0.8)' }}>
        {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
};

export default DesktopWidget;
