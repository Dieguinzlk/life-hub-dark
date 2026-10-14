import type { AppData, Reminder, ReminderCategory } from "@/lib/store";
import { toISODate } from "@/lib/store";

export const CATEGORIES: Record<ReminderCategory, { label: string; color: string }> = {
  agua: { label: "Beber água", color: "bg-sky-500/20 text-sky-300" },
  alimentacao: { label: "Alimentação", color: "bg-amber-500/20 text-amber-300" },
  exercicio: { label: "Exercícios", color: "bg-emerald-500/20 text-emerald-300" },
  sono: { label: "Sono e descanso", color: "bg-indigo-500/20 text-indigo-300" },
  estudos: { label: "Faculdade e estudos", color: "bg-violet-500/20 text-violet-300" },
  trabalho: { label: "Trabalho", color: "bg-slate-500/20 text-slate-300" },
  medicamento: { label: "Medicamentos", color: "bg-rose-500/20 text-rose-300" },
  outro: { label: "Personalizado", color: "bg-secondary text-secondary-foreground" },
};

export const WEEKDAYS = [
  { short: "D", long: "Domingo" },
  { short: "S", long: "Segunda" },
  { short: "T", long: "Terça" },
  { short: "Q", long: "Quarta" },
  { short: "Q", long: "Quinta" },
  { short: "S", long: "Sexta" },
  { short: "S", long: "Sábado" },
];

export const daysLabel = (days: number[] | undefined) => {
  if (!days || days.length === 0 || days.length === 7) return "Todos os dias";
  return [...days].sort().map((d) => WEEKDAYS[d]?.long.slice(0, 3)).join(", ");
};

export type Occurrence = {
  reminder: Reminder;
  date: string;
  time: string;
  status: "pendente" | "concluido" | "adiado";
  snoozedUntil?: Date;
};

const runsOn = (r: Reminder, date: Date) => r.days.length === 0 || r.days.includes(date.getDay());

export function occurrencesFor(data: AppData, date: Date): Occurrence[] {
  const iso = toISODate(date);
  const out: Occurrence[] = [];
  for (const r of data.reminders) {
    if (!r.enabled || !runsOn(r, date)) continue;
    for (const time of r.times) {
      const done = data.reminderLogs.some((l) => l.reminderId === r.id && l.date === iso && l.time === time && l.action === "concluido");
      const snooze = r.snoozedUntil ? new Date(r.snoozedUntil) : undefined;
      const snoozed = !done && snooze && snooze > new Date() && toISODate(snooze) === iso;
      out.push({ reminder: r, date: iso, time, status: done ? "concluido" : snoozed ? "adiado" : "pendente", ...(snoozed ? { snoozedUntil: snooze } : {}) });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export function inQuietHours(settings: AppData["settings"], now: Date) {
  const { quietStart, quietEnd } = settings;
  if (!quietStart || !quietEnd) return false;
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return quietStart <= quietEnd ? hm >= quietStart && hm < quietEnd : hm >= quietStart || hm < quietEnd;
}

export const notificationSupport = () => {
  if (typeof window === "undefined") return "indisponivel" as const;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "indisponivel" as const;
  return Notification.permission;
};
