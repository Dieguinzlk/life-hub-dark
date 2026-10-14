import { useEffect } from "react";
import { toast } from "sonner";
import { getData } from "@/lib/store";
import { CATEGORIES, inQuietHours, occurrencesFor } from "@/lib/reminders";

const SENT_KEY = "gerenciador-de-vida:notificados";
const CHECK_MS = 30_000;
const WINDOW_MS = 10 * 60_000;

function loadSent(todayIso: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
    return new Set(parsed.date === todayIso ? parsed.keys : []);
  } catch {
    return new Set();
  }
}

async function notify(title: string, body: string, tag: string) {
  const data = getData();
  if (data.settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: "/lembretes" } });
      return;
    }
  }
  toast(title, { description: body });
}

// Fires reminders while the app is open or recently backgrounded. Delivery with the
// app fully closed requires server-side Web Push, which needs cloud storage.
export function ReminderScheduler() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const check = () => {
      const now = new Date();
      const data = getData();
      if (inQuietHours(data.settings, now)) return;
      const occ = occurrencesFor(data, now);
      const iso = occ[0]?.date ?? "";
      const sent = loadSent(iso);
      let changed = false;
      for (const o of occ) {
        if (o.status === "concluido" || data.settings.mutedCategories.includes(o.reminder.category)) continue;
        const [h = 0, m = 0] = o.time.split(":").map(Number);
        const due = o.snoozedUntil ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
        const key = `${o.reminder.id}|${o.date}|${o.time}|${o.snoozedUntil?.getTime() ?? 0}`;
        const diff = now.getTime() - due.getTime();
        if (diff < 0 || diff > WINDOW_MS || sent.has(key)) continue;
        sent.add(key);
        changed = true;
        void notify(o.reminder.title, o.reminder.description || CATEGORIES[o.reminder.category].label, key);
      }
      if (changed) localStorage.setItem(SENT_KEY, JSON.stringify({ date: iso, keys: [...sent] }));
    };

    check();
    const id = window.setInterval(check, CHECK_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
