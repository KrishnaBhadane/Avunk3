import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dybbxcroiddabjbhqjzs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Vzd-F4fEVr9TtV-q7L9S7g_qQD8IoDz';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
