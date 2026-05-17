import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://qegwzjdxogbuctlyitbu.supabase.co';
const supabaseKey = 'sb_publishable_WhPfeSbDI3Nr3o9yw0BpPQ_HGOiVN9T';
export const supabase = createClient(supabaseUrl, supabaseKey);
