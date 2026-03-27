// Session context — tracks current user account (akib vs guest)
// All storage keys are namespaced by account to keep data separate.

export type AccountType = 'akib' | 'guest';

let currentAccount: AccountType = 'akib';

export function initAccount(): AccountType {
  const saved = sessionStorage.getItem('akibos-current-account') as AccountType;
  if (saved === 'akib' || saved === 'guest') {
    currentAccount = saved;
  } else {
    currentAccount = 'akib';
  }
  return currentAccount;
}

type SwitchHook = (oldAccount: AccountType, newAccount: AccountType) => void;
const switchHooks: SwitchHook[] = [];

export function setCurrentAccount(account: AccountType) {
  const old = currentAccount;
  // Fire hooks before switching so cleanup can use the old account context
  if (old !== account) {
    for (const hook of switchHooks) {
      try { hook(old, account); } catch (e) { console.warn('Account switch hook error:', e); }
    }
  }
  currentAccount = account;
  sessionStorage.setItem('akibos-current-account', account);
}

export function getCurrentAccount(): AccountType {
  return currentAccount;
}

/** Register a hook that fires before the account changes */
export function registerAccountSwitchHook(hook: SwitchHook) {
  switchHooks.push(hook);
  return () => {
    const idx = switchHooks.indexOf(hook);
    if (idx >= 0) switchHooks.splice(idx, 1);
  };
}

/** Returns a storage key namespaced by the current account */
export function accountKey(base: string): string {
  return `akibos-${currentAccount}-${base}`;
}

/** Returns a Supabase os_data key namespaced by account */
export function accountDataKey(base: string): string {
  return `${currentAccount}:${base}`;
}
