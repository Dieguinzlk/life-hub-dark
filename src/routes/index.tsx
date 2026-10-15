
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Plus,
  Trash2,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Target,
  PiggyBank,
} from "lucide-react";
import { Page, Card } from "@/components/AppShell";
import { useData, update, uid, today, brl, fmtDate } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Gerenciador de Vida" },
      {
        name: "description",
        content:
          "Resumo do seu dia: tarefas, hábitos, finanças e metas em um só lugar.",
      },
      { property: "og:title", content: "Gerenciador de Vida" },
      {
        property: "og:description",
        content: "Finanças, rotina, tarefas, hábitos e metas em um só lugar.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const data = useData();
  const t = today();
  const month = t.slice(0, 7);

  const [task, setTask] = useState("");
  const [habit, setHabit] = useState("");

  const monthTx = data.transactions.filter((x) =>
    x.date.startsWith(month)
  );

  const inc = monthTx
    .filter((x) => x.type === "receita")
    .reduce((s, x) => s + x.amount, 0);

  const exp = monthTx
    .filter((x) => x.type === "despesa")
    .reduce((s, x) => s + x.amount, 0);

  const balance = data.transactions.reduce(
    (s, x) =>
      s + (x.type === "receita" ? x.amount : -x.amount),
    0
  );

  const upcoming = data.bills
    .filter((b) => !b.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  const tasks = data.tasks.filter((x) => x.date === t || !x.done);
  const doneCount = tasks.filter((x) => x.done).length;

  const habitsDone = data.habits.filter((h) =>
    h.doneDates.includes(t)
  ).length;

  // Meta financeira principal
  const mainGoal = data.financeGoals?.[0];

  const goalTarget = mainGoal?.targetAmount ?? 0;
  const goalSaved = mainGoal?.currentAmount ?? 0;

  const goalProgress =
    goalTarget > 0
      ? Math.min(100, Math.max(0, (goalSaved / goalTarget) * 100))
      : 0;

  const goalRemaining = Math.max(0, goalTarget - goalSaved);

  const goalProgressLabel = goalProgress.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });

  const hour = new Date().getHours();

  const greet =
    hour < 12
      ? "Bom dia"
      : hour < 18
        ? "Boa tarde"
        : "Boa noite";

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Page title={`${greet}! 👋`} subtitle={dateLabel}>
      {/* RESUMO FINANCEIRO */}
      <div className="bg-hero shadow-glow mb-4 rounded-3xl p-5">
        <p className="text-sm text-accent-foreground">Saldo atual</p>

        <p className="mt-1 font-display text-3xl font-semibold">
          {brl(balance)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-background/30 p-3">
            <p className="flex items-center gap-1 text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-success" />
              Receitas do mês
            </p>
            <p className="mt-1 font-semibold">{brl(inc)}</p>
          </div>

          <div className="rounded-xl bg-background/30 p-3">
            <p className="flex items-center gap-1 text-muted-foreground">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Despesas do mês
            </p>
            <p className="mt-1 font-semibold">{brl(exp)}</p>
          </div>
        </div>

        <Link
          to="/financas"
          className="mt-4 inline-block text-sm font-semibold text-primary"
        >
          Ver finanças →
        </Link>
      </div>

      {/* META FINANCEIRA NA TELA INICIAL */}
      {mainGoal && (
        <Card className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Target className="h-5 w-5 text-primary" />
              Minha meta principal
            </h2>

            <PiggyBank className="h-5 w-5 text-primary" />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {mainGoal.name}
          </p>

          {mainGoal.deadline && (
            <p className="mt-1 text-xs text-muted-foreground">
              Prazo: {fmtDate(mainGoal.deadline)}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Você já guardou
              </p>
              <p className="mt-1 text-lg font-bold">
                {brl(goalSaved)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Objetivo
              </p>
              <p className="mt-1 text-lg font-bold">
                {brl(goalTarget)}
              </p>
            </div>
          </div>

          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Progresso da meta financeira"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalProgress}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${goalProgress}%` }}
            />
          </div>

          <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
            <span>{goalProgressLabel}% concluído</span>
            <span>Faltam {brl(goalRemaining)}</span>
          </div>

          <Link
            to="/financas"
            className="mt-4 block rounded-xl border p-3 text-center text-sm font-semibold text-primary"
          >
            Ver detalhes e guardar valor →
          </Link>
        </Card>
      )}

      {!mainGoal && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Suas metas
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Crie uma meta financeira para acompanhar seu progresso aqui.
          </p>

          <Link
            to="/financas"
            className="mt-3 inline-block text-sm font-semibold text-primary"
          >
            Criar minha meta →
          </Link>
        </Card>
      )}

      {/* RESUMO DE TAREFAS E HÁBITOS */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-muted-foreground">Tarefas</p>
          <p className="font-display text-2xl font-semibold">
            {doneCount}/{tasks.length}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-muted-foreground">Hábitos hoje</p>
          <p className="font-display text-2xl font-semibold">
            {habitsDone}/{data.habits.length}
          </p>
        </Card>
      </div>

      {/* PRÓXIMAS CONTAS */}
      {upcoming.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <CalendarClock className="h-4 w-4 text-warning" />
            Próximas contas
          </h2>

          <ul className="space-y-2">
            {upcoming.map((b) => (
              <li
                key={b.id}
                className="flex justify-between gap-2 text-sm"
              >
                <span>
                  {b.description}{" "}
                  <span
                    className={
                      b.dueDate < t
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    · {fmtDate(b.dueDate)}
                  </span>
                </span>

                <span className="shrink-0 font-semibold">
                  {brl(b.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* TAREFAS */}
      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Tarefas de hoje</h2>

        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();

            if (!task.trim()) return;

            update((d) => ({
              ...d,
              tasks: [
                ...d.tasks,
                {
                  id: uid(),
                  title: task.trim(),
                  done: false,
                  date: t,
                },
              ],
            }));

            setTask("");
          }}
        >
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Nova tarefa..."
            className="h-11 min-w-0 flex-1 rounded-xl border bg-input/40 px-3 text-base outline-none focus:border-primary"
          />

          <button
            type="submit"
            aria-label="Adicionar tarefa"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </form>

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma tarefa por enquanto.
          </p>
        )}

        <ul className="space-y-1">
          {tasks.map((x) => (
            <li
              key={x.id}
              className="flex items-center gap-3 py-1.5"
            >
              <button
                type="button"
                aria-label="Concluir tarefa"
                onClick={() =>
                  update((d) => ({
                    ...d,
                    tasks: d.tasks.map((y) =>
                      y.id === x.id
                        ? { ...y, done: !y.done, date: t }
                        : y
                    ),
                  }))
                }
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${
                  x.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground"
                }`}
              >
                {x.done && <Check className="h-4 w-4" />}
              </button>

              <span
                className={`min-w-0 flex-1 break-words ${
                  x.done ? "text-muted-foreground line-through" : ""
                }`}
              >
                {x.title}
              </span>

              <button
                type="button"
                aria-label="Excluir tarefa"
                onClick={() =>
                  update((d) => ({
                    ...d,
                    tasks: d.tasks.filter((y) => y.id !== x.id),
                  }))
                }
                className="shrink-0 text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* HÁBITOS */}
      <Card>
        <h2 className="mb-3 font-semibold">Hábitos</h2>

        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();

            if (!habit.trim()) return;

            update((d) => ({
              ...d,
              habits: [
                ...d.habits,
                {
                  id: uid(),
                  name: habit.trim(),
                  doneDates: [],
                },
              ],
            }));

            setHabit("");
          }}
        >
          <input
            value={habit}
            onChange={(e) => setHabit(e.target.value)}
            placeholder="Novo hábito (ex: beber água)"
            className="h-11 min-w-0 flex-1 rounded-xl border bg-input/40 px-3 text-base outline-none focus:border-primary"
          />

          <button
            type="submit"
            aria-label="Adicionar hábito"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </form>

        {data.habits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Crie seu primeiro hábito.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {data.habits.map((h) => {
            const done = h.doneDates.includes(t);

            return (
              <button
                type="button"
                key={h.id}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    habits: d.habits.map((y) =>
                      y.id === h.id
                        ? {
                            ...y,
                            doneDates: done
                              ? y.doneDates.filter((z) => z !== t)
                              : [...y.doneDates, t],
                          }
                        : y
                    ),
                  }))
                }
                onContextMenu={(e) => {
                  e.preventDefault();

                  if (confirm(`Excluir o hábito "${h.name}"?`)) {
                    update((d) => ({
                      ...d,
                      habits: d.habits.filter((y) => y.id !== h.id),
                    }));
                  }
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm ${
                  done
                    ? "border-primary bg-accent text-accent-foreground"
                    : "bg-secondary"
                }`}
              >
                <Flame
                  className={`h-4 w-4 ${
                    done ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {h.name}
              </button>
            );
          })}
        </div>

        {data.habits.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Toque para marcar · segure para excluir
          </p>
        )}
      </Card>
    </Page>
  );
}
