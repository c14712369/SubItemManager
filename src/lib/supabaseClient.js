import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://rfgrvrbghdzihcgvunbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CtZgegRojQQWZ0Ph3tGbyQ_6eB7Oixr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
