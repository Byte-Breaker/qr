// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vcfqbzbisvsgbioobtxd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZnFiemJpc3ZzZ2Jpb29idHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjU5MjIsImV4cCI6MjA2MjcwMTkyMn0.aUtt-CJHozXR3Eg9eHBAYjmm3SDY_aaTT2jq3ko5qxo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);