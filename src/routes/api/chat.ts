import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { handleChat } from "@/lib/ai.server";

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Only signed-in users may use the assistant; daily quota is enforced in the database
// (owner: unlimited, VIP and free: limits in consume_chat_quota).
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token || token.split(".").length !== 3)
          return new Response("Entre na sua conta para usar o assistente.", { status: 401 });
        const sb = userClient(token);
        const { data: u, error } = await sb.auth.getUser(token);
        if (error || !u.user)
          return new Response("Entre na sua conta para usar o assistente.", { status: 401 });
        const { data: quota, error: qErr } = await sb.rpc("consume_chat_quota");
        if (qErr)
          return Response.json({ error: "Não foi possível verificar seu limite de uso." }, { status: 503 });
        const q = quota as { allowed: boolean; plan: string; used: number; limit: number | null };
        if (!q.allowed)
          return Response.json(
            {
              code: "QUOTA_EXCEEDED",
              error: `Limite diário do plano ${q.plan === "vip" ? "VIP" : "gratuito"} atingido (${q.limit} mensagens). Tente amanhã.`,
            },
            { status: 429 },
          );
        return handleChat(request);
      },
    },
  },
});
