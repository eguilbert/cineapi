import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

Deno.serve(async (req) => {
  const start = Date.now();
  console.log("📩 Invitation: Début de traitement");

  try {
    const { email, redirectTo } = await req.json();

    if (!email) {
      console.warn("⛔️ Aucun email fourni.");
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("🔐 Variables d'environnement manquantes");
      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const finalRedirect = redirectTo || "https://ton-site.fr/login";
    console.log(
      `👉 Invitation en cours pour ${email} avec redirect ${finalRedirect}`
    );

    // ⏱ Timeout à 8 secondes
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout Supabase")), 8000)
    );

    const invitePromise = supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: finalRedirect,
    });

    const { data, error } = (await Promise.race([
      invitePromise,
      timeoutPromise,
    ])) as Awaited<
      ReturnType<typeof supabaseAdmin.auth.admin.inviteUserByEmail>
    >;

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: {
            code: error.code,
            name: error.name,
            status: error.status,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Invitation envoyée avec succès");
    const duration = Date.now() - start;
    console.log(`⏱ Durée: ${duration} ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
        data,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("🔥 Erreur inattendue:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: err.message || err,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
