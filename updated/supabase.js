require("dotenv").config();

const { createClient } =
require("@supabase/supabase-js");

const supabaseUrl =
process.env.SUPABASE_URL;

const supabaseAnonKey =
process.env.SUPABASE_ANON_KEY;

if(
!supabaseUrl ||
!supabaseAnonKey
){

throw new Error(
"Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_ANON_KEY in.env"
);

}

const supabase =
createClient(
supabaseUrl,
supabaseAnonKey
);

module.exports =
supabase;