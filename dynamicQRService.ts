import { supabase } from './supabase';
import { SavedDynamicQR, QRConfig } from './types';

const PUBLIC_REGISTRY_KEY = 'qr_public_registry';

/**
 * Get permanent redirect URL for a dynamic QR code ID
 */
export function getDynamicRedirectUrl(dynamicId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  // Permanent URL with query parameter '?r='
  return `${origin}${pathname}?r=${encodeURIComponent(dynamicId)}`;
}

/**
 * Save or update a dynamic QR code in Supabase Database
 */
export async function saveDynamicQRRecord(
  record: SavedDynamicQR,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const dynId = record.id;
  const now = new Date().toISOString();

  // 1. Save to User's local list for instant access
  if (userId) {
    try {
      const userKey = `qr_dynamic_codes_${userId}`;
      const existingStr = localStorage.getItem(userKey);
      let list: SavedDynamicQR[] = existingStr ? JSON.parse(existingStr) : [];
      const idx = list.findIndex((item) => item.id === dynId);
      if (idx >= 0) {
        list[idx] = { ...record, updatedAt: now };
      } else {
        list = [{ ...record, updatedAt: now }, ...list];
      }
      localStorage.setItem(userKey, JSON.stringify(list));
    } catch (e) {
      console.warn('Local user list save notice:', e);
    }
  }

  // 2. Save to Public Local Registry Cache
  try {
    const regStr = localStorage.getItem(PUBLIC_REGISTRY_KEY);
    const registry: Record<string, SavedDynamicQR> = regStr ? JSON.parse(regStr) : {};
    registry[dynId] = {
      ...record,
      updatedAt: now,
    };
    localStorage.setItem(PUBLIC_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn('Local public registry save notice:', e);
  }

  // 3. Save to Supabase Database (Cloud-authoritative for external phone scanners)
  try {
    const supabasePayload = {
      id: dynId,
      user_id: userId || null,
      title: record.title || 'Dynamic QR',
      destination_url: record.destinationUrl,
      config: record.config || {},
      updated_at: now,
    };

    const { error } = await supabase
      .from('dynamic_qrcodes')
      .upsert(supabasePayload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase DB save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Supabase unexpected error:', err);
    return { success: false, error: err?.message || 'Database connection error' };
  }
}

/**
 * Fetch a dynamic QR record by its dynamic ID from Supabase Database
 */
export async function fetchDynamicQRRecord(
  dynamicId: string
): Promise<{ title: string; destinationUrl: string; updatedAt?: string } | null> {
  // 1. Primary: Fetch from Supabase Cloud Database
  try {
    const { data, error } = await supabase
      .from('dynamic_qrcodes')
      .select('id, title, destination_url, updated_at')
      .eq('id', dynamicId)
      .maybeSingle();

    if (!error && data && data.destination_url) {
      return {
        title: data.title || 'Dynamic QR Code',
        destinationUrl: data.destination_url,
        updatedAt: data.updated_at,
      };
    }
    if (error) {
      console.warn('Supabase fetch error:', error);
    }
  } catch (err) {
    console.warn('Supabase network lookup notice:', err);
  }

  // 2. Fallback: Local Public Registry Cache
  try {
    const regStr = localStorage.getItem(PUBLIC_REGISTRY_KEY);
    if (regStr) {
      const registry: Record<string, SavedDynamicQR> = JSON.parse(regStr);
      if (registry[dynamicId]) {
        const item = registry[dynamicId];
        return {
          title: item.title || 'Dynamic QR Code',
          destinationUrl: item.destinationUrl,
          updatedAt: item.updatedAt,
        };
      }
    }
  } catch (e) {
    console.warn('Local registry read notice:', e);
  }

  // 3. Fallback: Search all local storage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('qr_dynamic_codes_')) {
        const val = localStorage.getItem(key);
        if (val) {
          const list: SavedDynamicQR[] = JSON.parse(val);
          const found = list.find((item) => item.id === dynamicId);
          if (found) {
            return {
              title: found.title || 'Dynamic QR Code',
              destinationUrl: found.destinationUrl,
              updatedAt: found.updatedAt,
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn('Search user local lists notice:', e);
  }

  return null;
}

/**
 * Fetch all dynamic QR codes owned by a user from Supabase Database
 */
export async function fetchUserDynamicQRsFromSupabase(
  userId: string
): Promise<SavedDynamicQR[]> {
  try {
    const { data, error } = await supabase
      .from('dynamic_qrcodes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        title: d.title || 'Dynamic QR',
        destinationUrl: d.destination_url || '',
        config: d.config || {},
        createdAt: d.created_at || new Date().toISOString(),
        updatedAt: d.updated_at || new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.warn('Supabase fetch user QRs notice:', e);
  }

  return [];
}

/**
 * Delete dynamic QR code from Supabase and Local Storage
 */
export async function deleteDynamicQRRecord(
  dynamicId: string,
  userId?: string
): Promise<void> {
  // Remove from Supabase
  try {
    await supabase.from('dynamic_qrcodes').delete().eq('id', dynamicId);
  } catch (e) {
    console.warn('Supabase delete notice:', e);
  }

  // Remove from Local
  if (userId) {
    try {
      const userKey = `qr_dynamic_codes_${userId}`;
      const existingStr = localStorage.getItem(userKey);
      if (existingStr) {
        const list: SavedDynamicQR[] = JSON.parse(existingStr);
        const filtered = list.filter((item) => item.id !== dynamicId);
        localStorage.setItem(userKey, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Local delete notice:', e);
    }
  }
}
