
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

export type Debt = { id: string; name: string; total: number; paid: number };
export type Priority = "alta" | "media" | "baixa";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  date: string;
  time?: string;
  priority?: Priority;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
};

export type WorkoutPlan = { id: string; name: string; exercises: Exercise[] };

export type WorkoutLog = {
  id: string;
  planId: string;
  planName: string;
  date: string;
  exercises: Exercise[];
  notes?: string;
};

export type Habit = { id: string; name: string; doneDates: string[] };

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
};

let state: AppData = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = {
        ...empty,
        ...saved,
        workoutGoal:
          Number.isInteger(saved.workoutGoal) &&
          saved.workoutGoal >= 1 &&
          saved.workoutGoal <= 7
            ? saved.workoutGoal
            : 3,
      };
    }
  } catch {
    /* Mantém os valores iniciais se os dados estiverem inválidos. */
  }
}

function setState(next: AppData) {
  state = next;
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

export const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export function exportBackup() {
  load();
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `backup-gerenciador-de-vida-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text());
  if (!parsed || !Array.isArray(parsed.transactions)) {
    throw new Error("Arquivo inválido");
  }

  setState({
    ...empty,
    ...parsed,
    workoutGoal:
      Number.isInteger(parsed.workoutGoal) &&
      parsed.workoutGoal >= 1 &&
      parsed.workoutGoal <= 7
        ? parsed.workoutGoal
        : 3,
  });
}

export function clearAll() {
  setState(empty);
}
