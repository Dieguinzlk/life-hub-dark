import { WEEKDAYS } from "@/lib/reminders";

export function DayPicker({ days, setDays, emptyLabel = "Nenhum dia marcado = todos os dias" }: { days: number[]; setDays: (d: number[]) => void; emptyLabel?: string }) {
  return (
    <div>
      <p className="mb-1 text-sm text-muted-foreground">Dias da semana</p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => {
          const on = days.includes(i);
          return (
            <button type="button" key={i} aria-label={w.long} aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])} className={`h-10 rounded-lg text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {w.short}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{emptyLabel}</p>
    </div>
  );
}
