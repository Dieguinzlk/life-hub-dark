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
export type Priority = "alta" | "media" | "baixa";
export type Task = { id: string; title: string; done: boolean; date: string; time?: string; priority?: Priority };
export type Exercise = { id: string; name: string; sets: number; reps: number; weight?: number; rest?: number; notes?: string; done?: boolean };
export type WorkoutPlan = { id: string; name: string; exercises: Exercise[]; days?: number[]; notes?: string };
export type WorkoutLog = { id: string; planId: string; planName: string; date: string; exercises: Exercise[]; notes?: string };
export type Habit = { id: string; name: string; doneDates: string[] };

export type ReminderCategory = "agua" | "alimentacao" | "exercicio" | "sono" | "estudos" | "trabalho" | "medicamento" | "outro";
export type Reminder = {
  id: string;
  title: string;
  description?: string;
  category: ReminderCategory;
  times: string[]; // HH:MM
  days: number[]; // 0 = domingo ... 6 = sábado; vazio = todos os dias
  enabled: boolean;
  snoozedUntil?: string; // ISO
  createdAt: string;
};
export type ReminderLog = {
  id: string;
  reminderId: string;
  title: string;
  category: ReminderCategory;
  date: string;
  time: string;
  action: "concluido" | "adiado";
  at: string;
};

export type Settings = {
  openingBalance?: number;
  openingBalanceDate?: string;
  notificationsEnabled: boolean;
  mutedCategories: ReminderCategory[];
  quietStart?: string | undefined;
  quietEnd?: string | undefined;
};

export type AppData = {
  version: 2;
  transactions: Transaction[];
  bills: Bill[];
  debts: Debt[];
  tasks: Task[];
  habits: Habit[];
  plans: WorkoutPlan[];
  workoutLogs: WorkoutLog[];
  reminders: Reminder[];
  reminderLogs: ReminderLog[];
  settings: Settings;
};

// The storage key name is kept from v1 so existing data on the device is reused.
const KEY = "gerenciador-de-vida:v1";
const PRE_V2_BACKUP_KEY = "gerenciador-de-vida:backup-antes-v2";
const defaultSettings: Settings = { notificationsEnabled: false, mutedCategories: [] };
const empty: AppData = {
  version: 2,
  transactions: [],
  bills: [],
  debts: [],
  tasks: [],
  habits: [],
  plans: [],
  workoutLogs: [],
  reminders: [],
  reminderLogs: [],
  settings: defaultSettings,
};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function migrate(raw: unknown): AppData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof AppData, unknown>>;
  const s = (r.settings && typeof r.settings === "object" ? r.settings : {}) as Partial<Settings>;
  return {
    version: 2,
    transactions: arr(r.transactions),
    bills: arr(r.bills),
    debts: arr(r.debts),
    tasks: arr(r.tasks),
    habits: arr(r.habits),
    plans: arr<WorkoutPlan>(r.plans).map((p) => ({ ...p, exercises: arr(p.exercises) })),
    workoutLogs: arr<WorkoutLog>(r.workoutLogs).map((l) => ({ ...l, exercises: arr(l.exercises) })),
    reminders: arr<Reminder>(r.reminders).map((x) => ({ ...x, times: arr(x.times), days: arr(x.days) })),
    reminderLogs: arr(r.reminderLogs),
    settings: { ...defaultSettings, ...s, mutedCategories: arr(s.mutedCategories) },
  };
}

let state: AppData = empty;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return empty;
  const parsed = JSON.parse(raw);
  if (parsed?.version !== 2 && !localStorage.getItem(PRE_V2_BACKUP_KEY)) {
    localStorage.setItem(PRE_V2_BACKUP_KEY, raw);
  }
  return migrate(parsed);
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = readStorage();
  } catch {
    /* keep empty state if storage is unreadable */
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = readStorage();
      listeners.forEach((l) => l());
    } catch {
      /* ignore malformed external writes */
    }
  });
}

function setState(next: AppData) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function update(fn: (d: AppData) => AppData) {
  load();
  setState(fn(state));
}

export function getData(): AppData {
  load();
  return state;
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
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => toISODate(new Date());
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export function currentBalance(d: AppData) {
  const since = d.settings.openingBalanceDate;
  const moves = d.transactions
    .filter((x) => !since || x.date >= since)
    .reduce((s, x) => s + (x.type === "receita" ? x.amount : -x.amount), 0);
  return (d.settings.openingBalance ?? 0) + moves;
}

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
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.transactions)) throw new Error("Arquivo inválido");
  setState(migrate(parsed));
}

export function clearAll() {
  setState(empty);
}
