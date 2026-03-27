import { useEffect, useState, useRef } from 'react';
import { playBootChime } from '@/lib/sounds';
import logoImg from '@/assets/logo.png';

interface BootScreenProps {
  onBootComplete: () => void;
}

const bootLogs = [
  'BIOS: AkibOS UEFI v2.4.1',
  'BIOS: Memory check... 16384 MB OK',
  'BIOS: Detecting storage devices...',
  'BIOS: NVMe SSD 512GB detected',
  '',
  'bootloader: GRUB 2.06 loading kernel...',
  'kernel: Linux akibos 6.2.0-akib #1 SMP x86_64',
  'kernel: Command line: BOOT_IMAGE=/boot/vmlinuz root=/dev/nvme0n1p2',
  'kernel: DMI: AkibOS Virtual Machine',
  'kernel: Memory: 16384MB available',
  'kernel: CPU: 8 cores @ 3.60GHz',
  '',
  'systemd[1]: Starting AkibOS...',
  'systemd[1]: Starting Journal Service...',
  '[  OK  ] Started Journal Service.',
  'systemd[1]: Starting udev Kernel Device Manager...',
  '[  OK  ] Started udev Kernel Device Manager.',
  '[  OK  ] Reached target Local File Systems.',
  'systemd[1]: Starting Network Manager...',
  '[  OK  ] Started Network Manager.',
  '[  OK  ] Reached target Network.',
  'systemd[1]: Starting Bluetooth Service...',
  '[  OK  ] Started Bluetooth Service.',
  'systemd[1]: Starting Sound Service...',
  '[  OK  ] Started PipeWire Audio Service.',
  'systemd[1]: Starting Login Service...',
  '[  OK  ] Started Login Service.',
  '',
  'systemd[1]: Starting Display Manager...',
  'akibos-desktop[1842]: Initializing GPU driver...',
  'akibos-desktop[1842]: GPU: Integrated Graphics detected',
  'akibos-desktop[1842]: Resolution: 1920x1080@60Hz',
  'akibos-desktop[1842]: Starting compositor...',
  '[  OK  ] Started AkibOS Compositor.',
  'akibos-desktop[1842]: Loading theme: AkibOS Dark',
  'akibos-desktop[1842]: Loading wallpaper...',
  'akibos-desktop[1842]: Registering applications...',
  'akibos-desktop[1842]: Loading user preferences...',
  '[  OK  ] Started AkibOS Desktop Environment.',
  '',
  'akibos: System ready. Welcome to AkibOS.',
];

type Phase = 'logs' | 'logo' | 'done';

const BootScreen = ({ onBootComplete }: BootScreenProps) => {
  const [phase, setPhase] = useState<Phase>('logs');
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Phase 1: Show logs one by one
  useEffect(() => {
    let i = 0;
    const addLog = () => {
      if (i < bootLogs.length) {
        const log = bootLogs[i];
        setVisibleLogs(prev => [...prev, log]);
        i++;
        // Vary speed: empty lines are fast, others random
        const delay = log === '' ? 50 : 40 + Math.random() * 80;
        setTimeout(addLog, delay);
      } else {
        // Logs done, transition to logo phase
        setTimeout(() => setPhase('logo'), 400);
      }
    };
    addLog();
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  // Phase 2: Show logo briefly then complete
  useEffect(() => {
    if (phase === 'logo') {
      playBootChime();
      setTimeout(() => setLogoVisible(true), 100);
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onBootComplete, 600);
      }, 1800);
    }
  }, [phase, onBootComplete]);

  const colorize = (line: string) => {
    if (line === '') return <br />;
    if (line.startsWith('[  OK  ]')) {
      return (
        <>
          <span style={{ color: 'hsl(142, 71%, 45%)' }}>[  OK  ]</span>
          <span style={{ color: 'hsl(0, 0%, 80%)' }}>{line.slice(8)}</span>
        </>
      );
    }
    if (line.startsWith('BIOS:')) {
      return <span style={{ color: 'hsl(0, 0%, 60%)' }}>{line}</span>;
    }
    if (line.startsWith('kernel:')) {
      return <span style={{ color: 'hsl(45, 80%, 65%)' }}>{line}</span>;
    }
    if (line.startsWith('bootloader:')) {
      return <span style={{ color: 'hsl(200, 60%, 60%)' }}>{line}</span>;
    }
    if (line.startsWith('akibos:')) {
      return <span style={{ color: 'hsl(217, 91%, 70%)' }} className="font-bold">{line}</span>;
    }
    return <span style={{ color: 'hsl(0, 0%, 75%)' }}>{line}</span>;
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#000' }}
    >
      {/* Phase 1: Terminal logs */}
      {phase === 'logs' && (
        <div
          ref={logContainerRef}
          className="absolute inset-0 p-4 overflow-y-auto font-mono text-[13px] leading-[1.6]"
          style={{ scrollBehavior: 'smooth' }}
        >
          {visibleLogs.map((log, i) => (
            <div key={i}>{colorize(log)}</div>
          ))}
          <span
            className="inline-block w-2 h-4 ml-0.5 animate-pulse"
            style={{ background: 'hsl(0, 0%, 70%)' }}
          />
        </div>
      )}

      {/* Phase 2: Logo reveal */}
      {phase === 'logo' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div
            className={`transition-all duration-700 ${logoVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
          >
            <img src={logoImg} alt="AkibOS" className="w-24 h-24 rounded-2xl" />
          </div>
          <h1
            className={`text-2xl font-semibold tracking-widest transition-all duration-700 delay-200 ${logoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ color: 'hsl(217, 91%, 70%)' }}
          >
            AkibOS
          </h1>
          <div
            className={`w-48 h-0.5 rounded-full overflow-hidden transition-opacity duration-500 delay-500 ${logoVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'hsl(0, 0%, 15%)' }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: '60%',
                background: 'linear-gradient(90deg, hsl(217, 91%, 60%), hsl(260, 80%, 65%))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BootScreen;
