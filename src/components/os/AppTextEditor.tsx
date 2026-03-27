import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, FolderOpen, X, FileText } from 'lucide-react';
import { vfs } from '@/lib/virtual-fs';
import { eventBus, OS_EVENTS } from '@/lib/event-bus';
import { getCurrentAccount } from '@/lib/session-context';

interface Tab {
  id: string;
  path: string | null; // null = unsaved new file
  name: string;
  content: string;
  savedContent: string; // to track unsaved changes
}

let tabCounter = 0;

interface AppTextEditorProps {
  initialFilePath?: string;
}

const AppTextEditor = ({ initialFilePath }: AppTextEditorProps) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsPath, setSaveAsPath] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with a tab
  useEffect(() => {
    if (initialFilePath) {
      openFile(initialFilePath);
    } else {
      const tab = createNewTab();
      setTabs([tab]);
      setActiveTabId(tab.id);
    }
  }, []);

  const createNewTab = (path?: string, content?: string): Tab => {
    tabCounter++;
    const name = path ? path.split('/').pop()! : `untitled-${tabCounter}.txt`;
    const c = content ?? '';
    return { id: `tab-${tabCounter}`, path: path || null, name, content: c, savedContent: c };
  };

  const openFile = useCallback((filePath: string) => {
    // Check if already open
    const existingTab = tabs.find(t => t.path === filePath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }
    const content = vfs.readFile(filePath);
    if (content === null) return;
    const tab = createNewTab(filePath, content);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [tabs]);

  // Listen for file open events
  useEffect(() => {
    const handler = ({ path }: { path: string }) => openFile(path);
    const unsub = eventBus.on(OS_EVENTS.OPEN_FILE, handler);
    return () => { unsub(); };
  }, [openFile]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const updateContent = (content: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content } : t));
  };

  const saveFile = useCallback(() => {
    if (!activeTab) return;
    if (!activeTab.path) {
      setSaveAsPath(`/home/${getCurrentAccount()}/Documents/` + activeTab.name);
      setShowSaveAs(true);
      return;
    }
    vfs.writeFile(activeTab.path, activeTab.content);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, savedContent: t.content } : t));
    eventBus.emit(OS_EVENTS.FILE_CHANGED, { path: activeTab.path });
  }, [activeTab, activeTabId]);

  const saveAs = () => {
    if (!activeTab || !saveAsPath) return;
    vfs.writeFile(saveAsPath, activeTab.content);
    const name = saveAsPath.split('/').pop()!;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, path: saveAsPath, name, savedContent: t.content } : t));
    setShowSaveAs(false);
    eventBus.emit(OS_EVENTS.FILE_CHANGED, { path: saveAsPath });
  };

  const closeTab = (tabId: string) => {
    const remaining = tabs.filter(t => t.id !== tabId);
    if (remaining.length === 0) {
      const newTab = createNewTab();
      setTabs([newTab]);
      setActiveTabId(newTab.id);
    } else {
      setTabs(remaining);
      if (activeTabId === tabId) setActiveTabId(remaining[0].id);
    }
  };

  const newFile = () => {
    const tab = createNewTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile]);

  return (
    <div className="flex flex-col h-full">
      {/* Menu bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 text-xs border-b border-os-panel-border bg-os-window-chrome">
        <button onClick={newFile} className="text-os-window-chrome-foreground opacity-70 hover:opacity-100">New</button>
        <button onClick={saveFile} className="text-os-window-chrome-foreground opacity-70 hover:opacity-100 flex items-center gap-1">
          <Save size={11} /> Save
        </button>
        <button onClick={() => { setSaveAsPath(activeTab?.path || `/home/${getCurrentAccount()}/Documents/untitled.txt`); setShowSaveAs(true); }} className="text-os-window-chrome-foreground opacity-70 hover:opacity-100">
          Save As
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-os-window-chrome border-b border-os-panel-border overflow-x-auto">
        {tabs.map(tab => {
          const hasUnsaved = tab.content !== tab.savedContent;
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-1.5 text-[11px] cursor-pointer border-r border-os-panel-border shrink-0 transition-colors ${tab.id === activeTabId ? 'bg-os-window-body text-os-window-body-foreground' : 'text-os-window-chrome-foreground opacity-60 hover:opacity-80'}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <FileText size={11} />
              <span>{tab.name}</span>
              {hasUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-os-accent" />}
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className="ml-1 opacity-50 hover:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div className="w-10 pt-2 text-right pr-2 text-[10px] select-none shrink-0 overflow-hidden" style={{ color: 'hsl(220, 15%, 35%)', background: 'hsl(220, 25%, 10%)' }}>
          {(activeTab?.content ?? '').split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none p-2 font-mono text-xs outline-none"
          style={{ background: 'hsl(220, 25%, 8%)', color: 'hsl(210, 20%, 85%)' }}
          value={activeTab?.content ?? ''}
          onChange={e => updateContent(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] border-t border-os-panel-border" style={{ background: 'hsl(217, 91%, 30%)', color: 'hsl(210, 20%, 92%)' }}>
        <span>{activeTab?.path || 'New File'}</span>
        <span>Lines: {(activeTab?.content ?? '').split('\n').length} | Chars: {(activeTab?.content ?? '').length}</span>
      </div>

      {/* Save As Dialog */}
      {showSaveAs && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="rounded-lg p-4 w-80" style={{ background: 'hsl(220, 20%, 14%)', border: '1px solid hsl(220, 15%, 22%)' }}>
            <h3 className="text-sm font-semibold text-os-window-body-foreground mb-3">Save As</h3>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded text-xs bg-black/30 text-os-window-body-foreground outline-none border border-os-panel-border"
              value={saveAsPath}
              onChange={e => setSaveAsPath(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveAs(); if (e.key === 'Escape') setShowSaveAs(false); }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowSaveAs(false)} className="px-3 py-1.5 rounded text-xs text-os-window-body-foreground hover:bg-white/10">Cancel</button>
              <button onClick={saveAs} className="px-3 py-1.5 rounded text-xs bg-os-accent text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppTextEditor;
