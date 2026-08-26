import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente único para o browser. RLS protege o que a equipe pode fazer.
export const supabase = createClient(url, anon, {
  realtime: { params: { eventsPerSecond: 10 } },
});
