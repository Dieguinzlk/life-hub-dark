import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Bell,
  Target,
  Flame,
  ArrowUpRight
} from "lucide-react";
import { useData, today, brl } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: HomeDashboard,
});

function HomeDashboard() {
  const data = useData();
  const refMonth = today().slice(0, 7);

  // Cálculos Financeiros Reais
  const monthTx = data.transactions.filter((t) => t.date.startsWith(refMonth));
  const receitas = monthTx.filter((t) => t.type === "receita").reduce((acc, t) => acc + t.amount, 0);
  const despesas = monthTx.filter((t) => t.type === "despesa").reduce((acc, t) => acc + t.amount, 0);
  const saldo = receitas - despesas;

  // Hábitos e Rotina Reais
  const todayStr = today();
  const totalHabitos = data.habits.length;
  const habitosFeitosHoje = data.habits.filter((h) => h.doneDates.includes(todayStr)).length;
  const scoreDiario = totalHabitos > 0 ? Math.round((habitosFeitosHoje / totalHabitos) * 10) : 0;

  // Contas a Vencer
  const contasPendentes = data.bills.filter((b) => !b.paid).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 p-4 pb-28 space-y-6 max-w-md mx-auto font-sans antialiased">
      
      {/* 1. Header do Usuário */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 p-[2px]">
            <div className="h-full w-full bg-[#0D0E15] rounded-full flex items-center justify-center font-bold text-emerald-400">
              D
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Boa noite,</p>
            <h1 className="text-lg font-bold text-white tracking-tight">Dieguin 👋</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-2xl bg-[#13151E] border border-white/5 flex items-center justify-center text-slate-400">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. Banner Principal: Orçamento e Balanço */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#141824] to-[#0D0F17] p-5 border border-white/10 shadow-2xl space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Saldo Atual do Mês</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">{brl(saldo)}</span>
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

      {/* 3. Card do Assistente de IA */}
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
          Sua rotina está em andamento. Acesse o chat para analisar suas economias ou organizar os próximos passos do dia.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link to="/assistente" className="flex items-center justify-center gap-2 bg-[#171B26] hover:bg-[#1E2332] text-xs font-medium text-slate-200 p-2.5 rounded-xl border border-white/5 transition">
            📊 Analisar finanças
          </Link>
          <Link to="/assistente" className="flex items-center justify-center gap-2 bg-[#171B26] hover:bg-[#1E2332] text-xs font-medium text-slate-200 p-2.5 rounded-xl border border-white/5 transition">
            🎯 Planejar dia
          </Link>
        </div>
      </section>

      {/* 4. Score Diário & Hábitos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Hábitos do Dia</h2>
          </div>
          <Link to="/rotina" className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
            Ver rotina <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl bg-[#12141F] p-4 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 flex items-center justify-center bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 font-extrabold text-base">
              {scoreDiario}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Score Diário</h3>
              <p className="text-xs text-emerald-400 font-medium">
                {scoreDiario >= 7 ? "Dia produtivo! 🏆" : "Em andamento..."}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-emerald-400">{habitosFeitosHoje}/{totalHabitos} feitos</p>
            <p className="text-[11px] text-slate-500">Hoje</p>
          </div>
        </div>
      </section>

      {/* 5. Contas a Vencer */}
      {contasPendentes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Próximas Contas</h2>
            <Link to="/financas" className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
              Ver finanças <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {contasPendentes.map((conta) => (
              <div key={conta.id} className="bg-[#131520] rounded-2xl p-4 border border-white/5 space-y-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 truncate">{conta.description}</p>
                  <p className="text-base font-bold text-white">{brl(conta.amount)}</p>
                </div>
                <p className="text-[10px] text-amber-400 font-medium">Vence: {conta.dueDate}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
