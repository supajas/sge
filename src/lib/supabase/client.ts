import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gbswehuxwvbfnutkliko.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_IoUD765ga1xW5x-qvMQw0g_G7HTy7Mx";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
