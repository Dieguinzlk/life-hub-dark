import { Link } from "@tanstack/react-router";
import { Home, Wallet, ListChecks, Dumbbell, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

export function Page({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border bg-card p-4 ${className}`}>{children}</section>;
}

const soon = () => toast("Este módulo chega na próxima etapa 🚀");

export function BottomNav() {
  const item = "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground";
  const active = { className: `${item} text-primary` };
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md">
        <Link to="/" className={item} activeProps={active} activeOptions={{ exact: true }}>
          <Home className="h-5 w-5" /> Início
        </Link>
        <Link to="/financas" className={item} activeProps={active}>
          <Wallet className="h-5 w-5" /> Finanças
        </Link>
        <button onClick={soon} className={item}>
          <ListChecks className="h-5 w-5" /> Rotina
        </button>
        <button onClick={soon} className={item}>
          <Dumbbell className="h-5 w-5" /> Treinos
        </button>
        <Link to="/ajustes" className={item} activeProps={active}>
          <Settings className="h-5 w-5" /> Ajustes
        </Link>
      </div>
    </nav>
  );
}
