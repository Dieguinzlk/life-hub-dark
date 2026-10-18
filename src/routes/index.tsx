import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { 
  Sparkles, 
  ChevronRight, 
  ArrowUpRight, 
  Bell, 
  Flame, 
  Wallet, 
  TrendingDown, 
  TrendingUp,
  CreditCard
} from "lucide-react";
import { useData, today, brl } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: HomeDashboard,
});

export function HomeDashboard() {
  const data = useData();
  const [activeTab, setActiveTab] = useState<"categories" | "transactions">("categories");
  const refMonth = today().slice(0, 7);

  // Dados financeiros do mês
  const monthTx = data.transactions.filter((t) => t.date.startsWith(refMonth));
  const receitas = monthTx.filter((t) => t.type === "receita").reduce((acc, t) => acc + t.amount, 0);
  const despesas = monthTx.filter((t) => t.type === "despesa").reduce((acc, t) => acc + t.amount, 0);
  const saldoTotal = receitas - despesas;

  // Agrupamento por Categoria para o Gráfico Donut
  const categoriesMap = monthTx
    .filter((t) => t.type === "despesa")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(categoriesMap).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];

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

      {/* 2. Seção de Saldo e Visão Geral (Estilo Card Flutuante) */}
      <section className="space-y-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Seu Orçamento</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h2 className="text-3xl font-black text-white tracking-tight">{brl(saldoTotal)}</h2>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              BRL
            </span>
          </div>
        </div>

        {/* 2 Cards de Indicadores Curvos estilo Dribbble */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#12141D] rounded-3xl p-4 border border-white/5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-emerald-400">+12%</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Receita Líquida</p>
              <p className="text-lg font-bold text-white mt-0.5">{brl(receitas)}</p>
            </div>
          </div>

          <div className="bg-[#12141D] rounded-3xl p-4 border border-white/5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-rose-400">-5%</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Gastos Planejados</p>
              <p className="text-lg font-bold text-white mt-0.5">{brl(despesas)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Gráfico Donut de Despesas Planejadas (Gráfico de Rosca Neumorphic) */}
      <section className="bg-[#12141D] rounded-3xl p-5 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Distribuição de Gastos</h3>
          
          {/* Toggle de Abas Categorias / Transações */}
          <div className="flex bg-[#0A0B10] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab("categories")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                activeTab === "categories" ? "bg-[#1E2230] text-emerald-400" : "text-slate-400"
              }`}
            >
              Categorias
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                activeTab === "transactions" ? "bg-[#1E2230] text-emerald-400" : "text-slate-400"
              }`}
            >
              Lançamentos
            </button>
          </div>
        </div>

        {activeTab === "categories" ? (
          <div className="flex items-center justify-between gap-4 py-2">
            {/* Gráfico Donut */}
            <div className="h-32 w-32 relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: "Livre", value: 1 }]}
                    innerRadius={38}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 font-medium">Total</span>
                <span className="text-xs font-bold text-white">{brl(despesas)}</span>
              </div>
            </div>

            {/* Legenda de Categorias */}
            <div className="flex-1 space-y-2">
              {pieData.slice(0, 3).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-slate-300 truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-white shrink-0">{brl(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {monthTx.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A0B10] border border-white/5 text-xs">
                <div>
                  <p className="font-semibold text-white">{tx.description}</p>
                  <p className="text-[10px] text-slate-400">{tx.category} · {tx.date}</p>
                </div>
                <span className={`font-bold ${tx.type === "receita" ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.type === "receita" ? "+" : "-"}{brl(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Próximos Pagamentos (Bento Grid Style) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Próximos Vencimentos</h3>
          <Link to="/financas" className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {contasPendentes.map((conta) => (
            <div key={conta.id} className="bg-[#12141D] rounded-3xl p-4 border border-white/5 space-y-2 relative">
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

    </div>
  );
}
