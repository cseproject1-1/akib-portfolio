// Virtual Cookie Jar — per-account cookie storage
// Cookies are stored in localStorage scoped by account, so akib and guest
// never see each other's browser cookies.

import { accountKey, getCurrentAccount } from './session-context';

interface CookieEntry {
  value: string;
  expires?: number; // epoch ms
  path?: string;
  secure?: boolean;
}

type DomainCookies = Record<string, CookieEntry>;
type AllCookies = Record<string, DomainCookies>;

function getStorageKey(): string {
  return accountKey('cookies');
}

function load(): AllCookies {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return {};
    const parsed: AllCookies = JSON.parse(raw);
    return parsed;
  } catch {
    return {};
  }
}

function save(cookies: AllCookies) {
  localStorage.setItem(getStorageKey(), JSON.stringify(cookies));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Get all cookies for a domain (as a "name=value; ..." string) */
export function getCookiesForUrl(url: string): string {
  const domain = getDomain(url);
  const all = load();
  const parts: string[] = [];

  // Exact domain match
  const domainCookies = all[domain];
  if (domainCookies) {
    const now = Date.now();
    for (const [name, entry] of Object.entries(domainCookies)) {
      if (entry.expires && entry.expires < now) continue; // expired
      parts.push(`${name}=${entry.value}`);
    }
  }

  // Also include parent domain cookies (e.g. .example.com for sub.example.com)
  for (const [cookieDomain, cookies] of Object.entries(all)) {
    if (cookieDomain === domain) continue;
    if (cookieDomain.startsWith('.') && domain.endsWith(cookieDomain)) {
      const now = Date.now();
      for (const [name, entry] of Object.entries(cookies)) {
        if (entry.expires && entry.expires < now) continue;
        parts.push(`${name}=${entry.value}`);
      }
    }
  }

  return parts.join('; ');
}

/** Parse a Set-Cookie header value and store it */
export function setCookieFromHeader(url: string, cookieHeader: string) {
  const domain = getDomain(url);
  const all = load();
  if (!all[domain]) all[domain] = {};

  // Parse: "name=value; Expires=...; Path=...; Secure; HttpOnly"
  const parts = cookieHeader.split(';').map(p => p.trim());
  const mainPair = parts[0];
  const eqIdx = mainPair.indexOf('=');
  if (eqIdx < 0) return;

  const name = mainPair.substring(0, eqIdx).trim();
  const value = mainPair.substring(eqIdx + 1).trim();

  const entry: CookieEntry = { value };

  for (let i = 1; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (lower.startsWith('expires=')) {
      const dateStr = parts[i].substring(8);
      const ts = Date.parse(dateStr);
      if (!isNaN(ts)) entry.expires = ts;
    } else if (lower.startsWith('max-age=')) {
      const secs = parseInt(parts[i].substring(8));
      if (!isNaN(secs)) entry.expires = Date.now() + secs * 1000;
    } else if (lower.startsWith('path=')) {
      entry.path = parts[i].substring(5);
    } else if (lower === 'secure') {
      entry.secure = true;
    }
    // Skip HttpOnly, SameSite — not relevant for our virtual jar
  }

  all[domain][name] = entry;
  save(all);
}

/** Set a cookie directly */
export function setCookie(url: string, name: string, value: string, opts?: { expires?: number; path?: string; secure?: boolean }) {
  const domain = getDomain(url);
  const all = load();
  if (!all[domain]) all[domain] = {};
  all[domain][name] = { value, ...opts };
  save(all);
}

/** Delete a specific cookie */
export function deleteCookie(url: string, name: string) {
  const domain = getDomain(url);
  const all = load();
  if (all[domain]) {
    delete all[domain][name];
    if (Object.keys(all[domain]).length === 0) delete all[domain];
    save(all);
  }
}

/** Clear all cookies for the current account */
export function clearAccountCookies() {
  localStorage.removeItem(getStorageKey());
}

/** Get all cookie domains for the current account (for debugging) */
export function getCookieDomains(): string[] {
  return Object.keys(load());
}

/** Expire and clean up stale cookies */
export function pruneExpiredCookies() {
  const all = load();
  const now = Date.now();
  let changed = false;

  for (const domain of Object.keys(all)) {
    for (const [name, entry] of Object.entries(all[domain])) {
      if (entry.expires && entry.expires < now) {
        delete all[domain][name];
        changed = true;
      }
    }
    if (Object.keys(all[domain]).length === 0) {
      delete all[domain];
      changed = true;
    }
  }

  if (changed) save(all);
}

// Track cookie names injected into the real browser (srcDoc iframes share origin)
const INJECTED_NAMES_KEY = 'akibos-injected-cookie-names';

function getInjectedNames(): string[] {
  try { return JSON.parse(localStorage.getItem(INJECTED_NAMES_KEY) || '[]'); } catch { return []; }
}

function saveInjectedNames(names: string[]) {
  localStorage.setItem(INJECTED_NAMES_KEY, JSON.stringify(names));
}

/** Clear real browser cookies that were injected by the virtual jar (same-origin only) */
export function clearInjectedBrowserCookies() {
  const names = getInjectedNames();
  for (const name of names) {
    // Clear for various paths
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${location.hostname}`;
    if (location.hostname.includes('.')) {
      const rootDomain = '.' + location.hostname.split('.').slice(-2).join('.');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${rootDomain}`;
    }
  }
  saveInjectedNames([]);
}

/** Track that we injected these cookie names into the browser */
export function trackInjectedNames(cookieString: string) {
  const names = cookieString.split(';').map(p => p.trim().split('=')[0]).filter(Boolean);
  const existing = getInjectedNames();
  const merged = [...new Set([...existing, ...names])];
  saveInjectedNames(merged);
}

/** Full cleanup: clear virtual jar + real browser injected cookies */
export function fullCookieCleanup() {
  clearInjectedBrowserCookies();
  clearAccountCookies();
}
