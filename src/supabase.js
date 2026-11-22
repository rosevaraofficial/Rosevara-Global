
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://myjpkaulrtgynzmxyxqc.supabase.co";

const supabaseKey = "sb_publishable_7Ahv_Hk9st4yicv5HV7EQQ_CT6oraJZ";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
