import { useRef, useCallback, useState, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2, Expand } from 'lucide-react';
import type { WindowState } from '@/hooks/useWindowManager';
import { playClickSound, playCloseSound } from '@/lib/sounds';

interface WindowProps {
  win: WindowState;
  children: React.ReactNode;
  taskbarHidden?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onSnapPreview?: (zone: 'left' | 'right' | 'top' | null) => void;
}

const Window = ({ win, children, taskbarHidden, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, onSnapPreview }: WindowProps) => {
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; winW: number; winH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    playCloseSound();
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Listen for fullscreen changes
  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const handler = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);


  const handleFullscreen = useCallback(() => {
    if (!windowRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      windowRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);




  const handleMouseDownDrag = useCallback((e: React.MouseEvent) => {
    if (win.maximized || isFullscreen) return;
    e.preventDefault();
    onFocus();
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };
    setIsDragging(true);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      onMove(dragRef.current.winX + dx, Math.max(0, dragRef.current.winY + dy));

      if (onSnapPreview) {
        if (ev.clientX <= 4) onSnapPreview('left');
        else if (ev.clientX >= window.innerWidth - 4) onSnapPreview('right');
        else if (ev.clientY <= 4) onSnapPreview('top');
        else onSnapPreview(null);
      }
    };
    const handleMouseUp = (ev: MouseEvent) => {
      if (onSnapPreview) {
        if (ev.clientX <= 4) {
          onMove(0, 0);
          onResize(window.innerWidth / 2, window.innerHeight - 48);
        } else if (ev.clientX >= window.innerWidth - 4) {
          onMove(window.innerWidth / 2, 0);
          onResize(window.innerWidth / 2, window.innerHeight - 48);
        } else if (ev.clientY <= 4) {
          onMaximize();
        }
        onSnapPreview(null);
      }
      dragRef.current = null;
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.maximized, win.x, win.y, isFullscreen, onFocus, onMove, onResize, onMaximize, onSnapPreview]);

  const handleDoubleClickTitleBar = useCallback(() => {
    onMaximize();
  }, [onMaximize]);

  const handleMouseDownResize = useCallback((e: React.MouseEvent) => {
    if (win.maximized || isFullscreen) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, winW: win.width, winH: win.height };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      onResize(resizeRef.current.winW + dw, resizeRef.current.winH + dh);
    };
    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.maximized, win.width, win.height, isFullscreen, onResize]);

  if (win.minimized) return null;

  const style: React.CSSProperties = isFullscreen
    ? { top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }
    : win.maximized
      ? { top: 0, left: 0, width: '100%', height: taskbarHidden ? '100%' : 'calc(100% - 56px)', zIndex: win.zIndex }
      : { top: win.y, left: win.x, width: win.width, height: win.height, zIndex: win.zIndex };

  return (
    <div
      ref={windowRef}
      className={`absolute flex flex-col overflow-hidden border border-os-panel-border ${isFullscreen ? '' : 'rounded-lg'} ${closing ? 'animate-window-close' : 'animate-window-open'}`}
      style={{
        ...style,
        boxShadow: isFullscreen ? 'none' : '0 12px 40px -8px hsla(0, 0%, 0%, 0.6), 0 0 0 1px hsla(217, 91%, 60%, 0.1)',
      }}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div
        className="h-9 flex items-center justify-between px-3 shrink-0 bg-os-window-chrome select-none"
        onMouseDown={handleMouseDownDrag}
        onDoubleClick={handleDoubleClickTitleBar}
        style={{ cursor: isDragging ? 'grabbing' : (win.maximized || isFullscreen ? 'default' : 'grab') }}
      >
        <span className="text-xs font-medium text-os-window-chrome-foreground truncate">{win.title}</span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); playClickSound(); onMinimize(); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors">
            <Minus size={13} className="text-os-window-chrome-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMaximize(); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors">
            {win.maximized ? <Minimize2 size={13} className="text-os-window-chrome-foreground" /> : <Maximize2 size={13} className="text-os-window-chrome-foreground" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <Expand size={13} className="text-os-window-chrome-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/80 transition-colors">
            <X size={13} className="text-os-window-chrome-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 bg-os-window-body overflow-hidden relative">
        {children}
      </div>

      {/* Resize handle */}
      {!win.maximized && !isFullscreen && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleMouseDownResize}
        />
      )}
    </div>
  );
};

export default Window;
