import { createFileRoute } from "@tanstack/react-router";
import { useState, useSyncExternalStore } from "react";
import { Plus, Trash2, Pencil, Check, AlarmClock, Bell, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { Page, Card } from "@/components/AppShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useData, update, uid, today, fmtDate, type Reminder, type ReminderCategory } from "@/lib/store";
import { DayPicker } from "@/components/DayPicker";
import { CATEGORIES, daysLabel, occurrencesFor, notificationSupport, type Occurrence } from "@/lib/reminders";

export const Route = createFileRoute("/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes — Gerenciador de Vida" },
      { name: "description", content: "Lembretes recorrentes para água, alimentação, exercícios, estudos e mais." },
    ],
  }),
  component: Lembretes,
});

const field = "h-11 w-full rounded-xl border bg-input/40 px-3 text-base outline-none focus:border-primary";
const useNow = () =>
  useSyncExternalStore(
    (cb) => {
      const id = window.setInterval(cb, 30_000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 30_000),
    () => 0,
  );

function Lembretes() {
  const data = useData();
  useNow();
  const [tab, setTab] = useState<"hoje" | "todos" | "historico">("hoje");
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [open, setOpen] = useState(false);

  const occ = occurrencesFor(data, new Date());
  const pending = occ.filter((o) => o.status !== "concluido").length;
  const logs = [...data.reminderLogs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);

  return (
    <Page
      title="Lembretes"
      subtitle={occ.length ? `${pending} pendente${pending === 1 ? "" : "s"} hoje` : "Seus hábitos e horários"}
      action={
        <button onClick={() => { setEditing(null); setOpen(true); }} className="shadow-glow flex h-11 items-center gap-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">
          <Plus className="h-5 w-5" /> Novo
        </button>
      }
    >
      <NotificationCard />

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {(["hoje", "todos", "historico"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {k === "hoje" ? "Hoje" : k === "todos" ? "Todos" : "Histórico"}
          </button>
        ))}
      </div>

      {tab === "hoje" && (
        <Card>
          {occ.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lembrete para hoje. Toque em &ldquo;Novo&rdquo; para criar.</p>
          ) : (
            <ul className="divide-y">{occ.map((o) => <OccurrenceRow key={`${o.reminder.id}-${o.time}`} o={o} />)}</ul>
          )}
        </Card>
      )}

      {tab === "todos" && (
        <div className="space-y-3">
          {data.reminders.length === 0 && <Card><p className="text-sm text-muted-foreground">Você ainda não criou lembretes.</p></Card>}
          {data.reminders.map((r) => (
            <Card key={r.id} className={r.enabled ? "" : "opacity-60"}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.times.join(" · ")} — {daysLabel(r.days)}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${CATEGORIES[r.category].color}`}>{CATEGORIES[r.category].label}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <button aria-label={r.enabled ? "Desativar lembrete" : "Ativar lembrete"} onClick={() => update((d) => ({ ...d, reminders: d.reminders.map((y) => (y.id === r.id ? { ...y, enabled: !y.enabled } : y)) }))}>
                    {r.enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button aria-label="Editar lembrete" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Excluir lembrete" onClick={() => confirm(`Excluir o lembrete "${r.title}"?`) && update((d) => ({ ...d, reminders: d.reminders.filter((y) => y.id !== r.id) }))}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "historico" && (
        <Card>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada concluído ainda.</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">{l.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{l.action === "concluido" ? "Concluído" : "Adiado"} · {fmtDate(l.date)} {l.time}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <QuietCard />
      <ReminderDialog key={(editing?.id ?? "new") + String(open)} open={open} onOpenChange={setOpen} reminder={editing} />
    </Page>
  );
}

function OccurrenceRow({ o }: { o: Occurrence }) {
  const done = o.status === "concluido";
  const log = (action: "concluido" | "adiado") => ({ id: uid(), reminderId: o.reminder.id, title: o.reminder.title, category: o.reminder.category, date: o.date, time: o.time, action, at: new Date().toISOString() });
  const complete = () =>
    update((d) => ({
      ...d,
      reminderLogs: done
        ? d.reminderLogs.filter((l) => !(l.reminderId === o.reminder.id && l.date === o.date && l.time === o.time && l.action === "concluido"))
        : [...d.reminderLogs, log("concluido")],
      reminders: d.reminders.map((r) => (r.id === o.reminder.id ? (({ snoozedUntil: _s, ...rest }) => rest)(r) : r)),
    }));
  const snooze = () => {
    const until = new Date(Date.now() + 10 * 60_000);
    update((d) => ({ ...d, reminderLogs: [...d.reminderLogs, log("adiado")], reminders: d.reminders.map((r) => (r.id === o.reminder.id ? { ...r, snoozedUntil: until.toISOString() } : r)) }));
    toast("Adiado por 10 minutos.");
  };
  return (
    <li className="flex items-center gap-3 py-2.5">
      <button aria-label={done ? "Desmarcar" : "Concluir"} onClick={complete} className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 ${done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
        {done && <Check className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{o.reminder.title}</p>
        <p className="text-xs text-muted-foreground">
          {o.time} · {CATEGORIES[o.reminder.category].label}
          {o.snoozedUntil && ` · adiado até ${o.snoozedUntil.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
        </p>
      </div>
      {!done && (
        <button aria-label="Adiar 10 minutos" onClick={snooze} className="flex h-9 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-semibold text-muted-foreground">
          <AlarmClock className="h-4 w-4" /> 10 min
        </button>
      )}
    </li>
  );
}

function NotificationCard() {
  const data = useData();
  const [perm, setPerm] = useState(notificationSupport);
  const enabled = data.settings.notificationsEnabled && perm === "granted";
  const setEnabled = (v: boolean) => update((d) => ({ ...d, settings: { ...d.settings, notificationsEnabled: v } }));

  async function activate() {
    if (perm === "indisponivel") return;
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted") {
      setEnabled(true);
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.showNotification("Notificações ativadas", { body: "Este é um teste do Gerenciador de Vida.", icon: "/icon-192.png" });
    } else {
      toast.error("Permissão negada. Você pode liberar nas configurações do navegador.");
    }
  }

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">
            {perm === "indisponivel" ? "Este navegador não suporta notificações." : perm === "denied" ? "Bloqueadas no navegador." : enabled ? "Ativadas neste aparelho." : "Desativadas."}
          </p>
        </div>
        {perm !== "indisponivel" && perm !== "denied" && (
          enabled ? (
            <button onClick={() => setEnabled(false)} className="h-10 rounded-xl bg-secondary px-3 text-sm font-semibold">Desativar</button>
          ) : (
            <button onClick={activate} className="h-10 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">Ativar</button>
          )
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Funcionam com o app aberto ou em segundo plano recente. Com o app totalmente fechado, o Android pode não entregar: isso exige sincronização na nuvem (etapa futura).
      </p>
    </Card>
  );
}

function QuietCard() {
  const data = useData();
  const s = data.settings;
  const set = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const toggleMute = (c: ReminderCategory) => set({ mutedCategories: s.mutedCategories.includes(c) ? s.mutedCategories.filter((x) => x !== c) : [...s.mutedCategories, c] });
  return (
    <Card className="mt-4">
      <h2 className="mb-2 font-semibold">Horário de descanso</h2>
      <p className="mb-2 text-xs text-muted-foreground">Nenhum aviso será enviado nesse intervalo.</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="text-sm text-muted-foreground">Início<input type="time" value={s.quietStart ?? ""} onChange={(e) => set({ quietStart: e.target.value || undefined })} className={`${field} mt-1`} /></label>
        <label className="text-sm text-muted-foreground">Fim<input type="time" value={s.quietEnd ?? ""} onChange={(e) => set({ quietEnd: e.target.value || undefined })} className={`${field} mt-1`} /></label>
      </div>
      <h2 className="mb-2 font-semibold">Silenciar categorias</h2>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORIES) as ReminderCategory[]).map((c) => {
          const muted = s.mutedCategories.includes(c);
          return (
            <button key={c} aria-pressed={muted} onClick={() => toggleMute(c)} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${muted ? "border-destructive/50 text-destructive" : "text-muted-foreground"}`}>
              {muted ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />} {CATEGORIES[c].label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ReminderDialog({ open, onOpenChange, reminder }: { open: boolean; onOpenChange: (o: boolean) => void; reminder: Reminder | null }) {
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [description, setDescription] = useState(reminder?.description ?? "");
  const [category, setCategory] = useState<ReminderCategory>(reminder?.category ?? "agua");
  const [times, setTimes] = useState<string[]>(reminder?.times.length ? reminder.times : ["09:00"]);
  const [days, setDays] = useState<number[]>(reminder?.days ?? []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = [...new Set(times.filter(Boolean))].sort();
    if (!title.trim()) return;
    if (clean.length === 0) { toast.error("Adicione pelo menos um horário."); return; }
    const fields = { title: title.trim(), category, times: clean, days: days.length === 7 ? [] : [...days].sort(), ...(description.trim() ? { description: description.trim() } : {}) };
    update((d) => ({
      ...d,
      reminders: reminder
        ? d.reminders.map((r) => (r.id === reminder.id ? (({ description: _d, ...rest }) => ({ ...rest, ...fields }))(r) : r))
        : [...d.reminders, { id: uid(), enabled: true, createdAt: today(), ...fields }],
    }));
    toast.success(reminder ? "Lembrete atualizado." : "Lembrete criado.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[92vw] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader><DialogTitle>{reminder ? "Editar lembrete" : "Novo lembrete"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: Beber um copo de água)" className={field} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" className={field} />
          <label className="block text-sm text-muted-foreground">
            Categoria
            <select value={category} onChange={(e) => setCategory(e.target.value as ReminderCategory)} className={`${field} mt-1`}>
              {(Object.keys(CATEGORIES) as ReminderCategory[]).map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
            </select>
          </label>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Horários</p>
            <div className="space-y-2">
              {times.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <input type="time" required value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} className={field} aria-label={`Horário ${i + 1}`} />
                  {times.length > 1 && <button type="button" aria-label="Remover horário" onClick={() => setTimes(times.filter((_, j) => j !== i))} className="px-2 text-muted-foreground"><X className="h-4 w-4" /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setTimes([...times, ""])} className="flex h-10 w-full items-center justify-center gap-1 rounded-xl border border-dashed text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Adicionar horário</button>
            </div>
          </div>
          <DayPicker days={days} setDays={setDays} />
          <button className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">Salvar</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
