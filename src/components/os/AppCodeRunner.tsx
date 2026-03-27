import { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, FilePlus, Trash2, FolderOpen, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { vfs } from '@/lib/virtual-fs';
import { getCurrentAccount } from '@/lib/session-context';

type Language = 'python' | 'c' | 'cpp';

interface Snippet {
  name: string;
  path: string;
  language: Language;
}

const LANG_CONFIG: Record<Language, { label: string; monaco: string; ext: string; embedId: string }> = {
  python: { label: 'Python', monaco: 'python', ext: '.py', embedId: 'python' },
  c: { label: 'C', monaco: 'c', ext: '.c', embedId: 'c' },
  cpp: { label: 'C++', monaco: 'cpp', ext: '.cpp', embedId: 'cpp' },
};

const DEFAULT_CODE: Record<Language, string> = {
  python: `# Python - Hello World\nprint("Hello, World!")\n`,
  c: `// C - Hello World\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
  cpp: `// C++ - Hello World\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
};

let pyodideInstance: any = null;
let pyodideLoading = false;
let pyodideReady = false;
let pyodideError: string | null = null;

const PYODIDE_VERSION = '0.24.1';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const loadPyodide = async (): Promise<any> => {
  if (pyodideError) throw new Error(pyodideError);
  if (pyodideReady && pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    while (!pyodideReady && !pyodideError) await new Promise((r) => setTimeout(r, 100));
    if (pyodideError) throw new Error(pyodideError);
    return pyodideInstance;
  }
  pyodideLoading = true;
  pyodideError = null;

  try {
    pyodideInstance = await (window as any).loadPyodide({
      indexURL: PYODIDE_BASE_URL,
    });
    pyodideReady = true;
    pyodideLoading = false;
    return pyodideInstance;
  } catch (err: any) {
    pyodideLoading = false;
    pyodideError = 'Failed to load Python runtime. Please check your internet connection and try again.';
    throw new Error(pyodideError);
  }
};

const AppCodeRunner = () => {
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(DEFAULT_CODE['python']);
  const [stdinValue, setStdinValue] = useState('');
  const [output, setOutput] = useState('');
  const [errorOutput, setErrorOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [pyodideLoaded, setPyodideLoaded] = useState(pyodideReady);
  const editorRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const codeDir = `/home/${getCurrentAccount()}/CodeRunner`;

  const ensureDir = useCallback(() => {
    try {
      vfs.stat(codeDir);
    } catch {
      vfs.mkdir(codeDir);
    }
  }, [codeDir]);

  const loadSnippets = useCallback(() => {
    ensureDir();
    try {
      const entries = vfs.ls(codeDir);
      const loaded: Snippet[] = [];
      for (const entry of entries) {
        if (entry.type === 'file') {
          const ext = '.' + entry.name.split('.').pop();
          let lang: Language | null = null;
          if (ext === '.py') lang = 'python';
          else if (ext === '.c') lang = 'c';
          else if (ext === '.cpp') lang = 'cpp';
          if (lang) {
            loaded.push({ name: entry.name, path: `${codeDir}/${entry.name}`, language: lang });
          }
        }
      }
      loaded.sort((a, b) => a.name.localeCompare(b.name));
      setSnippets(loaded);
    } catch {
      setSnippets([]);
    }
  }, [codeDir, ensureDir]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    setShowLangDropdown(false);
    setEmbedUrl(null);
    setOutput('');
    setErrorOutput('');
    setExecTime(null);
    setExitCode(null);
    if (!activeSnippet) {
      setCode(DEFAULT_CODE[lang]);
    }
  };

  const runPython = async () => {
    setIsRunning(true);
    setOutput('');
    setErrorOutput('');
    setExecTime(null);
    setExitCode(null);

    const start = performance.now();

    try {
      let pyodide = pyodideInstance;
      if (!pyodideReady) {
        setOutput('Loading Python runtime...\nPlease wait, downloading ~15MB on first run...');
        try {
          pyodide = await loadPyodide();
          setPyodideLoaded(true);
          setOutput('');
        } catch (loadErr: any) {
          setErrorOutput(loadErr.message || 'Failed to load Python runtime');
          setIsRunning(false);
          setExitCode(1);
          setExecTime(Math.round(performance.now() - start));
          return;
        }
      }

      if (stdinValue) {
        const lines = stdinValue.split('\n');
        let lineIndex = 0;
        pyodide.setStdin({ stdin: () => lines[lineIndex++] ?? '' });
      } else {
        pyodide.setStdin({ stdin: () => '' });
      }

      let capturedStdout = '';
      pyodide.setStdout({ batched: (msg: string) => { capturedStdout += msg + '\n'; } });

      let capturedStderr = '';
      pyodide.setStderr({ batched: (msg: string) => { capturedStderr += msg + '\n'; } });

      await pyodide.runPythonAsync(code);

      const elapsed = Math.round(performance.now() - start);
      setOutput(capturedStdout.trimEnd());
      setErrorOutput(capturedStderr.trimEnd());
      setExitCode(0);
      setExecTime(elapsed);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      const msg = err.message || String(err);
      const cleaned = msg.replace(/Error: File "<exec>", line \d+, in <module>\n\s*/, '');
      setErrorOutput(cleaned || msg);
      setExitCode(1);
      setExecTime(elapsed);
    }

    setIsRunning(false);
  };

  const runCppViaEmbed = () => {
    setOutput('');
    setErrorOutput('');
    setExecTime(null);
    setExitCode(null);

    const embedId = LANG_CONFIG[language].embedId;
    const encodedCode = encodeURIComponent(code);
    const url = `https://onecompiler.com/embed/${embedId}?code=${encodedCode}&theme=dark`;
    setEmbedUrl(url);
  };

  const runCode = async () => {
    if (language === 'python') {
      await runPython();
    } else {
      runCppViaEmbed();
    }
  };

  const saveSnippet = () => {
    if (!saveName.trim()) return;
    ensureDir();
    const ext = LANG_CONFIG[language].ext;
    let fileName = saveName.trim();
    if (!fileName.endsWith(ext)) fileName += ext;
    const path = `${codeDir}/${fileName}`;
    vfs.writeFile(path, code);
    const snippet: Snippet = { name: fileName, path, language };
    setActiveSnippet(snippet);
    setShowSaveDialog(false);
    setSaveName('');
    loadSnippets();
  };

  const openSnippet = (snippet: Snippet) => {
    const content = vfs.readFile(snippet.path);
    if (content !== null) {
      setCode(content);
      setLanguage(snippet.language);
      setActiveSnippet(snippet);
      setOutput('');
      setErrorOutput('');
      setExecTime(null);
      setExitCode(null);
      setEmbedUrl(null);
    }
  };

  const deleteSnippet = (snippet: Snippet, e: React.MouseEvent) => {
    e.stopPropagation();
    vfs.rm(snippet.path);
    if (activeSnippet?.path === snippet.path) {
      setActiveSnippet(null);
      setCode(DEFAULT_CODE[language]);
    }
    loadSnippets();
  };

  const newFile = () => {
    setActiveSnippet(null);
    setCode(DEFAULT_CODE[language]);
    setOutput('');
    setErrorOutput('');
    setExecTime(null);
    setExitCode(null);
    setEmbedUrl(null);
  };

  const retryLoadPyodide = () => {
    pyodideReady = false;
    pyodideLoading = false;
    pyodideError = null;
    pyodideInstance = null;
    setPyodideLoaded(false);
    setErrorOutput('');
    runCode();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isRunning) runCode();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (activeSnippet) {
        vfs.writeFile(activeSnippet.path, code);
      } else {
        setShowSaveDialog(true);
      }
    }
  };

  const isCpp = language === 'c' || language === 'cpp';

  return (
    <div className="flex h-full bg-os-window-body text-os-window-body-foreground" onKeyDown={handleKeyDown}>
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-48 border-r border-os-panel-border flex flex-col bg-os-window-chrome shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-os-panel-border">
            <span className="text-[10px] uppercase tracking-wider opacity-50">Snippets</span>
            <button onClick={newFile} className="opacity-50 hover:opacity-100" title="New">
              <FilePlus size={13} />
            </button>
          </div>
          <div className="flex-1 overflow-auto py-1">
            {snippets.length === 0 ? (
              <div className="px-3 py-4 text-[10px] opacity-30 text-center">No snippets saved</div>
            ) : (
              snippets.map((s) => (
                <div
                  key={s.path}
                  onClick={() => openSnippet(s)}
                  className={`flex items-center justify-between px-3 py-1.5 text-[11px] cursor-pointer hover:bg-white/5 ${activeSnippet?.path === s.path ? 'bg-white/10' : ''}`}
                >
                  <span className="truncate">{s.name}</span>
                  <button
                    onClick={(e) => deleteSnippet(s, e)}
                    className="opacity-30 hover:opacity-100 shrink-0 ml-1"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-os-panel-border bg-os-window-chrome">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="opacity-60 hover:opacity-100"
            title="Toggle sidebar"
          >
            <FolderOpen size={14} />
          </button>

          <div className="w-px h-4 bg-os-panel-border" />

          {/* Language selector */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-white/10"
            >
              {LANG_CONFIG[language].label}
              <ChevronDown size={11} />
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-os-window-chrome border border-os-panel-border rounded shadow-lg z-50 min-w-[100px]">
                {(Object.keys(LANG_CONFIG) as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => changeLanguage(lang)}
                    className={`block w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/10 ${lang === language ? 'text-os-accent' : ''}`}
                  >
                    {LANG_CONFIG[lang].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-os-panel-border" />

          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] opacity-70 hover:opacity-100 hover:bg-white/10"
            title="Save (Ctrl+S)"
          >
            <Save size={12} />
            Save
          </button>

          <div className="flex-1" />

          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] bg-green-600/80 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
            title={language === 'python' ? 'Run (Ctrl+Enter)' : 'Open in OneCompiler'}
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>

        {/* Editor */}
        <div className={isCpp && embedUrl ? 'h-[40%] min-h-[120px]' : 'flex-1 min-h-0'}>
          <Editor
            height="100%"
            language={LANG_CONFIG[language].monaco}
            value={code}
            onChange={(v) => setCode(v || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: language === 'python' ? 4 : 2,
              automaticLayout: true,
              padding: { top: 8 },
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
            }}
          />
        </div>

        {/* C/C++ Embed Output */}
        {isCpp && embedUrl && (
          <div className="flex-1 border-t border-os-panel-border flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-1 bg-os-window-chrome/50">
              <span className="text-[9px] uppercase tracking-wider opacity-40">OneCompiler</span>
              <div className="flex items-center gap-1 text-[9px] opacity-40">
                <AlertCircle size={10} />
                <span>Click Run in the embed to execute</span>
              </div>
            </div>
            <iframe
              src={embedUrl}
              className="flex-1 w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              title="OneCompiler"
            />
          </div>
        )}

        {/* Python Output (custom panel) */}
        {language === 'python' && (
          <>
            {/* Stdin */}
            <div className="border-t border-os-panel-border">
              <div className="flex items-center px-3 py-1 bg-os-window-chrome/50">
                <span className="text-[9px] uppercase tracking-wider opacity-40 mr-2">stdin</span>
              </div>
              <textarea
                value={stdinValue}
                onChange={(e) => setStdinValue(e.target.value)}
                placeholder="Input for your program..."
                className="w-full h-10 px-3 py-1 text-xs font-mono bg-transparent outline-none resize-none placeholder:opacity-30"
                spellCheck={false}
              />
            </div>

            {/* Output */}
            <div className="h-36 border-t border-os-panel-border flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 bg-os-window-chrome/50">
                <span className="text-[9px] uppercase tracking-wider opacity-40">Output</span>
                <div className="flex items-center gap-3 text-[9px] opacity-40">
                  {exitCode !== null && (
                    <span className={exitCode === 0 ? 'text-green-400' : 'text-red-400'}>
                      exit: {exitCode}
                    </span>
                  )}
                  {execTime !== null && <span>{execTime}ms</span>}
                </div>
              </div>
              <div className="flex-1 overflow-auto px-3 py-2">
                <pre className="text-[11px] font-mono whitespace-pre-wrap">
                  {!pyodideLoaded && !isRunning && !output && !errorOutput && (
                    <span className="opacity-20">Click Run to load Python runtime. First run downloads ~15MB (requires internet).</span>
                  )}
                  {output && <span className="text-os-window-body-foreground">{output}</span>}
                  {errorOutput && (
                    <div className="flex flex-col gap-2">
                      <span className="text-red-400">{errorOutput}</span>
                      {errorOutput.includes('Failed to load Python') && (
                        <button 
                          onClick={retryLoadPyodide}
                          className="text-xs px-3 py-1 rounded bg-os-accent/20 text-os-accent hover:bg-os-accent/30 w-fit"
                        >
                          Retry Loading Python
                        </button>
                      )}
                    </div>
                  )}
                </pre>
              </div>
            </div>
          </>
        )}

        {/* C/C++ placeholder when not run */}
        {isCpp && !embedUrl && (
          <div className="flex-1 border-t border-os-panel-border flex items-center justify-center">
            <div className="text-center opacity-20">
              <p className="text-xs">Click Run to open in OneCompiler embed</p>
              <p className="text-[10px] mt-1">Free server-side compilation via OneCompiler</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="rounded-lg p-4 w-80" style={{ background: 'hsl(220, 20%, 14%)', border: '1px solid hsl(220, 15%, 22%)' }}>
            <h3 className="text-sm font-semibold text-os-window-body-foreground mb-3">Save Snippet</h3>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded text-xs bg-black/30 text-os-window-body-foreground outline-none border border-os-panel-border"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={`filename${LANG_CONFIG[language].ext}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveSnippet();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowSaveDialog(false)} className="px-3 py-1.5 rounded text-xs text-os-window-body-foreground hover:bg-white/10">Cancel</button>
              <button onClick={saveSnippet} className="px-3 py-1.5 rounded text-xs bg-os-accent text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppCodeRunner;
