
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
      { name: "description", content: "Planos, metas e histórico de treinos." },
    ],
  }),
  component: Treinos,
});

const field = "h-11 w-full rounded-xl border bg-input/40 px-3 text-base outline-none focus:border-primary";
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(dateValue: string, amount: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

function mondayOf(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return dateString(date);
}

function Treinos() {
  const data = useData();
  const [tab, setTab] = useState<"planos" | "historico">("planos");
  const [editPlan, setEditPlan] = useState<WorkoutPlan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [running, setRunning] = useState<WorkoutPlan | null>(null);

  const logs = [...data.workoutLogs].sort((a, b) => b.date.localeCompare(a.date));
  const monthCount = logs.filter((log) => log.date.startsWith(today().slice(0, 7))).length;

  const goal = Math.min(7, Math.max(1, Number(data.workoutGoal) || 3));
  const weekStart = mondayOf(today());
  const weekEnd = shiftDate(weekStart, 6);

  const thisWeekLogs = logs.filter(
    (log) => log.date >= weekStart && log.date <= weekEnd,
  );
  const progress = Math.min(100, Math.round((thisWeekLogs.length / goal) * 100));

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
    (label, index) => {
      const date = shiftDate(weekStart, index);
      return {
        label,
        date,
        trained: thisWeekLogs.some((log) => log.date === date),
        isToday: date === today(),
      };
    },
  );

  const lastFourWeeks = Array.from({ length: 4 }, (_, index) => {
    const start = shiftDate(weekStart, -7 * index);
    const end = shiftDate(start, 6);
    const count = logs.filter((log) => log.date >= start && log.date <= end).length;
    return { start, end, count };
  });

  return (
    <Page
      title="Treinos"
      subtitle={`${monthCount} treino${monthCount === 1 ? "" : "s"} este mês`}
      action={
        <button
          onClick={() => {
            setEditPlan(null);
            setPlanOpen(true);
          }}
          className="shadow-glow flex h-11 items-center gap-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
        >
          <Plus className="h-5 w-5" /> Plano
        </button>
      }
    >
      <div className="mb-4">
        <Card>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Meta semanal</h2>
              <p className="text-sm text-muted-foreground">
                Pequenos passos, grandes resultados.
              </p>
            </div>

            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Meta</span>
              <select
                value={String(goal)}
                onChange={(event) =>
                  update((current) => ({
                    ...current,
                    workoutGoal: Number(event.target.value),
                  }))
                }
                className="h-10 rounded-xl border bg-background px-3 font-semibold"
                aria-label="Meta de treinos por semana"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">Treinos concluídos</p>
            <p className="font-semibold">
              {thisWeekLogs.length} de {goal}
            </p>
          </div>

          <div
            className="h-3 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Progresso da meta semanal"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(thisWeekLogs.length, goal)}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-sm font-medium">
            {thisWeekLogs.length >= goal
              ? "Meta atingida! Parabéns! 🎉"
              : `Faltam ${goal - thisWeekLogs.length} treino${goal - thisWeekLogs.length === 1 ? "" : "s"} para atingir sua meta.`}
          </p>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {weekdays.map((day) => (
              <div key={day.date} className="text-center">
                <p className="mb-2 text-xs text-muted-foreground">{day.label}</p>
                <div
                  title={`${day.label} — ${fmtDate(day.date)}`}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                    day.trained
                      ? "border-primary bg-primary text-primary-foreground"
                      : day.isToday
                        ? "border-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {day.trained ? <Check className="h-4 w-4" /> : day.date.slice(8)}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Semana de {fmtDate(weekStart)} a {fmtDate(weekEnd)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Últimas 4 semanas</h2>
        <div className="space-y-4">
          {lastFourWeeks.map((week, index) => {
            const percent = Math.min(100, Math.round((week.count / goal) * 100));

            return (
              <div key={week.start}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {index === 0 ? "Esta semana" : `${fmtDate(week.start)} – ${fmtDate(week.end)}`}
                  </span>
                  <span className="font-medium">
                    {week.count}/{goal}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="my-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(["planos", "historico"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg py-2 text-sm font-semibold ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {key === "planos" ? "Planos" : "Histórico"}
          </button>
        ))}
      </div>

      {tab === "planos" && (
        <div className="space-y-3">
          {data.plans.length === 0 && (
            <Card>
              <p className="text-sm text-muted-foreground">
                Crie seu primeiro plano de treino (ex: Treino A — Peito e tríceps).
              </p>
            </Card>
          )}

          {data.plans.map((plan) => (
            <Card key={plan.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {plan.exercises.length} exercício{plan.exercises.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-3 text-muted-foreground">
                  <button
                    aria-label="Editar plano"
                    onClick={() => {
                      setEditPlan(plan);
                      setPlanOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Excluir plano"
                    onClick={() =>
                      confirm(`Excluir o plano "${plan.name}"? O histórico será mantido.`) &&
                      update((current) => ({
                        ...current,
                        plans: current.plans.filter((item) => item.id !== plan.id),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ul className="mb-3 space-y-1 text-sm">
                {plan.exercises.map((exercise) => (
                  <li key={exercise.id} className="flex justify-between">
                    <span>{exercise.name}</span>
                    <span className="text-muted-foreground">
                      {exercise.sets}×{exercise.reps}
                      {exercise.weight ? ` · ${exercise.weight}kg` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setRunning(plan)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground"
              >
                <Play className="h-4 w-4" /> Registrar treino
              </button>
            </Card>
          ))}
        </div>
      )}

      {tab === "historico" && (
        <div className="space-y-3">
          {logs.length === 0 && (
            <Card>
              <p className="text-sm text-muted-foreground">
                Nenhum treino registrado ainda.
              </p>
            </Card>
          )}

          {logs.map((log) => (
            <Card key={log.id}>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{log.planName}</h2>
                  <p className="text-xs text-muted-foreground">{fmtDate(log.date)}</p>
                </div>
                <button
                  aria-label="Excluir registro"
                  className="text-muted-foreground"
                  onClick={() =>
                    confirm("Excluir este registro?") &&
                    update((current) => ({
                      ...current,
                      workoutLogs: current.workoutLogs.filter((item) => item.id !== log.id),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <ul className="space-y-1 text-sm">
                {log.exercises.map((exercise) => (
                  <li key={exercise.id} className="flex justify-between">
                    <span>{exercise.name}</span>
                    <span className="text-muted-foreground">
                      {exercise.sets}×{exercise.reps}
                      {exercise.weight ? ` · ${exercise.weight}kg` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              {log.notes && (
                <p className="mt-2 text-sm text-muted-foreground">“{log.notes}”</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <PlanDialog
        key={(editPlan?.id ?? "new") + String(planOpen)}
        open={planOpen}
        onOpenChange={setPlanOpen}
        plan={editPlan}
      />

      {running && (
        <LogDialog
          key={running.id}
          plan={running}
          onClose={() => setRunning(null)}
          onSaved={() => {
            setRunning(null);
            setTab("historico");
          }}
        />
      )}
    </Page>
  );
}

type Row = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

const toRows = (exercises: Exercise[]): Row[] =>
  exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    sets: String(exercise.sets),
    reps: String(exercise.reps),
    weight: exercise.weight ? String(exercise.weight) : "",
  }));

const fromRows = (rows: Row[]): Exercise[] =>
  rows
    .filter((row) => row.name.trim())
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      sets: Math.max(1, Math.round(num(row.sets))),
      reps: Math.max(1, Math.round(num(row.reps))),
      ...(num(row.weight) ? { weight: num(row.weight) } : {}),
    }));

const blank = (): Row => ({
  id: uid(),
  name: "",
  sets: "3",
  reps: "12",
  weight: "",
});

function ExerciseRows({
  rows,
  setRows,
}: {
  rows: Row[];
  setRows: (rows: Row[]) => void;
}) {
  const set = (index: number, key: keyof Row, value: string) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id} className="rounded-xl border bg-secondary/50 p-2">
          <div className="mb-2 flex gap-2">
            <input
              value={row.name}
              onChange={(event) => set(index, "name", event.target.value)}
              placeholder="Exercício"
              className={field}
            />
            <button
              type="button"
              aria-label="Remover exercício"
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
              className="px-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <label>
              Séries
              <input
                inputMode="numeric"
                value={row.sets}
                onChange={(event) => set(index, "sets", event.target.value)}
                className={`${field} mt-1`}
              />
            </label>
            <label>
              Repetições
              <input
                inputMode="numeric"
                value={row.reps}
                onChange={(event) => set(index, "reps", event.target.value)}
                className={`${field} mt-1`}
              />
            </label>
            <label>
              Carga (kg)
              <input
                inputMode="decimal"
                value={row.weight}
                onChange={(event) => set(index, "weight", event.target.value)}
                className={`${field} mt-1`}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows([...rows, blank()])}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-semibold text-primary"
      >
        <Plus className="h-4 w-4" /> Adicionar exercício
      </button>
    </div>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan | null;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [rows, setRows] = useState<Row[]>(plan ? toRows(plan.exercises) : [blank()]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const exercises = fromRows(rows);

    if (!name.trim()) return;
    if (exercises.length === 0) {
      toast.error("Adicione pelo menos um exercício.");
      return;
    }

    update((current) => ({
      ...current,
      plans: plan
        ? current.plans.map((item) =>
            item.id === plan.id
              ? { ...item, name: name.trim(), exercises }
              : item,
          )
        : [...current.plans, { id: uid(), name: name.trim(), exercises }],
    }));

    onOpenChange(false);
    toast.success("Plano salvo!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[92vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plano" : "Novo plano de treino"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do plano (ex: Treino A)"
            className={field}
          />
          <ExerciseRows rows={rows} setRows={setRows} />
          <button className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">
            Salvar plano
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: WorkoutPlan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(toRows(plan.exercises));
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const exercises = fromRows(rows);

    if (exercises.length === 0) {
      toast.error("Registre pelo menos um exercício.");
      return;
    }

    update((current) => ({
      ...current,
      workoutLogs: [
        ...current.workoutLogs,
        {
          id: uid(),
          planId: plan.id,
          planName: plan.name,
          date: date || today(),
          exercises,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      ],
    }));

    toast.success("Treino registrado! 💪");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[92vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar: {plan.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm text-muted-foreground">
            Data
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${field} mt-1`}
            />
          </label>

          <p className="text-xs text-muted-foreground">
            Ajuste o que você realmente fez.
          </p>

          <ExerciseRows rows={rows} setRows={setRows} />

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observações (opcional)"
            className="min-h-20 w-full rounded-xl border bg-input/40 p-3 text-base outline-none focus:border-primary"
          />

          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground">
            <Check className="h-5 w-5" /> Concluir treino
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
