import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Music } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  color: string;
}

const defaultTracks: Track[] = [
  { id: '1', title: 'Midnight Drive', artist: 'Synthwave Dreams', duration: 234, color: 'hsl(260, 70%, 50%)' },
  { id: '2', title: 'Ocean Breeze', artist: 'Lo-Fi Beats', duration: 187, color: 'hsl(200, 70%, 45%)' },
  { id: '3', title: 'Neon Lights', artist: 'Retro Wave', duration: 312, color: 'hsl(330, 70%, 50%)' },
  { id: '4', title: 'Morning Coffee', artist: 'Jazz Hop', duration: 198, color: 'hsl(30, 70%, 45%)' },
  { id: '5', title: 'Starfall', artist: 'Ambient Space', duration: 276, color: 'hsl(180, 60%, 40%)' },
  { id: '6', title: 'City Rain', artist: 'Chill Hop', duration: 221, color: 'hsl(220, 60%, 45%)' },
  { id: '7', title: 'Summer Vibes', artist: 'Tropical House', duration: 245, color: 'hsl(45, 80%, 50%)' },
  { id: '8', title: 'Deep Focus', artist: 'Study Beats', duration: 310, color: 'hsl(150, 50%, 40%)' },
];

const AppMusicPlayer = () => {
  const [tracks] = useState(defaultTracks);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentTrack = tracks[currentTrackIndex];

  // Simulate playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentTrack.duration) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentTrackIndex]);

  const handleNext = useCallback(() => {
    if (shuffle) {
      let next: number;
      do { next = Math.floor(Math.random() * tracks.length); } while (next === currentTrackIndex && tracks.length > 1);
      setCurrentTrackIndex(next);
    } else if (repeat) {
      setCurrentTime(0);
    } else {
      setCurrentTrackIndex((currentTrackIndex + 1) % tracks.length);
    }
    setCurrentTime(0);
  }, [currentTrackIndex, shuffle, repeat, tracks.length]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) {
      setCurrentTime(0);
    } else {
      setCurrentTrackIndex(currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1);
      setCurrentTime(0);
    }
  }, [currentTrackIndex, currentTime, tracks.length]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = currentTrack.duration > 0 ? (currentTime / currentTrack.duration) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-os-window-body">
      {/* Album art area */}
      <div className="flex-shrink-0 p-6 flex flex-col items-center">
        <div
          className="w-40 h-40 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${currentTrack.color}, ${currentTrack.color}88)`,
            transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Music size={56} className="text-white/30" />
        </div>

        {/* Track info */}
        <div className="mt-4 text-center">
          <h3 className="text-sm font-semibold text-os-window-body-foreground">{currentTrack.title}</h3>
          <p className="text-xs text-os-window-body-foreground/50 mt-0.5">{currentTrack.artist}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full mt-4 px-2">
          <div
            className="w-full h-1 rounded-full cursor-pointer"
            style={{ background: 'hsla(0, 0%, 100%, 0.1)' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setCurrentTime(Math.floor(pct * currentTrack.duration));
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: currentTrack.color }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-os-window-body-foreground/40">{formatTime(currentTime)}</span>
            <span className="text-[10px] text-os-window-body-foreground/40">{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${shuffle ? 'text-os-accent' : 'text-os-window-body-foreground/40 hover:text-os-window-body-foreground/60'}`}
          >
            <Shuffle size={14} />
          </button>
          <button onClick={handlePrev} className="w-10 h-10 rounded-full flex items-center justify-center text-os-window-body-foreground hover:bg-white/10 transition-colors">
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-os-accent text-white hover:bg-os-accent/80 transition-all active:scale-95"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button onClick={handleNext} className="w-10 h-10 rounded-full flex items-center justify-center text-os-window-body-foreground hover:bg-white/10 transition-colors">
            <SkipForward size={18} />
          </button>
          <button
            onClick={() => setRepeat(!repeat)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${repeat ? 'text-os-accent' : 'text-os-window-body-foreground/40 hover:text-os-window-body-foreground/60'}`}
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mt-3 w-full px-8">
          <button onClick={() => setMuted(!muted)} className="text-os-window-body-foreground/50 hover:text-os-window-body-foreground">
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, ${currentTrack.color} ${(muted ? 0 : volume) * 100}%, hsla(0,0%,100%,0.1) ${(muted ? 0 : volume) * 100}%)` }}
          />
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-auto border-t border-os-panel-border">
        <div className="px-2 py-1">
          <div className="text-[9px] uppercase tracking-wider text-os-window-body-foreground/30 px-2 py-1">Queue</div>
          {tracks.map((track, i) => (
            <button
              key={track.id}
              onClick={() => { setCurrentTrackIndex(i); setCurrentTime(0); setIsPlaying(true); }}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                i === currentTrackIndex ? 'bg-os-accent/10' : 'hover:bg-white/5'
              }`}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: track.color + '33' }}
              >
                {i === currentTrackIndex && isPlaying ? (
                  <div className="flex items-end gap-[2px] h-3">
                    <div className="w-[2px] bg-os-accent animate-pulse" style={{ height: '60%' }} />
                    <div className="w-[2px] bg-os-accent animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                    <div className="w-[2px] bg-os-accent animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                  </div>
                ) : (
                  <Music size={12} style={{ color: track.color }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs truncate ${i === currentTrackIndex ? 'text-os-accent font-medium' : 'text-os-window-body-foreground'}`}>
                  {track.title}
                </div>
                <div className="text-[10px] text-os-window-body-foreground/40 truncate">{track.artist}</div>
              </div>
              <span className="text-[10px] text-os-window-body-foreground/30 shrink-0">{formatTime(track.duration)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppMusicPlayer;
