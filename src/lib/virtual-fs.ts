// Virtual Filesystem — localStorage-backed with Supabase sync
// Scoped per user account (akib vs guest)

import { saveOsData, loadOrFallback } from './os-persistence';
import { accountKey } from './session-context';

export interface FSNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  children?: Record<string, FSNode>;
}

function createDir(name: string): FSNode {
  const now = Date.now();
  return { name, type: 'directory', size: 0, createdAt: now, modifiedAt: now, children: {} };
}

function createFile(name: string, content = ''): FSNode {
  const now = Date.now();
  return { name, type: 'file', content, size: content.length, createdAt: now, modifiedAt: now };
}

function buildDefaultFS(): FSNode {
  const root = createDir('/');
  root.children = {
    home: {
      ...createDir('home'),
      children: {
        user: {
          ...createDir('user'),
          children: {
            Documents: {
              ...createDir('Documents'),
              children: {
                'notes.txt': createFile('notes.txt', '# My Notes\n\nWelcome to AkibOS!\nYou can create and edit files here.\n'),
                'todo.txt': createFile('todo.txt', '- Learn something new\n- Build a project\n- Take a break\n'),
                'report.md': createFile('report.md', '# Project Report\n\n## Summary\nThis is a sample markdown report.\n\n## Details\nLorem ipsum dolor sit amet.\n'),
              },
            },
            Pictures: {
              ...createDir('Pictures'),
              children: {
                'readme.txt': createFile('readme.txt', 'Put your screenshots and wallpapers here.'),
              },
            },
            Downloads: { ...createDir('Downloads'), children: {} },
            Desktop: { ...createDir('Desktop'), children: {} },
            '.bashrc': createFile('.bashrc', '# AkibOS Shell Config\nexport PS1="user@akibos:~$ "\nalias ll="ls -la"\n'),
            '.config': {
              ...createDir('.config'),
              children: {
                'settings.json': createFile('settings.json', '{\n  "theme": "dark",\n  "fontSize": 14\n}\n'),
              },
            },
          },
        },
      },
    },
    etc: {
      ...createDir('etc'),
      children: {
        'hostname': createFile('hostname', 'akibos'),
        'os-release': createFile('os-release', 'NAME="AkibOS"\nVERSION="1.0.0"\nID=akibos\n'),
      },
    },
    tmp: { ...createDir('tmp'), children: {} },
  };
  return root;
}

class VirtualFS {
  private root: FSNode;
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.root = buildDefaultFS();
  }

  /** Re-initialize from the current account's storage */
  init() {
    const storageKey = accountKey('vfs');
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { this.root = JSON.parse(saved); } catch { this.root = buildDefaultFS(); }
    } else {
      this.root = buildDefaultFS();
    }
    this.listeners.forEach(fn => fn());
    // Async load from backend (non-blocking, graceful fallback)
    this.initFromBackend();
  }

  private async initFromBackend() {
    try {
      const remote = await loadOrFallback('vfs', null);
      if (remote && typeof remote === 'object' && 'children' in remote) {
        this.root = remote;
        const storageKey = accountKey('vfs');
        localStorage.setItem(storageKey, JSON.stringify(this.root));
        this.listeners.forEach(fn => fn());
      } else if (!localStorage.getItem(accountKey('vfs'))) {
        saveOsData('vfs', this.root);
      }
    } catch (e) {
      console.warn('VFS backend sync failed, using localStorage:', e);
    }
    this.initialized = true;
  }

  private save() {
    const storageKey = accountKey('vfs');
    localStorage.setItem(storageKey, JSON.stringify(this.root));
    saveOsData('vfs', this.root);
    this.listeners.forEach(fn => fn());
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private parsePath(path: string): string[] {
    return path.split('/').filter(Boolean);
  }

  private getNode(path: string): FSNode | null {
    if (path === '/' || path === '') return this.root;
    const parts = this.parsePath(path);
    let node = this.root;
    for (const part of parts) {
      if (node.type !== 'directory' || !node.children?.[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  private getParent(path: string): { parent: FSNode; name: string } | null {
    const parts = this.parsePath(path);
    if (parts.length === 0) return null;
    const name = parts.pop()!;
    const parentPath = '/' + parts.join('/');
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== 'directory') return null;
    return { parent, name };
  }

  exists(path: string): boolean { return this.getNode(path) !== null; }
  stat(path: string): FSNode | null { return this.getNode(path); }

  readFile(path: string): string | null {
    const node = this.getNode(path);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
  }

  writeFile(path: string, content: string): boolean {
    const existing = this.getNode(path);
    if (existing && existing.type === 'file') {
      existing.content = content;
      existing.size = content.length;
      existing.modifiedAt = Date.now();
      this.save();
      return true;
    }
    const info = this.getParent(path);
    if (!info) return false;
    info.parent.children![info.name] = createFile(info.name, content);
    info.parent.modifiedAt = Date.now();
    this.save();
    return true;
  }

  mkdir(path: string): boolean {
    if (this.exists(path)) return false;
    const info = this.getParent(path);
    if (!info) return false;
    info.parent.children![info.name] = createDir(info.name);
    info.parent.modifiedAt = Date.now();
    this.save();
    return true;
  }

  readDir(path: string): FSNode[] {
    const node = this.getNode(path);
    if (!node || node.type !== 'directory' || !node.children) return [];
    return Object.values(node.children);
  }

  ls(path: string): string[] { return this.readDir(path).map(n => n.name); }

  rm(path: string): boolean {
    const info = this.getParent(path);
    if (!info || !info.parent.children?.[info.name]) return false;
    delete info.parent.children[info.name];
    info.parent.modifiedAt = Date.now();
    this.save();
    return true;
  }

  rename(oldPath: string, newName: string): boolean {
    const info = this.getParent(oldPath);
    if (!info || !info.parent.children?.[info.name]) return false;
    const node = info.parent.children[info.name];
    delete info.parent.children[info.name];
    node.name = newName;
    node.modifiedAt = Date.now();
    info.parent.children[newName] = node;
    this.save();
    return true;
  }

  copy(src: string, destDir: string): boolean {
    const node = this.getNode(src);
    const dest = this.getNode(destDir);
    if (!node || !dest || dest.type !== 'directory') return false;
    const clone = JSON.parse(JSON.stringify(node));
    dest.children![clone.name] = clone;
    this.save();
    return true;
  }

  move(src: string, destDir: string): boolean {
    if (!this.copy(src, destDir)) return false;
    return this.rm(src);
  }

  getStats(): { files: number; dirs: number; totalSize: number } {
    let files = 0, dirs = 0, totalSize = 0;
    const walk = (node: FSNode) => {
      if (node.type === 'file') { files++; totalSize += node.size; }
      else { dirs++; if (node.children) Object.values(node.children).forEach(walk); }
    };
    walk(this.root);
    return { files, dirs, totalSize };
  }

  reset() {
    this.root = buildDefaultFS();
    this.save();
  }
}

export const vfs = new VirtualFS();

/** Re-initialize VFS for the current account (call after setCurrentAccount) */
export function reinitVFS() {
  vfs.init();
}
