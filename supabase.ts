import { createClient } from '@supabase/supabase-js';

// Fallback to credentials provided by user if env variables are not present
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://yhjaxaoruvhlrowgorvx.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_bRh9YqJWwZnrVVRSNO6XLA_q1mKPude';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const PDF_STORAGE_BUCKET = 'pdf-uploads';
