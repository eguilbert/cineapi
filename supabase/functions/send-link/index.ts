import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";

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
    const { email, type } = await req.json();

    if (!email || !["invite", "recovery"].includes(type)) {
      return new Response(JSON.stringify({ error: "Paramètres invalides." }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": origin },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const redirectMap = {
      invite: "https://cineplages.vercel.app/welcome",
      recovery: "https://cineplages.vercel.app/reset-password", // 👈 modifié
    };

    console.log("Redirect to:", redirectMap[type]);

    const { data, error } = await supabase.auth.admin.generateLink({
      type,
      email,
      options: {
        redirectTo: redirectMap[type as "invite" | "recovery"],
      },
    });
    console.log(
      "Lien généré :",
      data?.action_link || data?.properties?.action_link
    );

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
    const subject =
      type === "invite"
        ? "Vous êtes invité à rejoindre Cineplages"
        : "Réinitialisation de votre mot de passe";

    const buttonLabel =
      type === "invite" ? "Créer mon compte" : "Réinitialiser mon mot de passe";

    const emailHTML = generateHtmlEmail({
      actionLink: link,
      buttonLabel,
      type,
    });

    // Envoi via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cineplages <noreply@jalons.com>",
        to: email,
        subject,
        html: emailHTML,
      }),
    });

    if (!resendResponse.ok) {
      const details = await resendResponse.text();
      return new Response(
        JSON.stringify({ error: "Échec envoi email", details }),
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": origin },
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
        headers: { "Access-Control-Allow-Origin": origin },
      }
    );
  }
});

// 💌 Template HTML
function generateHtmlEmail({
  actionLink,
  buttonLabel,
  type,
}: {
  actionLink: string;
  buttonLabel: string;
  type: string;
}) {
  const intro =
    type === "invite"
      ? "Vous avez été invité à rejoindre la plateforme Cineplages."
      : "Vous avez demandé à réinitialiser votre mot de passe.";

  return `
  <table style="font-family: sans-serif; background: #f8f8f8; padding: 20px; width: 100%;">
    <tr>
      <td style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #333;">Bonjour 👋</h2>
        <p style="font-size: 16px; color: #555;">
          ${intro}
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${actionLink}" style="background: #007bff; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none;">
            ${buttonLabel}
          </a>
        </p>
        <p style="font-size: 14px; color: #888;">
          Ce lien est valable 1 heure. Si vous n’êtes pas à l’origine de cette action, vous pouvez ignorer cet email.
        </p>
        <hr style="margin: 40px 0;" />
        <p style="font-size: 12px; color: #aaa; text-align: center;">
          © 2025 Cineplages – Ne pas répondre à cet email.
        </p>
      </td>
    </tr>
  </table>
  `;
}
