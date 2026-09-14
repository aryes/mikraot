import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xpfkhxmcoslngazvtudb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '<SUPABASE_PUBLISHABLE_KEY in .env>';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CommentItem {
  id: number;
  page_slug: string;
  author_name: string;
  author_email?: string;
  content: string;
  is_admin_reply: boolean;
  approved: boolean;
  created_at: string;
}
