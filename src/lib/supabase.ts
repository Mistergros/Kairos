import { createClient } from "@supabase/supabase-js";

// Client Supabase générique (URL/KEY via .env.local)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
