import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Sparkles, 
  ChevronRight, 
  Bell, 
  Flame, 
  TrendingDown, 
  TrendingUp,
  Wallet,
  CheckCircle2,
  Circle,
  ArrowRight
} from "lucide-react";
import { useData, today, brl, update } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: HomeDashboard,
});

export function HomeDashboard() {
  const data = useData();
  const [activeTab, setActiveTab] = useState<"overview" | "transactions">("overview");
  const refMonth = today().slice(0, 7);

  // Finanças do mês atual
  const monthTx = data.transactions.filter((t) => t.date.startsWith(refMonth));
  const receitas = monthTx.filter((t) => t.type === "receita").reduce((acc, t) => acc + t.amount, 0);
  const despesas = monthTx.filter((t) => t.type === "despesa").reduce((acc, t) => acc + t.amount, 0);
  const saldoTotal = receitas - despesas;

  // Hábitos do dia
  const todayStr = today();
  const habits = data.habits || [];
  const habitsDoneToday = habits.filter((h) => h.doneDates.includes(todayStr)).length;
  const habitScore = habits.length > 0 ? Math.round((habitsDoneToday / habits.length) * 10) : 0;

  const toggleHabitToday = (habitId: string) => {
    update((d) => ({
      ...d,
      habits: d.habits.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.doneDates.includes(todayStr);
        return {
          ...h,
          doneDates: exists ? h.doneDates.filter((date) => date !== todayStr) : [...h.doneDates, todayStr],
        };
      }),
    }));
  };

  // Contas pendentes
  const contasPendentes = data.bills.filter((b) => !b.paid).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#07080C] text-slate-100 p-4 pb-32 space-y-6 max-w-md mx-auto font-sans antialiased">
      
      {/* 1. Header do Usuário */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-200 p-[2px]">
            <div className="h-full w-full bg-[#0D0E15] rounded-full flex items-center justify-center font-bold text-emerald-400">
              D
            </div>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Bem-vindo de volta,</p>
            <h1 className="text-base font-bold text-white tracking-tight">Dieguin 👋</h1>
          </div>
        </div>
        <button className="h-10 w-10 rounded-2xl bg-[#12141D] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* 2. Banner Principal: Orçamento e Balanço */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#141824] to-[#0D0F17] p-5 border border-white/10 shadow-2xl space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Saldo Atual do Mês</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">{brl(saldoTotal)}</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Grid de Balanço Rápido */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#1A1D2B]/80 rounded-2xl p-3.5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">Receitas</span>
            </div>
            <p className="text-lg font-bold text-white">{brl(receitas)}</p>
          </div>

          <div className="bg-[#1A1D2B]/80 rounded-2xl p-3.5 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <TrendingDown className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-medium">Despesas</span>
            </div>
            <p className="text-lg font-bold text-rose-400">{brl(despesas)}</p>
          </div>
        </div>
      </section>

      {/* 3. Card do Assistente de IA (Estilo Premium) */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#10141D] to-[#121622] p-5 border border-emerald-500/30 shadow-lg space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-4 w-4 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Assistente Pessoal</h2>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">IA · Inteligência do seu dia</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Pronto para organizar suas finanças ou planejar suas metas? Converse com o Gemini agora.
        </p>

        <Link 
          to="/assistente" 
          className="flex items-center justify-between w-full bg-[#171B26] hover:bg-[#1E2332] text-xs font-bold text-emerald-400 p-3 rounded-2xl border border-emerald-500/20 transition group"
        >
          <span>Abrir Assistente Inteligente</span>
          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition" />
        </Link>
      </section>

      {/* 4. Rotina & Hábitos do Dia */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Hábitos de Hoje</h3>
          <Link to="/rotina" className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
            Gerenciar rotina <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card de Score Diário */}
        <div className="rounded-3xl bg-[#12141D] p-4 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex items-center justify-center bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 font-extrabold text-base">
              {habitScore}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Score de Produtividade</h4>
              <p className="text-xs text-emerald-400 font-medium">
                {habitsDoneToday} de {habits.length} concluídos
              </p>
            </div>
          </div>
        </div>

        {/* Lista interativa rápida de hábitos */}
        <div className="space-y-2">
          {habits.slice(0, 3).map((h) => {
            const isDone = h.doneDates.includes(todayStr);
            return (
              <div
                key={h.id}
                onClick={() => toggleHabitToday(h.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                  isDone 
                    ? "bg-[#10151E] border-emerald-500/30 text-slate-300" 
                    : "bg-[#12141D] border-white/5 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600 shrink-0" />
                  )}
                  <span className={`text-xs font-semibold ${isDone ? "line-through text-slate-500" : "text-white"}`}>
                    {h.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1A1D2B] px-2 py-0.5 rounded-md text-slate-400">
                  Hábito
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Próximos Vencimentos */}
      {contasPendentes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Próximas Contas</h3>
            <Link to="/financas" className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
              Ver finanças <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {contasPendentes.map((conta) => (
              <div key={conta.id} className="bg-[#12141D] rounded-3xl p-4 border border-white/5 space-y-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300 truncate">{conta.description}</p>
                  <p className="text-base font-extrabold text-white mt-0.5">{brl(conta.amount)}</p>
                </div>
                <p className="text-[10px] font-semibold text-amber-400">Vence: {conta.dueDate}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
