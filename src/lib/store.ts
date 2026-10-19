import { useSyncExternalStore } from "react";

export type Transaction = {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  category: string;
  date: string;
};

export type Bill = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
};

export type Debt = {
  id: string;
  name: string;
  total: number;
  paid: number;
};

export type Priority = "alta" | "media" | "baixa";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  date: string;
  time?: string;
  priority?: Priority;
  goalId?: string;
  goalArea?: "financas" | "saude";
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  exercises: Exercise[];
};

export type WorkoutLog = {
  id: string;
  planId: string;
  planName: string;
  date: string;
  exercises: Exercise[];
  notes?: string;
};

export type Habit = {
  id: string;
  name: string;
  doneDates: string[];
};

export type Contribution = {
  id: string;
  goalId: string;
  amount: number;
  date: string; // YYYY-MM-DD (fuso horário local)
  notes?: string;
};

export type FinanceGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // Mantido para compatibilidade total
  initialAmount?: number; // Valor inicial guardado
  startDate?: string;
  deadline?: string | undefined;
  frequency?: "daily" | "monthly";
  contributions?: Contribution[]; // Histórico de depósitos confirmados
  createdAt: string;
  notes?: string | undefined;
  estimatedReturnRate?: number; // Taxa anual % opcional para simulação
};

export type HealthGoal = {
  id: string;
  name: string;
  category: "peso" | "treinos" | "habito" | "outra";
  currentValue: number;
  targetValue: number;
  startValue?: number;
  unit: string;
  deadline?: string;
  createdAt: string;
  notes?: string;
};

// Estrutura do Plano Financeiro Estratégico (50/30/20 com metas temporais)
export interface FinancialPlan {
  income: number;
  targetMonths: number;
  essentialLimit: number;
  wantsLimit: number;
  savingsLimit: number;
  debtPayoffMonthly: number;
  reserveMonthly: number;
  strategies: string[];
  createdAt: string;
}

export type AppData = {
  version: 1;
  transactions: Transaction[];
  bills: Bill[];
  debts: Debt[];
  tasks: Task[];
  habits: Habit[];
  plans: WorkoutPlan[];
  workoutLogs: WorkoutLog[];
  workoutGoal: number;
  financeGoals: FinanceGoal[];
  healthGoals: HealthGoal[];
  financialPlan?: FinancialPlan; // <--- Plano Estratégico Salvo
};

const KEY = "gerenciador-de-vida:v1";

const empty: AppData = {
  version: 1,
  transactions: [],
  bills: [],
  debts: [],
  tasks: [],
  habits: [],
  plans: [],
  workoutLogs: [],
  workoutGoal: 3,
  financeGoals: [],
  healthGoals: [],
  financialPlan: undefined,
};

function normalizeData(saved: Partial<AppData> | null | undefined): AppData {
  const normalizedFinanceGoals = (Array.isArray(saved?.financeGoals) ? saved.financeGoals : []).map(g => {
    const contributions = Array.isArray(g.contributions) ? g.contributions : [];
    const initial = g.initialAmount ?? g.currentAmount ?? 0;
    const contributionsTotal = contributions.reduce((acc, c) => acc + c.amount, 0);
    const computedTotal = initial + contributionsTotal;

    return {
      ...g,
      initialAmount: initial,
      currentAmount: computedTotal,
      frequency: g.frequency || "monthly",
      contributions,
      startDate: g.startDate || g.createdAt || today(),
    };
  });

  return {
    ...empty,
    ...(saved || {}),
    version: 1,
    transactions: Array.isArray(saved?.transactions) ? saved.transactions : [],
    bills: Array.isArray(saved?.bills) ? saved.bills : [],
    debts: Array.isArray(saved?.debts) ? saved.debts : [],
    tasks: Array.isArray(saved?.tasks) ? saved.tasks : [],
    habits: Array.isArray(saved?.habits) ? saved.habits : [],
    plans: Array.isArray(saved?.plans) ? saved.plans : [],
    workoutLogs: Array.isArray(saved?.workoutLogs) ? saved.workoutLogs : [],
    workoutGoal:
      typeof saved?.workoutGoal === "number" ? saved.workoutGoal : 3,
    financeGoals: normalizedFinanceGoals,
    healthGoals: Array.isArray(saved?.healthGoals)
      ? saved.healthGoals
      : [],
    financialPlan: saved?.financialPlan ?? undefined, // Preserva o plano estratégico
  };
}

let state: AppData = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;

  loaded = true;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = normalizeData(JSON.parse(raw));
  } catch {
    state = empty;
  }
}

function setState(next: AppData) {
  state = normalizeData(next);

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  listeners.forEach((listener) => listener());
}

export function update(fn: (data: AppData) => AppData) {
  load();
  setState(fn(state));
}

export function useData(): AppData {
  return useSyncExternalStore(
    (callback) => {
      load();
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

// Helper para cálculo exato sem duplicação
export function getGoalSavedAmount(goal: FinanceGoal): number {
  const contributionsTotal = (goal.contributions || []).reduce((acc, c) => acc + c.amount, 0);
  const initial = goal.initialAmount ?? 0;
  return initial + contributionsTotal;
}

export function syncGoalAmount(goal: FinanceGoal): FinanceGoal {
  const totalSaved = getGoalSavedAmount(goal);
  return {
    ...goal,
    currentAmount: totalSaved,
  };
}

export const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export const fmtDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export function exportBackup() {
  load();

  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `backup-gerenciador-de-vida-${today()}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text());

  if (!parsed || !Array.isArray(parsed.transactions)) {
    throw new Error("Arquivo inválido");
  }

  setState(normalizeData(parsed));
}

export function clearAll() {
  setState(empty);
}
