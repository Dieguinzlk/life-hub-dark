import { useSyncExternalStore } from "react";

export type Transaction = {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
};
export type Bill = { id: string; description: string; amount: number; dueDate: string; paid: boolean };
export type Debt = { id: string; name: string; total: number; paid: number };
export type Task = { id: string; title: string; done: boolean; date: string };
export type Habit = { id: string; name: string; doneDates: string[] };

export type AppData = {
  version: 1;
  transactions: Transaction[];
  bills: Bill[];
  debts: Debt[];
  tasks: Task[];
  habits: Habit[];
};

const KEY = "gerenciador-de-vida:v1";
const empty: AppData = { version: 1, transactions: [], bills: [], debts: [], tasks: [], habits: [] };

let state: AppData = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

function setState(next: AppData) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function update(fn: (d: AppData) => AppData) {
  load();
  setState(fn(state));
}

export function useData(): AppData {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      cb();
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export function exportBackup() {
  load();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `backup-gerenciador-de-vida-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text());
  if (!parsed || !Array.isArray(parsed.transactions)) throw new Error("Arquivo inválido");
  setState({ ...empty, ...parsed });
}

export function clearAll() {
  setState(empty);
}
