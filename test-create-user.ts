import { createClient } from "@supabase/supabase-js";
import path from "path";
import * as dotenv from "dotenv";
// Charge le bon .env en fonction de l’environnement
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: "test@user.com",
    password: "testpass123",
  });

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

main();
