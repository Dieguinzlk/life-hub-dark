import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Sparkles, Settings, ChevronRight } from "lucide-react";
import { Page } from "@/components/AppShell";

export const Route = createFileRoute("/mais")({
  head: () => ({ meta: [{ title: "Mais — Gerenciador de Vida" }] }),
  component: Mais,
});

const items = [
  { to: "/lembretes", icon: Bell, title: "Lembretes", desc: "Água, alimentação, estudos e hábitos" },
  { to: "/assistente", icon: Sparkles, title: "Assistente IA", desc: "Converse em português (em preparação)" },
  { to: "/ajustes", icon: Settings, title: "Ajustes", desc: "Saldo inicial, backup e dados" },
] as const;

function Mais() {
  return (
    <Page title="Mais" subtitle="Outras áreas">
      <nav aria-label="Outras áreas" className="space-y-3">
        {items.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{title}</span>
              <span className="block truncate text-sm text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </nav>
    </Page>
  );
}
