import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";

  // CORS
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis." }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Content-Type": "application/json",
        },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://cineplages.vercel.app/reset-password",
      },
    });
    console.log("Erreur generateLink:", error);
    const link = data?.action_link || data?.properties?.action_link;

    if (error || !link) {
      console.error("Erreur Supabase:", error);
      console.log("Données Supabase:", data);
      return new Response(
        JSON.stringify({ error: error?.message || "Échec génération lien." }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Envoi via RESEND API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cineplages <noreply@cineplages.fr>",
        to: email,
        subject: "Réinitialisation de votre mot de passe",
        html: `
          <p>Bonjour,</p>
          <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
          <p><a href="${data.action_link}">Réinitialiser mon mot de passe</a></p>
          <p>Ce lien est valable 1 heure.</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      return new Response(
        JSON.stringify({ error: "Échec envoi email", details: errorText }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: e.message }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
