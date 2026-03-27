import { useState, useRef, useEffect, useCallback } from 'react';
import { vfs } from '@/lib/virtual-fs';
import { eventBus, OS_EVENTS } from '@/lib/event-bus';
import { getCurrentAccount } from '@/lib/session-context';

const MOTD = `AkibOS Terminal v1.0
Type 'help' for available commands.\n`;

const AppTerminal = () => {
  const account = getCurrentAccount();
  const homePath = `/home/${account}`;
  const [lines, setLines] = useState<string[]>([MOTD]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState(homePath);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines]);

  const resolvePath = useCallback((p: string): string => {
    if (p.startsWith('/')) return normalizePath(p);
    // Handle ~
    if (p.startsWith('~')) return normalizePath(homePath + p.slice(1));
    return normalizePath(cwd + '/' + p);
  }, [cwd, homePath]);

  const normalizePath = (p: string): string => {
    const parts = p.split('/').filter(Boolean);
    const result: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') { result.pop(); continue; }
      result.push(part);
    }
    return '/' + result.join('/');
  };

  const getCompletions = useCallback((partial: string): string[] => {
    const dir = partial.includes('/') ? resolvePath(partial.substring(0, partial.lastIndexOf('/'))) : cwd;
    const prefix = partial.includes('/') ? partial.substring(partial.lastIndexOf('/') + 1) : partial;
    const entries = vfs.ls(dir);
    return entries.filter(e => e.startsWith(prefix));
  }, [cwd, resolvePath]);

  const executeCommand = useCallback((trimmed: string) => {
    // Handle output redirection: echo "text" > file.txt
    let outputFile: string | null = null;
    let cmdStr = trimmed;
    if (cmdStr.includes('>')) {
      const redir = cmdStr.split('>');
      cmdStr = redir[0].trim();
      outputFile = redir[1]?.trim() || null;
    }

    const parts = cmdStr.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cmd = parts[0];
    const args = parts.slice(1).map(a => a.replace(/^"|"$/g, ''));

    let output = '';

    switch (cmd) {
      case 'help':
        output = `Available commands:
  help        - Show this message
  ls [path]   - List directory contents
  cd <path>   - Change directory
  pwd         - Print working directory
  cat <file>  - Read file contents
  touch <f>   - Create empty file
  mkdir <d>   - Create directory
  rm <path>   - Delete file/folder
  cp <s> <d>  - Copy file to directory
  mv <s> <d>  - Move file to directory
  echo <txt>  - Echo text (supports > redirect)
  whoami      - Display current user
  date        - Show current date/time
  clear       - Clear terminal
  neofetch    - System info
  open <app>  - Launch an app
  uname       - System name
  history     - Show command history
  grep <pat>  - Search files for pattern
  find <name> - Find files by name
  df          - Show disk usage
  reset       - Reset filesystem`;
        break;

      case 'history':
        output = cmdHistory.length > 0 
          ? cmdHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`).join('\n')
          : 'No commands in history';
        break;

      case 'df': {
        const stats = vfs.getStats();
        output = `Filesystem     1K-blocks      Used Available Use% Mounted on
akibos-root    104857600    ${Math.round(stats.totalSize / 1024)}    104753664  ${stats.totalSize > 0 ? Math.round(stats.totalSize / 1048576) : 0}% /`;
        break;
      }

      case 'grep': {
        if (!args[0]) { output = 'grep: missing pattern'; break; }
        const pattern = args[0];
        const targetPath = args[1] ? resolvePath(args[1]) : cwd;
        const content = vfs.readFile(targetPath);
        if (content === null) { output = `grep: ${args[1] || '.'}: No such file`; break; }
        const regex = new RegExp(pattern, 'gi');
        const lines = content.split('\n');
        const matches = lines.filter(line => regex.test(line));
        output = matches.length > 0 ? matches.join('\n') : '';
        break;
      }

      case 'find': {
        if (!args[0]) { output = 'find: missing name'; break; }
        const name = args[0];
        const targetDir = args[1] ? resolvePath(args[1]) : cwd;
        const searchInDir = (dir: string, prefix = ''): string[] => {
          const entries = vfs.readDir(dir);
          let results: string[] = [];
          for (const entry of entries) {
            const fullPath = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;
            if (entry.name.includes(name)) {
              results.push(fullPath);
            }
            if (entry.type === 'directory') {
              results = results.concat(searchInDir(fullPath, prefix));
            }
          }
          return results;
        };
        const results = searchInDir(targetDir);
        output = results.length > 0 ? results.join('\n') : `find: '${name}': No such file or directory`;
        break;
      }

      case 'ls': {
        const target = args[0] ? resolvePath(args[0]) : cwd;
        const entries = vfs.readDir(target);
        if (entries.length === 0 && !vfs.exists(target)) {
          output = `ls: cannot access '${args[0] || '.'}': No such file or directory`;
        } else {
          const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
          const showLong = args.includes('-l') || args.includes('-la') || args.includes('-al');
          let items = entries;
          if (!showAll) items = items.filter(e => !e.name.startsWith('.'));
          if (showLong) {
            output = items.map(e => {
              const type = e.type === 'directory' ? 'd' : '-';
              const size = e.type === 'file' ? String(e.size).padStart(6) : '     -';
              const date = new Date(e.modifiedAt).toLocaleDateString([], { month: 'short', day: '2-digit' });
              return `${type}rw-r--r--  ${size}  ${date}  ${e.name}`;
            }).join('\n');
          } else {
            output = items.map(e => e.type === 'directory' ? `\x1b[1m${e.name}/\x1b[0m` : e.name).join('  ');
          }
        }
        break;
      }

      case 'cd': {
        if (!args[0] || args[0] === '~') { setCwd(homePath); output = ''; break; }
        const target = resolvePath(args[0]);
        const node = vfs.stat(target);
        if (!node) { output = `cd: ${args[0]}: No such file or directory`; }
        else if (node.type !== 'directory') { output = `cd: ${args[0]}: Not a directory`; }
        else { setCwd(target); output = ''; }
        break;
      }

      case 'pwd':
        output = cwd;
        break;

      case 'cat': {
        if (!args[0]) { output = 'cat: missing operand'; break; }
        const content = vfs.readFile(resolvePath(args[0]));
        if (content === null) output = `cat: ${args[0]}: No such file or directory`;
        else output = content;
        break;
      }

      case 'touch': {
        if (!args[0]) { output = 'touch: missing operand'; break; }
        const path = resolvePath(args[0]);
        if (!vfs.exists(path)) vfs.writeFile(path, '');
        output = '';
        break;
      }

      case 'mkdir': {
        if (!args[0]) { output = 'mkdir: missing operand'; break; }
        const path = resolvePath(args[0]);
        if (!vfs.mkdir(path)) output = `mkdir: cannot create directory '${args[0]}': File exists or invalid path`;
        else output = '';
        break;
      }

      case 'rm': {
        if (!args[0]) { output = 'rm: missing operand'; break; }
        const path = resolvePath(args[0]);
        if (!vfs.rm(path)) output = `rm: cannot remove '${args[0]}': No such file or directory`;
        else output = '';
        break;
      }

      case 'cp': {
        if (args.length < 2) { output = 'cp: missing operand'; break; }
        if (!vfs.copy(resolvePath(args[0]), resolvePath(args[1]))) output = `cp: failed to copy`;
        else output = '';
        break;
      }

      case 'mv': {
        if (args.length < 2) { output = 'mv: missing operand'; break; }
        if (!vfs.move(resolvePath(args[0]), resolvePath(args[1]))) output = `mv: failed to move`;
        else output = '';
        break;
      }

      case 'echo':
        output = args.join(' ');
        break;

      case 'whoami': {
        const name = getCurrentAccount();
        output = name;
        break;
      }

      case 'date':
        output = new Date().toString();
        break;

      case 'uname':
        output = 'AkibOS 1.0 x86_64';
        break;

      case 'neofetch':
        output = `
       ___       ${getCurrentAccount()}@akibos
      /   \\      OS: AkibOS 1.0
     / A   \\     Kernel: web-5.0
    /  kib   \\   Shell: akibsh 1.0
   /   OS     \\  DE: Plasma Web
  /____________\\ CPU: Browser Engine
                 Memory: ∞ MB`;
        break;

      case 'open':
        if (!args[0]) { output = 'open: specify app id'; break; }
        eventBus.emit(OS_EVENTS.OPEN_APP, { appId: args[0] });
        output = `Launching ${args[0]}...`;
        break;

      case 'reset':
        vfs.reset();
        setCwd(homePath);
        setLines([MOTD, 'Filesystem reset to default.']);
        output = '';
        break;

      case 'exit':
        output = 'Use Alt+F4 or click X to close terminal window';
        break;

      default:
        output = `${cmd}: command not found`;
    }

    // Handle output redirection
    if (outputFile && output) {
      vfs.writeFile(resolvePath(outputFile), output);
      return '';
    }

    return output;
  }, [cwd, resolvePath, homePath]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    const username = getCurrentAccount();
    const prompt = `${username}@akibos:${cwd === '/home/user' ? '~' : cwd}$ ${trimmed}`;

    if (!trimmed) {
      setLines(prev => [...prev, prompt]);
      setInput('');
      return;
    }

    if (trimmed === 'clear') {
      setLines([]);
      setInput('');
      return;
    }

    const output = executeCommand(trimmed);
    setLines(prev => output ? [...prev, prompt, output] : [...prev, prompt]);
    setCmdHistory(prev => [...prev, trimmed]);
    setHistIdx(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.split(/\s+/);
      const last = parts[parts.length - 1];
      if (last) {
        const completions = getCompletions(last);
        if (completions.length === 1) {
          parts[parts.length - 1] = last.includes('/')
            ? last.substring(0, last.lastIndexOf('/') + 1) + completions[0]
            : completions[0];
          setInput(parts.join(' '));
        } else if (completions.length > 1) {
          const username = getCurrentAccount();
          setLines(prev => [...prev, `${username}@akibos:${cwd === '/home/user' ? '~' : cwd}$ ${input}`, completions.join('  ')]);
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIdx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
        setHistIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx >= 0) {
        const newIdx = histIdx + 1;
        if (newIdx >= cmdHistory.length) { setHistIdx(-1); setInput(''); }
        else { setHistIdx(newIdx); setInput(cmdHistory[newIdx]); }
      }
    }
  };

  const username = getCurrentAccount();

  return (
    <div
      className="h-full p-3 font-mono text-xs overflow-auto cursor-text"
      style={{ background: 'hsl(220, 30%, 6%)', color: 'hsl(120, 50%, 75%)' }}
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line, i) => (
        <pre key={i} className="whitespace-pre-wrap">{line}</pre>
      ))}
      <div className="flex items-center gap-0">
        <span style={{ color: 'hsl(217, 91%, 60%)' }}>{username}@akibos</span>
        <span style={{ color: 'hsl(210, 20%, 50%)' }}>:</span>
        <span style={{ color: 'hsl(260, 80%, 70%)' }}>{cwd === homePath ? '~' : cwd}</span>
        <span style={{ color: 'hsl(210, 20%, 50%)' }}>$ </span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none caret-green-400"
          style={{ color: 'hsl(120, 50%, 75%)' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

export default AppTerminal;
