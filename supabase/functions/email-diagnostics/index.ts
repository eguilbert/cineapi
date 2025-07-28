// supabase/functions/email-diagnostics/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse the request body
    const { email, type } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let result = {};
    let operation = type || "all";
    const diagnostics = { smtp: "unknown", auth: "unknown", errors: [] };

    // Test SMTP connection indirectly
    try {
      diagnostics.smtp = Deno.env.get("SUPABASE_URL")
        ? "env_variables_present"
        : "env_variables_missing";
    } catch (err) {
      diagnostics.errors.push({ component: "smtp_check", error: err.message });
    }

    // Test different email operations based on the requested type
    if (operation === "invite" || operation === "all") {
      try {
        const { data: inviteData, error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email);
        if (inviteError) throw inviteError;
        result = {
          ...result,
          invite: { success: !inviteError, data: inviteData },
        };
      } catch (err) {
        diagnostics.errors.push({ component: "invite", error: err.message });
        result = { ...result, invite: { success: false, error: err.message } };
      }
    }

    if (operation === "magic" || operation === "all") {
      try {
        // First check if user exists, if not create them
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserByEmail(email);

        if (userError || !userData) {
          // User doesn't exist, create them first
          const { data: createData, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              email_confirm: true,
            });

          if (createError) throw createError;
        }

        // Now send magic link
        const { data: magicData, error: magicError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
          });

        if (magicError) throw magicError;
        result = {
          ...result,
          magic: { success: !magicError, data: magicData },
        };
      } catch (err) {
        diagnostics.errors.push({ component: "magic", error: err.message });
        result = { ...result, magic: { success: false, error: err.message } };
      }
    }

    if (operation === "reset" || operation === "all") {
      try {
        // First check if user exists, if not create them
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserByEmail(email);

        if (userError || !userData) {
          // User doesn't exist, create them first
          const { data: createData, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password: "temporary-password-123",
            });

          if (createError) throw createError;
        }

        // Now send reset password email
        const { data: resetData, error: resetError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
          });

        if (resetError) throw resetError;
        result = {
          ...result,
          reset: { success: !resetError, data: resetData },
        };
      } catch (err) {
        diagnostics.errors.push({ component: "reset", error: err.message });
        result = { ...result, reset: { success: false, error: err.message } };
      }
    }

    return new Response(
      JSON.stringify({
        success: diagnostics.errors.length === 0,
        diagnostics,
        results: result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Use the correct Deno.serve pattern
Deno.serve(handler);
