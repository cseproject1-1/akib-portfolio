import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Star, ExternalLink, AlertTriangle, Shield, ShieldOff, Home, Plus, X, Search, BookmarkPlus, Bookmark } from 'lucide-react';
import { osApps } from '@/lib/os-apps';
import { supabase } from '@/integrations/supabase/client';
import { accountKey } from '@/lib/session-context';
import { getCookiesForUrl, setCookieFromHeader, fullCookieCleanup, trackInjectedNames } from '@/lib/cookie-jar';

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
}

interface AppBrowserProps {
  initialUrl?: string;
}

type SearchEngine = 'google' | 'duckduckgo';
const SEARCH_ENGINES: Record<SearchEngine, { name: string; url: string; searchUrl: string }> = {
  google: { name: 'Google', url: 'https://www.google.com', searchUrl: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com', searchUrl: 'https://duckduckgo.com/?q=' },
};
const getSearchEngineKey = () => accountKey('search-engine');
const getBookmarksKey = () => accountKey('browser-bookmarks');

let tabCounter = 0;

const AppBrowser = ({ initialUrl }: AppBrowserProps) => {
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(() => {
    return (localStorage.getItem(getSearchEngineKey()) as SearchEngine) || 'duckduckgo';
  });
  const homepage = SEARCH_ENGINES[searchEngine].url;
  const effectiveInitial = initialUrl || homepage;

  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    tabCounter++;
    return [{ id: `tab-${tabCounter}`, url: effectiveInitial, title: 'Loading...', loading: true }];
  });
  const [activeTabId, setActiveTabId] = useState(`tab-${tabCounter}`);
  const [inputUrl, setInputUrl] = useState(effectiveInitial);
  const [history, setHistory] = useState<Record<string, { urls: string[]; index: number }>>({});
  const [proxyMode, setProxyMode] = useState(false);
  const [proxyHtml, setProxyHtml] = useState<string | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<{ url: string; title: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(getBookmarksKey()) || '[]'); } catch { return []; }
  });
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const tabHistory = history[activeTabId] || { urls: [activeTab?.url || homepage], index: 0 };

  const isKnownBlocked = (checkUrl: string) => {
    try {
      return osApps.some(app => app.iframeBlocked && app.url && checkUrl.includes(new URL(app.url).hostname));
    } catch { return false; }
  };

  const updateTab = (tabId: string, updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };

  const fetchViaProxy = useCallback(async (targetUrl: string) => {
    updateTab(activeTabId, { loading: true });
    setProxyError(null);
    setProxyHtml(null);
    try {
      const { data, error } = await supabase.functions.invoke('web-proxy', {
        body: { url: targetUrl },
      });
      if (error) throw error;
      if (typeof data === 'string') {
        // Inject virtual cookies into the HTML before rendering
        const virtualCookies = getCookiesForUrl(targetUrl);
        let html = data;
        if (virtualCookies) {
          // Clear any previously injected cookies first, then set new ones
          const clearScript = `<script>document.cookie.split(';').forEach(function(c){document.cookie=c.trim().split('=')[0]+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';});</script>`;
          const cookieScript = `<script>document.cookie=${JSON.stringify(virtualCookies)};</script>`;
          const injectBlock = clearScript + cookieScript;
          trackInjectedNames(virtualCookies);
          if (html.includes('<head>')) {
            html = html.replace('<head>', '<head>' + injectBlock);
          } else if (html.includes('<html>')) {
            html = html.replace('<html>', '<html>' + injectBlock);
          } else {
            html = injectBlock + html;
          }
        }
        // Inject a script to capture cookies set by the page
        const captureScript = `<script>(function(){
          try {
            var orig=document.cookie;
            setInterval(function(){
              var c=document.cookie;
              if(c!==orig){orig=c;window.__akibos_cookies=c;}
            },500);
          }catch(e){}
        })();</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', captureScript + '</body>');
        } else {
          html += captureScript;
        }
        setProxyHtml(html);
        // Try to extract title
        const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) updateTab(activeTabId, { title: titleMatch[1].trim() });
      } else if (data?.error) {
        setProxyError(data.error);
      } else {
        setProxyHtml(typeof data === 'object' ? JSON.stringify(data) : String(data));
      }
    } catch (err: any) {
      setProxyError(err.message || 'Proxy request failed');
    } finally {
      updateTab(activeTabId, { loading: false });
    }
  }, [activeTabId]);

  const loadUrl = useCallback((targetUrl: string, tabId?: string) => {
    const tid = tabId || activeTabId;
    setProxyHtml(null);
    setProxyError(null);

    if (proxyMode) {
      fetchViaProxy(targetUrl);
    } else {
      updateTab(tid, { loading: true, url: targetUrl });
    }
  }, [proxyMode, fetchViaProxy, activeTabId]);

  const navigate = (newUrl: string) => {
    let finalUrl = newUrl.trim();

    // Search query detection
    if (!finalUrl.includes('.') && !finalUrl.startsWith('http')) {
      finalUrl = SEARCH_ENGINES[searchEngine].searchUrl + encodeURIComponent(finalUrl);
    } else if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }

    updateTab(activeTabId, { url: finalUrl, title: 'Loading...' });
    setInputUrl(finalUrl);

    // Update history
    const h = tabHistory;
    const newUrls = [...h.urls.slice(0, h.index + 1), finalUrl];
    setHistory(prev => ({ ...prev, [activeTabId]: { urls: newUrls, index: newUrls.length - 1 } }));

    loadUrl(finalUrl);
  };

  const goBack = () => {
    const h = tabHistory;
    if (h.index > 0) {
      const newIndex = h.index - 1;
      const url = h.urls[newIndex];
      setHistory(prev => ({ ...prev, [activeTabId]: { ...h, index: newIndex } }));
      updateTab(activeTabId, { url, title: 'Loading...' });
      setInputUrl(url);
      loadUrl(url);
    }
  };

  const goForward = () => {
    const h = tabHistory;
    if (h.index < h.urls.length - 1) {
      const newIndex = h.index + 1;
      const url = h.urls[newIndex];
      setHistory(prev => ({ ...prev, [activeTabId]: { ...h, index: newIndex } }));
      updateTab(activeTabId, { url, title: 'Loading...' });
      setInputUrl(url);
      loadUrl(url);
    }
  };

  const goHome = () => navigate(homepage);
  const refresh = () => loadUrl(activeTab?.url || homepage);

  const addTab = () => {
    tabCounter++;
    const newTab: BrowserTab = { id: `tab-${tabCounter}`, url: homepage, title: 'New Tab', loading: true };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setInputUrl(homepage);
    setHistory(prev => ({ ...prev, [newTab.id]: { urls: [homepage], index: 0 } }));
    loadUrl(homepage, newTab.id);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
    setHistory(prev => { const h = { ...prev }; delete h[tabId]; return h; });
  };

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) setInputUrl(tab.url);
  };

  const toggleBookmark = () => {
    const url = activeTab?.url || '';
    const title = activeTab?.title || url;
    const existing = bookmarks.findIndex(b => b.url === url);
    let newBookmarks: { url: string; title: string }[];
    if (existing >= 0) {
      newBookmarks = bookmarks.filter((_, i) => i !== existing);
    } else {
      newBookmarks = [...bookmarks, { url, title }];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem(getBookmarksKey(), JSON.stringify(newBookmarks));
  };

  const isBookmarked = bookmarks.some(b => b.url === activeTab?.url);

  useEffect(() => {
    if (activeTab) setInputUrl(activeTab.url);
  }, [activeTabId]);

  // Initial load
  useEffect(() => {
    const tid = tabs[0]?.id;
    if (tid) {
      setHistory({ [tid]: { urls: [effectiveInitial], index: 0 } });
      loadUrl(effectiveInitial, tid);
    }
  }, [initialUrl]);

  // Re-load on proxy toggle
  useEffect(() => {
    if (activeTab) loadUrl(activeTab.url);
  }, [proxyMode]);

  const blocked = !proxyMode && isKnownBlocked(activeTab?.url || '');
  const matchedApp = osApps.find(app => {
    try { return app.url && activeTab?.url.includes(new URL(app.url).hostname); }
    catch { return false; }
  });

  const showBlockedFallback = blocked && !proxyMode;
  const showProxyError = proxyMode && proxyError;
  const showIframe = !showBlockedFallback && !showProxyError && (!proxyMode || proxyHtml);

  const iframeSrc = proxyMode ? undefined : activeTab?.url;
  const iframeSrcDoc = proxyMode && proxyHtml ? proxyHtml : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center bg-os-window-chrome border-b border-os-panel-border min-h-[28px]">
        <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1 text-[11px] cursor-pointer border-r border-os-panel-border max-w-[160px] min-w-[80px] transition-colors ${
                tab.id === activeTabId ? 'bg-os-window-body text-os-window-body-foreground' : 'text-os-window-chrome-foreground/60 hover:bg-white/5'
              }`}
            >
              {tab.loading && <div className="w-2.5 h-2.5 border border-os-accent border-t-transparent rounded-full animate-spin shrink-0" />}
              <span className="truncate flex-1">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 shrink-0 transition-opacity"
                >
                  <X size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addTab} className="w-7 h-7 flex items-center justify-center text-os-window-chrome-foreground/50 hover:bg-white/10 transition-colors shrink-0">
          <Plus size={13} />
        </button>
      </div>

      {/* Navigation toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-os-window-chrome border-b border-os-panel-border">
        <button onClick={goBack} disabled={tabHistory.index <= 0} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">
          <ArrowLeft size={14} className="text-os-window-chrome-foreground" />
        </button>
        <button onClick={goForward} disabled={tabHistory.index >= tabHistory.urls.length - 1} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">
          <ArrowRight size={14} className="text-os-window-chrome-foreground" />
        </button>
        <button onClick={refresh} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors">
          <RotateCw size={14} className={`text-os-window-chrome-foreground ${activeTab?.loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={goHome} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors">
          <Home size={14} className="text-os-window-chrome-foreground" />
        </button>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs" style={{ background: 'hsl(220, 20%, 10%)' }}>
          {proxyMode ? (
            <Shield size={11} className="text-os-accent shrink-0" />
          ) : (
            <Lock size={11} style={{ color: 'hsl(142, 71%, 45%)' }} className="shrink-0" />
          )}
          <input
            className="flex-1 bg-transparent text-os-window-chrome-foreground outline-none text-xs"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') navigate(inputUrl); }}
            placeholder="Search or enter URL"
          />
          {inputUrl && (
            <button onClick={() => setInputUrl('')} className="text-os-window-chrome-foreground/30 hover:text-os-window-chrome-foreground/60">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Bookmark */}
        <button onClick={toggleBookmark} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors" title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
          {isBookmarked ? (
            <Bookmark size={14} className="text-os-accent" fill="currentColor" />
          ) : (
            <BookmarkPlus size={14} className="text-os-window-chrome-foreground/60" />
          )}
        </button>

        {/* Proxy toggle */}
        <button
          onClick={() => setProxyMode(!proxyMode)}
          title={proxyMode ? 'Proxy ON — bypasses frame restrictions' : 'Proxy OFF — direct loading'}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${proxyMode ? 'bg-os-accent/20 hover:bg-os-accent/30' : 'hover:bg-white/10'}`}
        >
          {proxyMode ? <Shield size={14} className="text-os-accent" /> : <ShieldOff size={14} className="text-os-window-chrome-foreground/50" />}
        </button>

        {/* Search engine selector */}
        <select
          value={searchEngine}
          onChange={(e) => {
            const eng = e.target.value as SearchEngine;
            setSearchEngine(eng);
            localStorage.setItem(getSearchEngineKey(), eng);
          }}
          className="h-7 px-1 rounded text-[10px] bg-transparent text-os-window-chrome-foreground border border-os-panel-border outline-none cursor-pointer hover:bg-white/10"
          title="Search engine"
        >
          {Object.entries(SEARCH_ENGINES).map(([key, val]) => (
            <option key={key} value={key} className="bg-os-window-chrome text-os-window-chrome-foreground">{val.name}</option>
          ))}
        </select>
      </div>

      {/* Bookmarks bar */}
      {bookmarks.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-os-window-chrome/50 border-b border-os-panel-border overflow-x-auto scrollbar-hide">
          {bookmarks.map((bm, i) => (
            <button
              key={i}
              onClick={() => navigate(bm.url)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-os-window-chrome-foreground/60 hover:bg-white/10 hover:text-os-window-chrome-foreground transition-colors whitespace-nowrap shrink-0"
            >
              <Bookmark size={9} />
              {bm.title.substring(0, 20)}
            </button>
          ))}
        </div>
      )}

      {/* Proxy indicator */}
      {proxyMode && (
        <div className="flex items-center gap-2 px-3 py-1 text-[10px] bg-os-accent/10 text-os-accent border-b border-os-panel-border">
          <Shield size={10} />
          <span>Proxy mode — JS-heavy sites may not work. </span>
          <button onClick={() => window.open(activeTab?.url || '', '_blank')} className="ml-auto flex items-center gap-1 hover:underline">
            <ExternalLink size={10} /> Open directly
          </button>
        </div>
      )}

      {/* Loading bar */}
      {activeTab?.loading && (
        <div className="h-0.5 w-full overflow-hidden" style={{ background: 'hsl(220, 20%, 15%)' }}>
          <div className="h-full animate-pulse" style={{ width: '60%', background: 'hsl(217, 91%, 60%)' }} />
        </div>
      )}

      {/* Content */}
      {showProxyError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-os-window-body">
          <AlertTriangle size={40} className="text-os-accent" />
          <h2 className="text-base font-semibold text-os-window-body-foreground">Failed to load page</h2>
          <p className="text-xs text-os-window-body-foreground/60 text-center max-w-sm">{proxyError}</p>
          <div className="flex gap-2">
            <button onClick={() => window.open(activeTab?.url || '', '_blank')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-os-accent text-white hover:bg-os-accent/80 transition-colors">
              <ExternalLink size={14} /> Open in New Tab
            </button>
            <button onClick={() => setProxyMode(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-os-panel-border text-os-window-body-foreground hover:bg-white/5 transition-colors">
              <ShieldOff size={14} /> Direct Mode
            </button>
          </div>
        </div>
      )}

      {showBlockedFallback && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-os-window-body">
          <div className="flex flex-col items-center gap-4">
            {matchedApp?.iconImage ? (
              <img src={matchedApp.iconImage} alt={matchedApp.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: matchedApp?.iconBg || 'hsl(220, 20%, 20%)' }}>
                <AlertTriangle size={32} className="text-os-accent" />
              </div>
            )}
            <h2 className="text-lg font-semibold text-os-window-body-foreground">{matchedApp?.name || 'Website'}</h2>
            <p className="text-sm text-os-window-body-foreground/60 text-center max-w-xs">This site blocks iframe embedding.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setProxyMode(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-os-accent text-white hover:bg-os-accent/80 transition-colors">
              <Shield size={16} /> Enable Proxy
            </button>
            <button onClick={() => window.open(activeTab?.url || '', '_blank')} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-os-panel-border text-os-window-body-foreground hover:bg-white/5 transition-colors">
              <ExternalLink size={16} /> Open in New Tab
            </button>
          </div>
        </div>
      )}

      {showIframe && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          srcDoc={iframeSrcDoc}
          className="flex-1 w-full border-0 bg-white"
          onLoad={() => {
            updateTab(activeTabId, { loading: false });
            // Capture cookies from proxy-mode iframe
            if (proxyMode && iframeRef.current) {
              try {
                const iframeDoc = iframeRef.current.contentDocument;
                if (iframeDoc) {
                  const cookies = iframeDoc.cookie;
                  if (cookies) {
                    // Parse and store each cookie in the virtual jar
                    const pairs = cookies.split(';').map(p => p.trim());
                    for (const pair of pairs) {
                      const eqIdx = pair.indexOf('=');
                      if (eqIdx > 0) {
                        const name = pair.substring(0, eqIdx).trim();
                        const value = pair.substring(eqIdx + 1).trim();
                        setCookieFromHeader(activeTab?.url || '', `${name}=${value}`);
                      }
                    }
                  }
                  // Also check for captured cookies from the polling script
                  try {
                    const win = iframeRef.current.contentWindow as Window & { __akibos_cookies?: string };
                    const captured = win?.__akibos_cookies;
                    if (captured && captured !== cookies) {
                      const pairs2 = captured.split(';').map((p: string) => p.trim());
                      for (const pair of pairs2) {
                        const eqIdx = pair.indexOf('=');
                        if (eqIdx > 0) {
                          const name = pair.substring(0, eqIdx).trim();
                          const value = pair.substring(eqIdx + 1).trim();
                          setCookieFromHeader(activeTab?.url || '', `${name}=${value}`);
                        }
                      }
                    }
                  } catch { /* cross-origin */ }
                }
              } catch {
                // Cross-origin — can't access iframe doc
              }
            }
            // Try to get title from iframe
            try {
              const title = iframeRef.current?.contentDocument?.title;
              if (title) updateTab(activeTabId, { title });
            } catch {
              // Cross-origin — use URL as title
              try {
                const hostname = new URL(activeTab?.url || '').hostname;
                updateTab(activeTabId, { title: hostname });
              } catch { /* invalid url */ }
            }
          }}
          onError={() => updateTab(activeTabId, { loading: false, title: 'Error' })}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          title="Browser"
        />
      )}
    </div>
  );
};

export default AppBrowser;
