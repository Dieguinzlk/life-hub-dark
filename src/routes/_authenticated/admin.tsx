import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Card } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Área do proprietário — Gerenciador de Vida" },
      { name: "description", content: "Gerencie usuários e acessos VIP." },
      { property: "og:title", content: "Área do proprietário — Gerenciador de Vida" },
      { property: "og:description", content: "Gerencie usuários e acessos VIP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Row = {
  id: string;
  email: string;
  display_name: string;
  plan: string;
  vip_expires_at: string | null;
  vip_revoked_at: string | null;
  used_today: number;
};

function Admin() {
  const [days, setDays] = useState(30);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data as Row[];
    },
  });

  async function setVip(id: string, active: boolean) {
    const expires = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabase.rpc("set_vip", {
      _target: id,
      _expires_at: expires,
      _active: active,
    });
    if (error) toast.error(error.message);
    else toast.success(active ? "VIP ativado/renovado" : "VIP revogado");
    void refetch();
  }

  if (error)
    return (
      <Page title="Acesso restrito">
        <Card>
          <p className="text-sm text-muted-foreground">Somente o proprietário pode ver esta área.</p>
          <Link to="/ajustes" className="mt-3 inline-block text-primary underline">
            Voltar
          </Link>
        </Card>
      </Page>
    );

  return (
    <Page title="Área do proprietário" subtitle="Usuários e acessos VIP">
      <Card className="mb-4 flex items-center gap-2 text-sm">
        Duração do VIP:
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded-lg border bg-secondary px-2 py-1"
        />
        dias
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <div className="space-y-3">
        {data?.map((u) => (
          <Card key={u.id} className="space-y-2">
            <p className="font-semibold break-all">{u.email}</p>
            <p className="text-xs text-muted-foreground">
              Plano: {u.plan === "owner" ? "Proprietário" : u.plan === "vip" ? "VIP" : "Gratuito"}
              {u.plan === "vip" && u.vip_expires_at
                ? ` até ${new Date(u.vip_expires_at).toLocaleDateString("pt-BR")}`
                : ""}{" "}
              · IA hoje: {u.used_today}
            </p>
            {u.plan !== "owner" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setVip(u.id, true)}
                  className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
                >
                  {u.plan === "vip" ? "Renovar VIP" : "Ativar VIP"}
                </button>
                {u.plan === "vip" && (
                  <button
                    onClick={() => setVip(u.id, false)}
                    className="flex-1 rounded-xl border bg-secondary py-2 text-sm font-semibold"
                  >
                    Revogar
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
}
