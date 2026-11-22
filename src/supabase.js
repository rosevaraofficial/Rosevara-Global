import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://myjpkaulrtgynzmxyxqc.supabase.co";

const supabaseKey = "YAHAN_APNI_PUBLISHABLE_KEY_PASTE_KAREIN";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
