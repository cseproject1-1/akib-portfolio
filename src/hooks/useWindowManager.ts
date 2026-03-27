import { useState, useEffect, useCallback } from 'react';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  url?: string;
  initialData?: Record<string, any>;
}

let nextZ = 10;
let windowCounter = 0;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);

  const openWindow = useCallback((appId: string, title: string, url?: string, initialData?: Record<string, any>) => {
    windowCounter++;
    const id = `${appId}-${windowCounter}`;
    const offset = (windowCounter % 8) * 30;
    const newWin: WindowState = {
      id,
      appId,
      title,
      x: 80 + offset,
      y: 40 + offset,
      width: 900,
      height: 560,
      minimized: false,
      maximized: false,
      zIndex: ++nextZ,
      url,
      initialData,
    };
    setWindows(prev => [...prev, newWin]);
    return id;
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, zIndex: ++nextZ, minimized: false } : w)
    );
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, minimized: true } : w)
    );
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, maximized: !w.maximized, zIndex: ++nextZ } : w)
    );
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, x, y } : w)
    );
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, width: Math.max(400, width), height: Math.max(300, height) } : w)
    );
  }, []);

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    moveWindow,
    resizeWindow,
  };
}
