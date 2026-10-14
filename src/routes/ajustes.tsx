import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, Trash2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Page, Card } from "@/components/AppShell";
import { exportBackup, importBackup, clearAll, useData, update, today, brl, currentBalance } from "@/lib/store";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes e backup — Gerenciador de Vida" },
      { name: "description", content: "Faça backup e restaure seus dados do Gerenciador de Vida." },
      { property: "og:title", content: "Ajustes — Gerenciador de Vida" },
      { property: "og:description", content: "Backup e restauração dos seus dados." },
    ],
  }),
  component: Ajustes,
});

function OpeningBalanceCard() {
  const data = useData();
  const s = data.settings;
  const [amount, setAmount] = useState(s.openingBalance != null ? String(s.openingBalance).replace(".", ",") : "");
  const [date, setDate] = useState(s.openingBalanceDate ?? today());
  const field = "h-11 w-full rounded-xl border bg-input/40 px-3 text-base outline-none focus:border-primary";

  function save(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(value)) { toast.error("Informe um valor válido."); return; }
    update((d) => ({ ...d, settings: { ...d.settings, openingBalance: value, openingBalanceDate: date || today() } }));
    toast.success("Saldo inicial salvo.");
  }

  return (
    <Card className="mb-4">
      <h2 className="font-semibold">Saldo inicial</h2>
      <p className="mb-3 text-sm text-muted-foreground">Quanto você tinha na conta nesta data. O saldo atual passa a ser este valor mais os lançamentos a partir dela.</p>
      <form onSubmit={save} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-muted-foreground">Valor (R$)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={`${field} mt-1`} /></label>
          <label className="text-sm text-muted-foreground">Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} /></label>
        </div>
        <button className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground">Salvar saldo inicial</button>
        {s.openingBalance != null && <p className="text-xs text-muted-foreground">Saldo atual calculado: {brl(currentBalance(data))}</p>}
      </form>
    </Card>
  );
}

function Ajustes() {
  const fileRef = useRef<HTMLInputElement>(null);
  const btn = "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold";
  return (
    <Page title="Ajustes" subtitle="Seus dados ficam só neste aparelho">
      <OpeningBalanceCard />
      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">Salve um arquivo com todos os seus dados. Guarde no Google Drive ou envie para você mesmo.</p>
        <button onClick={() => { exportBackup(); toast.success("Backup gerado!"); }} className={`${btn} bg-primary text-primary-foreground`}>
          <Download className="h-5 w-5" /> Fazer backup
        </button>
        <button onClick={() => fileRef.current?.click()} className={`${btn} border bg-secondary`}>
          <Upload className="h-5 w-5" /> Restaurar backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f || !confirm("Restaurar vai substituir os dados atuais. Continuar?")) return;
            try { await importBackup(f); toast.success("Dados restaurados!"); } catch { toast.error("Arquivo de backup inválido."); }
          }}
        />
      </Card>
      <Card className="mb-4 space-y-2">
        <h2 className="flex items-center gap-2 font-semibold"><Smartphone className="h-4 w-4 text-primary" /> Instalar no celular</h2>
        <p className="text-sm text-muted-foreground">No Chrome do Android, abra o menu (⋮) e toque em “Adicionar à tela inicial” ou “Instalar app”.</p>
      </Card>
      <Card>
        <button onClick={() => { if (confirm("Apagar TODOS os dados? Isso não pode ser desfeito.")) { clearAll(); toast("Dados apagados."); } }} className={`${btn} text-destructive`}>
          <Trash2 className="h-5 w-5" /> Apagar todos os dados
        </button>
      </Card>
    </Page>
  );
}
