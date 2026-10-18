import { brl, fmtDate, today, uid, update, type AppData, type Exercise, type Priority } from "@/lib/store";

type Input = any;

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const dateOr = (v: unknown) => (v == null || v === "" ? today() : isDate(v) ? v : bad("Data inválida"));
const str = (v: unknown, label: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : bad(`${label} vazio`));
const pos = (v: unknown, label: string) => (typeof v === "number" && isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : bad(`${label} deve ser maior que zero`));
const nonneg = (v: unknown, label: string) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : bad(`${label} inválido`));
function bad(msg: string): never {
  throw new Error(msg);
}

function exerciseOf(v: unknown): Exercise {
  const e: Input = v ?? {};
  const sets = pos(e.sets, "Séries");
  const reps = pos(e.reps, "Repetições");
  const weight = e.weight == null ? undefined : nonneg(e.weight, "Carga");
  return { id: uid(), name: str(e.name, "Nome do exercício"), sets: Math.round(sets), reps: Math.round(reps), ...(weight ? { weight } : {}) };
}

export type PreparedAction = { summary: string; apply: () => string };

export function prepareAction(name: string, input: Input, data: AppData): PreparedAction {
  switch (name) {
    case "add_transaction": {
      const type = input.type === "receita" ? "receita" : input.type === "despesa" ? "despesa" : bad("Tipo inválido");
      const tx = {
        id: uid(),
        type,
        description: str(input.description, "Descrição"),
        amount: pos(input.amount, "Valor"),
        category: typeof input.category === "string" && input.category.trim() ? input.category.trim().slice(0, 80) : bad("Categoria inválida"),
        date: dateOr(input.date),
      };
      return {
        summary: `Registrar ${tx.type} "${tx.description}" de ${brl(tx.amount)} (${tx.category}) em ${fmtDate(tx.date)}`,
        apply: () => (update((d) => ({ ...d, transactions: [tx, ...d.transactions] })), "Lançamento salvo"),
      };
    }

    case "add_bill": {
      const bill = {
        id: uid(),
        description: str(input.description, "Descrição"),
        amount: pos(input.amount, "Valor"),
        dueDate: isDate(input.dueDate) ? input.dueDate : bad("Vencimento inválido"),
        paid: false,
      };
      return {
        summary: `Cadastrar conta "${bill.description}" de ${brl(bill.amount)}, vence ${fmtDate(bill.dueDate)}`,
        apply: () => (update((d) => ({ ...d, bills: [...d.bills, bill] })), "Conta salva"),
      };
    }

    case "add_task": {
      const time = typeof input.time === "string" && /^\d{2}:\d{2}$/.test(input.time) ? input.time : undefined;
      const priority = input.priority === "alta" || input.priority === "media" || input.priority === "baixa" ? (input.priority as Priority) : undefined;
      const task = {
        id: uid(),
        title: str(input.title, "Título"),
        done: false,
        date: dateOr(input.date),
        ...(time ? { time } : {}),
        ...(priority ? { priority } : {}),
      };
      return {
        summary: `Criar tarefa "${task.title}" em ${fmtDate(task.date)}${time ? ` às ${time}` : ""}${priority ? ` (prioridade ${priority})` : ""}`,
        apply: () => (update((d) => ({ ...d, tasks: [...d.tasks, task] })), "Tarefa criada"),
      };
    }

    case "complete_task":
    case "delete_task": {
      const t = data.tasks.find((x) => x.id === input.taskId) ?? bad("Tarefa não encontrada");
      const del = name === "delete_task";
      return {
        summary: `${del ? "Excluir" : "Concluir"} a tarefa "${t.title}"`,
        apply: () => {
          update((d) => ({
            ...d,
            tasks: del ? d.tasks.filter((x) => x.id !== t.id) : d.tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)),
          }));
          return del ? "Tarefa excluída" : "Tarefa concluída";
        },
      };
    }

    case "add_habit": {
      const habit = { id: uid(), name: str(input.name, "Nome"), doneDates: [] };
      return { summary: `Criar hábito "${habit.name}"`, apply: () => (update((d) => ({ ...d, habits: [...d.habits, habit] })), "Hábito criado") };
    }

    case "add_finance_goal": {
      const deadline = input.deadline == null ? undefined : isDate(input.deadline) ? input.deadline : bad("Prazo inválido");
      const g = {
        id: uid(),
        name: str(input.name, "Nome"),
        targetAmount: pos(input.targetAmount, "Valor da meta"),
        currentAmount: input.currentAmount == null ? 0 : nonneg(input.currentAmount, "Valor atual"),
        deadline,
      };
      return {
        summary: `Criar meta financeira "${g.name}": ${brl(g.targetAmount)}${deadline ? ` até ${fmtDate(deadline)}` : ""}`,
        apply: () => (update((d) => ({ ...d, financeGoals: [...d.financeGoals, g] })), "Meta criada"),
      };
    }

    case "add_health_goal": {
      const cats = ["peso", "treinos", "habito", "outra"] as const;
      const category = cats.find((c) => c === input.category) ?? "outra";
      const deadline = input.deadline == null ? undefined : isDate(input.deadline) ? input.deadline : bad("Prazo inválido");
      const currentValue = nonneg(input.currentValue, "Valor atual");
      const g = {
        id: uid(),
        name: str(input.name, "Nome"),
        category,
        currentValue,
        startValue: currentValue,
        targetValue: nonneg(input.targetValue, "Meta"),
        unit: typeof input.unit === "string" ? input.unit.trim().slice(0, 50) : bad("Unidade inválida"),
        deadline,
      };
      return {
        summary: `Criar meta de saúde "${g.name}": de ${g.currentValue} para ${g.targetValue} ${g.unit}`,
        apply: () => (update((d) => ({ ...d, healthGoals: [...d.healthGoals, g] })), "Meta criada"),
      };
    }

    case "create_workout_plan": {
      const list = Array.isArray(input.exercises) ? input.exercises.map(exerciseOf) : [];
      if (list.length === 0) bad("Plano sem exercícios");
      const plan = { id: uid(), name: str(input.name, "Nome do plano"), exercises: list };
      return {
        summary: `Criar plano "${plan.name}" com: ${list.map((e: Exercise) => `${e.name} ${e.sets}x${e.reps}`).join(", ")}`,
        apply: () => (update((d) => ({ ...d, plans: [...d.plans, plan] })), "Plano criado"),
      };
    }

    case "add_exercise_to_plan": {
      const plan = data.plans.find((p) => p.id === input.planId) ?? bad("Plano não encontrado");
      const ex = exerciseOf(input.exercise);
      return {
        summary: `Adicionar ${ex.name} ${ex.sets}x${ex.reps}${ex.weight ? ` (${ex.weight} kg)` : ""} ao plano "${plan.name}"`,
        apply: () => (update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === plan.id ? { ...p, exercises: [...p.exercises, ex] } : p)) })), "Exercício adicionado"),
      };
    }

    case "log_workout": {
      const plan = data.plans.find((p) => p.id === input.planId) ?? bad("Plano não encontrado");
      const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined;
      const log = {
        id: uid(),
        planId: plan.id,
        planName: plan.name,
        date: dateOr(input.date),
        exercises: plan.exercises.map((e) => ({ ...e })),
        ...(notes ? { notes } : {}),
      };
      return {
        summary: `Registrar treino "${plan.name}" em ${fmtDate(log.date)}`,
        apply: () => (update((d) => ({ ...d, workoutLogs: [log, ...d.workoutLogs] })), "Treino registrado"),
      };
    }

    default:
      bad("Ação desconhecida");
  }
}

export function buildSnapshot(d: AppData) {
  const refMonth = today().slice(0, 7);
  const monthTx = d.transactions.filter((t) => t.date.startsWith(refMonth));
  const monthIncome = monthTx.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0);
  const monthExpenses = monthTx.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0);
  const monthBalance = monthIncome - monthExpenses;

  const expensesByCategory = Object.entries(
    monthTx
      .filter((t) => t.type === "despesa")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]);

  const pendingBills = d.bills.filter((b) => !b.paid);
  const pendingBillsTotal = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  const debtsWithBalance = d.debts.map((debt) => ({
    ...debt,
    balance: Math.max(0, debt.total - debt.paid),
  }));
  const debtsTotal = debtsWithBalance.reduce((sum, debt) => sum + debt.balance, 0);

  const pendingTasks = d.tasks.filter((t) => !t.done);
  const completedTasks = d.tasks.filter((t) => t.done);

  const recentHabits = d.habits
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      completedDates: habit.doneDates.slice(-10),
      lastCompleted: habit.doneDates.length ? habit.doneDates[habit.doneDates.length - 1] : null,
    }))
    .slice(0, 25);

  const recentWorkoutLogs = d.workoutLogs.slice(0, 10).map((log) => ({
    id: log.id,
    planId: log.planId,
    planName: log.planName,
    date: log.date,
    exercises: log.exercises.slice(0, 5).map((ex) => ({ id: ex.id, name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight ?? null })),
  }));

  const workoutPlansSummary = d.plans
    .slice(0, 8)
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      exercises: plan.exercises.slice(0, 6).map((ex) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight ?? null,
      })),
    }));

  const financeGoalsSummary = d.financeGoals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
    deadline: goal.deadline ?? null,
    progress: goal.targetAmount > 0 ? Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100)) : 0,
  }));

  const healthGoalsSummary = d.healthGoals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    category: goal.category,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    unit: goal.unit,
    deadline: goal.deadline ?? null,
    progress: goal.targetValue === goal.currentValue ? 100 : goal.targetValue > 0 ? Math.min(100, Math.max(0, ((goal.currentValue - goal.targetValue) / Math.abs(goal.targetValue - goal.currentValue || 1)) * 100)) : 0,
  }));

  return {
    referenceDate: today(),
    analyzedMonth: refMonth,
    totalReceitasMes: monthIncome,
    totalDespesasMes: monthExpenses,
    saldoMes: monthBalance,
    totalLancamentosMes: monthTx.length,
    despesasPorCategoria: expensesByCategory.map(([category, total]) => ({ category, total })),
    maioresCategoriasDespesas: expensesByCategory.slice(0, 5).map(([category, total]) => ({ category, total })),
    lancamentosRecentes: d.transactions
      .slice(0, 20)
      .map(({ id, type, description, amount, category, date }) => ({ id, type, description, amount, category, date })),
    contasNaoPagas: pendingBills.length,
    totalContasNaoPagas: pendingBillsTotal,
    contasPendentes: pendingBills.slice(0, 10).map(({ id, description, amount, dueDate }) => ({ id, description, amount, dueDate })),
    dividas: debtsWithBalance
      .slice(0, 20)
      .map(({ id, name, total, paid, balance }) => ({ id, name, total, paid, balance })),
    totalDividas: debtsTotal,
    tarefasPendentes: pendingTasks
      .slice(0, 20)
      .map(({ id, title, date, time, priority, goalId, goalArea }) => ({ id, title, date, time: time ?? null, priority: priority ?? null, goalId: goalId ?? null, goalArea: goalArea ?? null })),
    tarefasPendentesTotal: pendingTasks.length,
    tarefasConcluidasTotal: completedTasks.length,
    habitos: recentHabits,
    totalHabitos: d.habits.length,
    planosTreino: workoutPlansSummary,
    treinosRecentes: recentWorkoutLogs,
    metaTreinosSemana: d.workoutGoal,
    metasFinanceiras: financeGoalsSummary,
    metasSaude: healthGoalsSummary,
    registrosRecentesHabitos: recentHabits
      .flatMap((habit) => habit.completedDates.map((date) => ({ habitId: habit.id, habitName: habit.name, date })))
      .slice(0, 30),
  };
}
