import { useState, useEffect, useCallback } from 'react';
import { Folder, File, ChevronRight, Home, HardDrive, Plus, FolderPlus, Trash2, Edit3, Grid, List, ArrowUp } from 'lucide-react';
import { vfs, type FSNode } from '@/lib/virtual-fs';
import { eventBus, OS_EVENTS } from '@/lib/event-bus';
import { getCurrentAccount } from '@/lib/session-context';

interface AppFileManagerProps {
  initialPath?: string;
}

const AppFileManager = ({ initialPath }: AppFileManagerProps) => {
  const account = getCurrentAccount();
  const homePath = `/home/${account}`;
  const defaultPath = homePath;
  const [currentPath, setCurrentPath] = useState(initialPath || defaultPath);
  const [entries, setEntries] = useState<FSNode[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; name: string } | null>(null);
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null);
  const [createName, setCreateName] = useState('');

  const refresh = useCallback(() => {
    const items = vfs.readDir(currentPath);
    // Sort: folders first, then alphabetical
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    setEntries(items);
  }, [currentPath]);

  useEffect(() => {
    refresh();
    const unsub = vfs.subscribe(refresh);
    return unsub;
  }, [refresh]);

  useEffect(() => {
    const handleFileChanged = () => refresh();
    const unsub = eventBus.on(OS_EVENTS.FILE_CHANGED, handleFileChanged);
    return unsub;
  }, [refresh]);

  const navigate = (name: string) => {
    const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    setCurrentPath(newPath);
    setSelected(null);
    setContextMenu(null);
  };

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) { setCurrentPath('/'); return; }
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
    setSelected(null);
  };

  const handleDoubleClick = (entry: FSNode) => {
    if (entry.type === 'directory') {
      navigate(entry.name);
    } else {
      // Open file in text editor
      const filePath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      eventBus.emit(OS_EVENTS.OPEN_FILE, { path: filePath });
    }
  };

  const handleDelete = (name: string) => {
    const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    vfs.rm(fullPath);
    setSelected(null);
    setContextMenu(null);
  };

  const handleRenameSubmit = (oldName: string) => {
    if (renameValue && renameValue !== oldName) {
      const fullPath = currentPath === '/' ? `/${oldName}` : `${currentPath}/${oldName}`;
      vfs.rename(fullPath, renameValue);
    }
    setRenaming(null);
    setRenameValue('');
  };

  const handleCreate = () => {
    if (!createName || !creating) return;
    const fullPath = currentPath === '/' ? `/${createName}` : `${currentPath}/${createName}`;
    if (creating === 'folder') vfs.mkdir(fullPath);
    else vfs.writeFile(fullPath, '');
    setCreating(null);
    setCreateName('');
  };

  const handleContextMenu = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, name });
    setSelected(name);
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  const formatSize = (n: FSNode) => {
    if (n.type === 'directory') return '--';
    if (n.size < 1024) return `${n.size} B`;
    return `${(n.size / 1024).toFixed(1)} KB`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full text-os-window-body-foreground" onClick={() => setContextMenu(null)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-os-panel-border bg-os-window-chrome">
        <button onClick={goUp} className="p-1 rounded hover:bg-white/10 transition-colors" title="Go up">
          <ArrowUp size={14} className="text-os-window-chrome-foreground" />
        </button>
        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 flex-1 px-2 text-xs">
          <button onClick={() => setCurrentPath('/')} className="text-os-window-chrome-foreground opacity-70 hover:opacity-100">/</button>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <ChevronRight size={10} className="text-os-window-chrome-foreground opacity-40" />
              <button
                onClick={() => setCurrentPath('/' + pathParts.slice(0, i + 1).join('/'))}
                className="text-os-window-chrome-foreground opacity-70 hover:opacity-100"
              >{part}</button>
            </span>
          ))}
        </div>
        <button onClick={() => { setCreating('file'); setCreateName('new-file.txt'); }} className="p-1 rounded hover:bg-white/10 transition-colors" title="New file">
          <Plus size={14} className="text-os-window-chrome-foreground" />
        </button>
        <button onClick={() => { setCreating('folder'); setCreateName('New Folder'); }} className="p-1 rounded hover:bg-white/10 transition-colors" title="New folder">
          <FolderPlus size={14} className="text-os-window-chrome-foreground" />
        </button>
        <div className="w-px h-4 bg-os-panel-border mx-1" />
        <button onClick={() => setViewMode('list')} className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white/15' : 'hover:bg-white/10'}`}>
          <List size={14} className="text-os-window-chrome-foreground" />
        </button>
        <button onClick={() => setViewMode('grid')} className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white/15' : 'hover:bg-white/10'}`}>
          <Grid size={14} className="text-os-window-chrome-foreground" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-36 border-r border-os-panel-border p-2 space-y-0.5 shrink-0 overflow-auto">
          <button onClick={() => setCurrentPath(homePath)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors ${currentPath.startsWith(homePath) && currentPath.split('/').length <= 3 ? 'bg-white/8' : ''}`}>
            <Home size={13} /> Home
          </button>
          <button onClick={() => setCurrentPath(`${homePath}/Documents`)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors ${currentPath === `${homePath}/Documents` ? 'bg-white/8' : ''}`}>
            <Folder size={13} className="text-os-warning" /> Documents
          </button>
          <button onClick={() => setCurrentPath(`${homePath}/Pictures`)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors ${currentPath === `${homePath}/Pictures` ? 'bg-white/8' : ''}`}>
            <Folder size={13} className="text-os-warning" /> Pictures
          </button>
          <button onClick={() => setCurrentPath(`${homePath}/Downloads`)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors ${currentPath === `${homePath}/Downloads` ? 'bg-white/8' : ''}`}>
            <Folder size={13} className="text-os-warning" /> Downloads
          </button>
          <div className="h-px bg-os-panel-border my-2" />
          <button onClick={() => setCurrentPath('/')} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors ${currentPath === '/' ? 'bg-white/8' : ''}`}>
            <HardDrive size={13} /> Root
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-1">
          {/* Create new item inline */}
          {creating && (
            <div className="flex items-center gap-2 px-2 py-1 mb-1 rounded bg-white/5">
              {creating === 'folder' ? <Folder size={14} className="text-os-warning" /> : <File size={14} className="opacity-60" />}
              <input
                autoFocus
                className="flex-1 bg-transparent text-xs outline-none"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(null); }}
                onBlur={handleCreate}
              />
            </div>
          )}

          {viewMode === 'list' ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 px-2 py-1 text-[10px] opacity-50 border-b border-os-panel-border">
                <span className="flex-1">Name</span>
                <span className="w-16 text-right">Size</span>
                <span className="w-28 text-right">Modified</span>
              </div>
              {entries.length === 0 && !creating && (
                <div className="text-xs opacity-40 text-center py-8">Empty folder</div>
              )}
              {entries.map(entry => (
                <div
                  key={entry.name}
                  className={`flex items-center gap-2 px-2 py-1 text-xs rounded cursor-default transition-colors ${selected === entry.name ? 'bg-os-accent/20' : 'hover:bg-white/5'}`}
                  onClick={(e) => { e.stopPropagation(); setSelected(entry.name); }}
                  onDoubleClick={() => handleDoubleClick(entry)}
                  onContextMenu={(e) => handleContextMenu(e, entry.name)}
                >
                  {entry.type === 'directory'
                    ? <Folder size={14} className="text-os-warning shrink-0" />
                    : <File size={14} className="opacity-60 shrink-0" />
                  }
                  {renaming === entry.name ? (
                    <input
                      autoFocus
                      className="flex-1 bg-transparent outline-none text-xs"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(entry.name); if (e.key === 'Escape') setRenaming(null); }}
                      onBlur={() => handleRenameSubmit(entry.name)}
                    />
                  ) : (
                    <span className="flex-1 truncate">{entry.name}</span>
                  )}
                  <span className="w-16 text-right opacity-50">{formatSize(entry)}</span>
                  <span className="w-28 text-right opacity-50">{formatDate(entry.modifiedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 p-2">
              {entries.length === 0 && !creating && (
                <div className="col-span-5 text-xs opacity-40 text-center py-8">Empty folder</div>
              )}
              {entries.map(entry => (
                <div
                  key={entry.name}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-default transition-colors ${selected === entry.name ? 'bg-os-accent/20' : 'hover:bg-white/5'}`}
                  onClick={(e) => { e.stopPropagation(); setSelected(entry.name); }}
                  onDoubleClick={() => handleDoubleClick(entry)}
                  onContextMenu={(e) => handleContextMenu(e, entry.name)}
                >
                  {entry.type === 'directory'
                    ? <Folder size={28} className="text-os-warning" />
                    : <File size={28} className="opacity-60" />
                  }
                  <span className="text-[10px] text-center truncate w-full">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[9999] rounded-lg overflow-hidden shadow-xl"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'hsl(220, 20%, 14%)',
            border: '1px solid hsl(220, 15%, 22%)',
            minWidth: 160,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors"
            onClick={() => { handleDoubleClick(entries.find(e => e.name === contextMenu.name)!); setContextMenu(null); }}
          >
            Open
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors"
            onClick={() => { setRenaming(contextMenu.name); setRenameValue(contextMenu.name); setContextMenu(null); }}
          >
            <Edit3 size={12} /> Rename
          </button>
          <div className="h-px mx-2" style={{ background: 'hsl(220, 15%, 22%)' }} />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors"
            onClick={() => handleDelete(contextMenu.name)}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] border-t border-os-panel-border bg-os-window-chrome text-os-window-chrome-foreground opacity-70">
        <span>{entries.length} items</span>
        <span>{currentPath}</span>
      </div>
    </div>
  );
};

export default AppFileManager;
