import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

// Create Supabase client singleton
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Test if the Supabase connection is healthy and tables are reachable.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { connected: false, tablesReady: false, error: 'Supabase credentials not configured' };
  }

  try {
    // Try querying transactions
    const { error } = await supabase.from('transactions').select('id').limit(1);

    if (error) {
      // If table doesn't exist yet (relation "transactions" does not exist)
      if (error.code === '42P01' || error.message.includes('relation "public.transactions" does not exist')) {
        return {
          connected: true,
          tablesReady: false,
          error: 'Connected to Supabase, but schema tables are not created yet. Please execute supabase/schema.sql in Supabase SQL editor.',
        };
      }
      return { connected: true, tablesReady: false, error: error.message };
    }

    return { connected: true, tablesReady: true };
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      error: err?.message || 'Network error reaching Supabase',
    };
  }
}

