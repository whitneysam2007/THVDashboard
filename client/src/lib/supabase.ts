import { createClient } from '@supabase/supabase-js';

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!projectUrl || !publishableKey) {
  throw new Error('Supabase browser configuration is missing.');
}

export const supabase = createClient(projectUrl, publishableKey);
