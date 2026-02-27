// ====== js/supabase-config.js ======
// Replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://rfgrvrbghdzihcgvunbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CtZgegRojQQWZ0Ph3tGbyQ_6eB7Oixr';

// Initialize the Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
