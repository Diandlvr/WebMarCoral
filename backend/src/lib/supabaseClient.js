import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config(); // carga backend/.env

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("ENV check:", { urlPresent: !!url, keyPresent: !!key }); // temporal

export const supabase = createClient(url, key);
