import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, CircleDashed } from "lucide-react";
import { Page, Card } from "@/components/AppShell";

export const Route = createFileRoute("/assistente")({
  head: () => ({ meta: [{ title: "Assistente IA — Gerenciador de Vida" }] }),
  component: Assistente,
});

const examples = [
  "Crie um treino para fazer em casa três vezes por semana.",
  "Lembre-me de beber água durante o dia.",
  "Registre uma despesa de R$ 25 com alimentação.",
  "Quais contas ainda preciso pagar?",
];

function Assistente() {
  return (
    <Page title="Assistente IA" subtitle="Seu ajudante pessoal">
      <Card className="mb-4 border-warning/40">
        <div className="flex items-start gap-3">
          <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">Integração ainda não configurada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O assistente ainda não está conectado a nenhum serviço de IA. Nenhuma mensagem é enviada e nada é gravado por aqui.
              Todas as outras áreas do app funcionam normalmente sem ele.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> O que ele vai poder fazer</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {examples.map((e) => <li key={e} className="rounded-xl bg-secondary px-3 py-2">&ldquo;{e}&rdquo;</li>)}
        </ul>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-success" /> Como vai funcionar com segurança</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>A chave da IA fica só no servidor, nunca no celular.</li>
          <li>Toda ação proposta (treino, lembrete, despesa) aparece para você revisar e confirmar antes de salvar.</li>
          <li>Contas de &ldquo;quanto posso gastar&rdquo; são feitas por regras fixas do app, não pela IA.</li>
          <li>Haverá um limite de uso para evitar custos inesperados.</li>
        </ul>
      </Card>

      <Link to="/lembretes" className="block text-center text-sm font-semibold text-primary">Enquanto isso, crie seus lembretes →</Link>
    </Page>
  );
}
