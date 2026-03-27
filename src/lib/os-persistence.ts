// Backend persistence layer — syncs OS data to Supabase
import { supabase } from '@/integrations/supabase/client';
import { accountKey, accountDataKey } from '@/lib/session-context';

const DEBOUNCE_MS = 2000;
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

let supabaseAvailable = true;

export async function loadOsData(key: string): Promise<any | null> {
  if (!supabaseAvailable) return null;
  
  const scopedKey = accountDataKey(key);
  try {
    const { data, error } = await supabase
      .from('os_data')
      .select('data')
      .eq('id', scopedKey)
      .maybeSingle();
    if (error) { 
      console.warn('loadOsData error:', error);
      supabaseAvailable = false;
      return null; 
    }
    return data?.data ?? null;
  } catch (e) {
    console.warn('loadOsData failed:', e);
    supabaseAvailable = false;
    return null;
  }
}

export function saveOsData(key: string, value: any) {
  const scopedKey = accountDataKey(key);
  const localKey = accountKey(key);
  localStorage.setItem(localKey, JSON.stringify(value));

  if (!supabaseAvailable) return;

  if (debounceTimers[scopedKey]) clearTimeout(debounceTimers[scopedKey]);
  debounceTimers[scopedKey] = setTimeout(async () => {
    try {
      const { error } = await supabase
        .from('os_data')
        .upsert({ id: scopedKey, data: value }, { onConflict: 'id' });
      if (error) {
        console.warn('saveOsData error:', error);
        supabaseAvailable = false;
      }
    } catch (e) {
      console.warn('saveOsData failed:', e);
      supabaseAvailable = false;
    }
  }, DEBOUNCE_MS);
}

// Load from backend, falling back to localStorage
export async function loadOrFallback(key: string, fallback: any): Promise<any> {
  const localKey = accountKey(key);
  
  try {
    const remote = await loadOsData(key);
    if (remote && typeof remote === 'object') {
      localStorage.setItem(localKey, JSON.stringify(remote));
      return remote;
    }
  } catch (e) {
    console.warn('loadOrFallback backend failed, using localStorage:', e);
  }
  
  const local = localStorage.getItem(localKey);
  if (local) {
    try { return JSON.parse(local); } catch {}
  }
  return fallback;
}
