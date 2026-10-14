import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Pencil, Play, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Page, Card } from "@/components/AppShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useData, update, uid, today, fmtDate, type WorkoutPlan, type Exercise } from "@/lib/store";

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos — Gerenciador de Vida" },
      { name: "description", content: "Monte planos de treino, registre treinos concluídos e veja seu histórico." },
      { property: "og:title", content: "Treinos — Gerenciador de Vida" },
      { property: "og:description", content: "Planos de treino, registros e histórico." },
    ],
  }),
  component: Treinos,
});

const field = "h-11 w-full rounded-xl border bg-input/40 px-3 text-base outline-none focus:border-primary";
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

function Treinos() {
  const data = useData();
  const [tab, setTab] = useState<"planos" | "historico">("planos");
  const [editPlan, setEditPlan] = useState<WorkoutPlan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [running, setRunning] = useState<WorkoutPlan | null>(null);

  const logs = [...data.workoutLogs].sort((a, b) => b.date.localeCompare(a.date));
  const monthCount = logs.filter((l) => l.date.startsWith(today().slice(0, 7))).length;

  return (
    <Page
      title="Treinos"
      subtitle={`${monthCount} treino${monthCount === 1 ? "" : "s"} este mês`}
      action={
        <button onClick={() => { setEditPlan(null); setPlanOpen(true); }} className="shadow-glow flex h-11 items-center gap-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">
          <Plus className="h-5 w-5" /> Plano
        </button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(["planos", "historico"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {k === "planos" ? "Planos" : "Histórico"}
          </button>
        ))}
      </div>

      {tab === "planos" && (
        <div className="space-y-3">
          {data.plans.length === 0 && <Card><p className="text-sm text-muted-foreground">Crie seu primeiro plano de treino (ex: Treino A — Peito e tríceps).</p></Card>}
          {data.plans.map((p) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-xs text-muted-foreground">{p.exercises.length} exercício{p.exercises.length === 1 ? "" : "s"}</p>
                </div>
                <div className="flex gap-3 text-muted-foreground">
                  <button aria-label="Editar plano" onClick={() => { setEditPlan(p); setPlanOpen(true); }}><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Excluir plano" onClick={() => confirm(`Excluir o plano "${p.name}"? O histórico será mantido.`) && update((d) => ({ ...d, plans: d.plans.filter((y) => y.id !== p.id) }))}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <ul className="mb-3 space-y-1 text-sm">
                {p.exercises.map((e) => (
                  <li key={e.id} className="flex justify-between"><span>{e.name}</span><span className="text-muted-foreground">{e.sets}×{e.reps}{e.weight ? ` · ${e.weight}kg` : ""}</span></li>
                ))}
              </ul>
              <button onClick={() => setRunning(p)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground">
                <Play className="h-4 w-4" /> Registrar treino
              </button>
            </Card>
          ))}
        </div>
      )}

      {tab === "historico" && (
        <div className="space-y-3">
          {logs.length === 0 && <Card><p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p></Card>}
          {logs.map((l) => (
            <Card key={l.id}>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{l.planName}</h2>
                  <p className="text-xs text-muted-foreground">{fmtDate(l.date)}</p>
                </div>
                <button aria-label="Excluir registro" className="text-muted-foreground" onClick={() => confirm("Excluir este registro?") && update((d) => ({ ...d, workoutLogs: d.workoutLogs.filter((y) => y.id !== l.id) }))}><Trash2 className="h-4 w-4" /></button>
              </div>
              <ul className="space-y-1 text-sm">
                {l.exercises.map((e) => (
                  <li key={e.id} className="flex justify-between"><span>{e.name}</span><span className="text-muted-foreground">{e.sets}×{e.reps}{e.weight ? ` · ${e.weight}kg` : ""}</span></li>
                ))}
              </ul>
              {l.notes && <p className="mt-2 text-sm text-muted-foreground">“{l.notes}”</p>}
            </Card>
          ))}
        </div>
      )}

      <PlanDialog key={(editPlan?.id ?? "new") + String(planOpen)} open={planOpen} onOpenChange={setPlanOpen} plan={editPlan} />
      {running && <LogDialog key={running.id} plan={running} onClose={() => setRunning(null)} onSaved={() => { setRunning(null); setTab("historico"); }} />}
    </Page>
  );
}

type Row = { id: string; name: string; sets: string; reps: string; weight: string };
const toRows = (ex: Exercise[]): Row[] => ex.map((e) => ({ id: e.id, name: e.name, sets: String(e.sets), reps: String(e.reps), weight: e.weight ? String(e.weight) : "" }));
const fromRows = (rows: Row[]): Exercise[] =>
  rows.filter((r) => r.name.trim()).map((r) => ({ id: r.id, name: r.name.trim(), sets: Math.max(1, Math.round(num(r.sets))), reps: Math.max(1, Math.round(num(r.reps))), ...(num(r.weight) ? { weight: num(r.weight) } : {}) }));
const blank = (): Row => ({ id: uid(), name: "", sets: "3", reps: "12", weight: "" });

function ExerciseRows({ rows, setRows }: { rows: Row[]; setRows: (r: Row[]) => void }) {
  const set = (i: number, k: keyof Row, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.id} className="rounded-xl border bg-secondary/50 p-2">
          <div className="mb-2 flex gap-2">
            <input value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="Exercício" className={field} />
            <button type="button" aria-label="Remover exercício" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <label>Séries<input inputMode="numeric" value={r.sets} onChange={(e) => set(i, "sets", e.target.value)} className={`${field} mt-1`} /></label>
            <label>Repetições<input inputMode="numeric" value={r.reps} onChange={(e) => set(i, "reps", e.target.value)} className={`${field} mt-1`} /></label>
            <label>Carga (kg)<input inputMode="decimal" value={r.weight} onChange={(e) => set(i, "weight", e.target.value)} className={`${field} mt-1`} /></label>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, blank()])} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-semibold text-primary">
        <Plus className="h-4 w-4" /> Adicionar exercício
      </button>
    </div>
  );
}

function PlanDialog({ open, onOpenChange, plan }: { open: boolean; onOpenChange: (o: boolean) => void; plan: WorkoutPlan | null }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [rows, setRows] = useState<Row[]>(plan ? toRows(plan.exercises) : [blank()]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const exercises = fromRows(rows);
    if (!name.trim()) return;
    if (exercises.length === 0) return toast.error("Adicione pelo menos um exercício.");
    update((d) => ({
      ...d,
      plans: plan ? d.plans.map((p) => (p.id === plan.id ? { ...p, name: name.trim(), exercises } : p)) : [...d.plans, { id: uid(), name: name.trim(), exercises }],
    }));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[92vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader><DialogTitle>{plan ? "Editar plano" : "Novo plano de treino"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do plano (ex: Treino A)" className={field} />
          <ExerciseRows rows={rows} setRows={setRows} />
          <button className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">Salvar plano</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogDialog({ plan, onClose, onSaved }: { plan: WorkoutPlan; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>(toRows(plan.exercises));
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const exercises = fromRows(rows);
    if (exercises.length === 0) return toast.error("Registre pelo menos um exercício.");
    update((d) => ({ ...d, workoutLogs: [...d.workoutLogs, { id: uid(), planId: plan.id, planName: plan.name, date: date || today(), exercises, ...(notes.trim() ? { notes: notes.trim() } : {}) }] }));
    toast.success("Treino registrado! 💪");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[92vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader><DialogTitle>Registrar: {plan.name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm text-muted-foreground">Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} /></label>
          <p className="text-xs text-muted-foreground">Ajuste o que você realmente fez hoje.</p>
          <ExerciseRows rows={rows} setRows={setRows} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações (opcional)" className="min-h-20 w-full rounded-xl border bg-input/40 p-3 text-base outline-none focus:border-primary" />
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"><Check className="h-5 w-5" /> Concluir treino</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
