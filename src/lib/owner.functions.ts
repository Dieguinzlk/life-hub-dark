import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One-time owner setup: only the account whose verified email matches the server-only
 * OWNER_EMAIL secret can claim ownership, and only while no owner exists. */
export const claimOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const owner = process.env["OWNER_EMAIL"]?.trim().toLowerCase();
    if (!owner) return { ok: false, message: "Proprietário ainda não configurado no servidor." };
    const { data, error } = await context.supabase.auth.getUser();
    const user = data.user;
    if (error || !user?.email || !user.email_confirmed_at)
      return { ok: false, message: "Confirme seu e-mail antes." };
    if (user.email.toLowerCase() !== owner) return { ok: false, message: "Conta não autorizada." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error: e2 } = await supabaseAdmin.rpc("bootstrap_owner", { _user_id: user.id });
    if (e2) return { ok: false, message: "Falha ao registrar proprietário." };
    return ok ? { ok: true, message: "Você é o proprietário." } : { ok: false, message: "Já existe um proprietário." };
  });
