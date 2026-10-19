import { Link } from "@tanstack/react-router";
import { Home, Wallet, ListChecks, Dumbbell, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

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


export function BottomNav() {
  const item = "h-12 min-w-0 flex-1 flex-col gap-1 rounded-full px-0 text-[9px] text-muted-foreground transition-all duration-200 hover:text-foreground [&_svg]:size-[18px]";
  const active = { className: `${item} bg-secondary text-primary` };
  return (
    <nav aria-label="Navegação principal" className="pill-nav fixed inset-x-4 z-40 mx-auto max-w-[416px] rounded-full border p-1.5 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" className={item}><Link to="/" activeProps={active} activeOptions={{ exact: true, includeHash: true }}>
          <Home className="h-5 w-5" /> Início
        </Link></Button>
        <Button asChild variant="ghost" className={item}><Link to="/financas" activeProps={active}>
          <Wallet className="h-5 w-5" /> Finanças
        </Link></Button>
        <Button asChild variant="ghost" className={item}><Link to="/rotina" activeProps={active}>
          <ListChecks className="h-5 w-5" /> Rotina
        </Link></Button>
        <Button asChild variant="ghost" className={item}><Link to="/treinos" activeProps={active}>
          <Dumbbell className="h-5 w-5" /> Treinos
        </Link></Button>
        <Button asChild variant="ghost" className={item}><Link to="/metas" activeProps={active}>
          <Target className="h-5 w-5" /> Metas
        </Link></Button>
        <Button asChild className="h-12 w-12 shrink-0 rounded-full bg-neon p-0 text-neon-foreground hover:bg-neon/90 [&_svg]:size-5"><Link to="/assistente" aria-label="Assistente IA" title="Assistente IA">
          <Sparkles />
        </Link></Button>
      </div>
    </nav>
  );
}
