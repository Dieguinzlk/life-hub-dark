import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData, update, brl, fmtDate, today, uid, getGoalSavedAmount, FinanceGoal, Contribution } from "../lib/store";

export const Route = createFileRoute("/metas")({
  component: MetasPage,
});

function MetasPage() {
  const data = useData();
  const goals = data.financeGoals || [];

  const [activeTab, setActiveTab] = useState<"metas" | "calendario" | "simulador">("metas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinanceGoal | null>(null);
  const [contributionModalGoal, setContributionModalGoal] = useState<FinanceGoal | null>(null);

  // Estado do Calendário Interativo
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [currentYearMonth, setCurrentYearMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Formulário de Meta
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "monthly">("monthly");
  const [notes, setNotes] = useState("");

  // Formulário de Contribuição
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(today());
  const [contribGoalId, setContribGoalId] = useState("");
  const [contribNotes, setContribNotes] = useState("");

  // Simulador de Rendimentos
  const [simRate, setSimRate] = useState("10");
  const [simYears, setSimYears] = useState("1");

  // Totais Gerais
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + getGoalSavedAmount(g), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const progressPercent = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  // Todas as contribuições unificadas
  const allContributions: (Contribution & { goalName: string })[] = goals.flatMap((g) =>
    (g.contributions || []).map((c) => ({ ...c, goalName: g.name }))
  );

  // Mapeamento de depósitos por dia (YYYY-MM-DD -> total)
  const dailySavedMap: Record<string, number> = {};
  allContributions.forEach((c) => {
    dailySavedMap[c.date] = (dailySavedMap[c.date] || 0) + c.amount;
  });

  // Funções para manipular metas e contribuições
  function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const initial = initialAmount ? parseFloat(initialAmount) : 0;

    if (!name.trim() || isNaN(target) || target <= 0) {
      alert("Por favor, insira um nome válido e um valor-alvo positivo.");
      return;
    }

    update((draft) => {
      if (selectedGoal) {
        draft.financeGoals = draft.financeGoals.map((g) => {
          if (g.id === selectedGoal.id) {
            const updated = {
              ...g,
              name,
              targetAmount: target,
              initialAmount: initial,
              deadline: deadline || undefined,
              frequency,
              notes: notes || undefined,
            };
            updated.currentAmount = getGoalSavedAmount(updated);
            return updated;
          }
          return g;
        });
      } else {
        const newGoal: FinanceGoal = {
          id: uid(),
          name,
          targetAmount: target,
          currentAmount: initial,
          initialAmount: initial,
          startDate: today(),
          deadline: deadline || undefined,
          frequency,
          contributions: [],
          createdAt: today(),
          notes: notes || undefined,
        };
        draft.financeGoals.push(newGoal);
      }
      return draft;
    });

    closeModal();
  }

  function handleDeleteGoal(id: string) {
    if (!confirm("Deseja realmente excluir esta meta?")) return;
    update((draft) => {
      draft.financeGoals = draft.financeGoals.filter((g) => g.id !== id);
      return draft;
    });
  }

  function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    const targetGoalId = contributionModalGoal ? contributionModalGoal.id : contribGoalId;
    if (!targetGoalId || !contribAmount) return;

    const amount = parseFloat(contribAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Informe um valor válido de contribuição.");
      return;
    }

    const newContribution: Contribution = {
      id: uid(),
      goalId: targetGoalId,
      amount,
      date: contribDate || today(),
      notes: contribNotes || undefined,
    };

    update((draft) => {
      draft.financeGoals = draft.financeGoals.map((g) => {
        if (g.id === targetGoalId) {
          const contributions = Array.isArray(g.contributions) ? g.contributions : [];
          const updatedContributions = [...contributions, newContribution];
          const savedTotal = (g.initialAmount ?? 0) + updatedContributions.reduce((a, c) => a + c.amount, 0);
          return {
            ...g,
            contributions: updatedContributions,
            currentAmount: savedTotal,
          };
        }
        return g;
      });
      return draft;
    });

    setContributionModalGoal(null);
    setContribGoalId("");
    setContribAmount("");
    setContribNotes("");
    setContribDate(today());
  }

  function openEditModal(goal: FinanceGoal) {
    setSelectedGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setInitialAmount((goal.initialAmount ?? goal.currentAmount ?? 0).toString());
    setDeadline(goal.deadline || "");
    setFrequency(goal.frequency || "monthly");
    setNotes(goal.notes || "");
    setIsModalOpen(true);
  }

  function closeModal() {
    setSelectedGoal(null);
    setName("");
    setTargetAmount("");
    setInitialAmount("");
    setDeadline("");
    setFrequency("monthly");
    setNotes("");
    setIsModalOpen(false);
  }

  // Métodos auxiliares para montar a grade de dias do calendário
  const daysInMonth = new Date(currentYearMonth.year, currentYearMonth.month + 1, 0).getDate();
  const firstDayIndex = new Date(currentYearMonth.year, currentYearMonth.month, 1).getDay();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  function changeMonth(delta: number) {
    setCurrentYearMonth((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      return { year: newYear, month: newMonth };
    });
  }

  // Contribuições do dia selecionado
  const selectedDayContributions = allContributions.filter((c) => c.date === selectedDate);
  const selectedDayTotal = dailySavedMap[selectedDate] || 0;

  return (
    <div className="pb-28 pt-6 px-4 max-w-3xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            🎯 Metas Financeiras
          </h1>
          <p className="text-xs text-slate-400">Acompanhamento e crescimento patrimonial</p>
        </div>
        <button
          onClick={() => {
            setSelectedGoal(null);
            setIsModalOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-3.5 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
        >
          + Nova Meta
        </button>
      </div>

      {/* Navegação entre Abas do Módulo */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl mb-5">
        <button
          onClick={() => setActiveTab("metas")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "metas" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          Metas & Depósitos
        </button>
        <button
          onClick={() => setActiveTab("calendario")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "calendario" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          📅 Calendário Diário
        </button>
        <button
          onClick={() => setActiveTab("simulador")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "simulador" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          📈 Rendimentos
        </button>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Guardado</span>
          <div className="text-lg font-bold text-emerald-400 mt-1">{brl(totalSaved)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Alvo: {brl(totalTarget)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Falta Guardar</span>
          <div className="text-lg font-bold text-amber-400 mt-1">{brl(totalRemaining)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{progressPercent.toFixed(1)}% concluído</div>
        </div>
      </div>

      {/* Conteúdo da Aba 1: Metas & Depósitos */}
      {activeTab === "metas" && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-400 text-sm mb-2">Nenhuma meta cadastrada ainda.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-emerald-400 text-sm font-medium hover:underline"
              >
                Criar a sua primeira meta agora
              </button>
            </div>
          ) : (
            goals.map((goal) => {
              const saved = getGoalSavedAmount(goal);
              const target = goal.targetAmount;
              const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
              const contributions = Array.isArray(goal.contributions) ? goal.contributions : [];

              return (
                <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white text-base">{goal.name}</h3>
                      {goal.deadline && (
                        <span className="text-xs text-slate-400 block">Prazo: {fmtDate(goal.deadline)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setContributionModalGoal(goal);
                          setContribDate(today());
                        }}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        + Depositar
                      </button>
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-emerald-400 font-semibold">{brl(saved)}</span>
                    <span className="text-slate-400">Meta: {brl(target)}</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {contributions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-medium text-slate-400 block mb-1">
                        Histórico de depósitos:
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {contributions.slice(-3).reverse().map((c) => (
                          <div
                            key={c.id}
                            className="flex justify-between text-xs text-slate-300 bg-slate-950/40 px-2 py-1 rounded"
                          >
                            <span>
                              {fmtDate(c.date)} {c.notes ? `- ${c.notes}` : ""}
                            </span>
                            <span className="text-emerald-400 font-medium">+{brl(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Calendário Diário de Depósitos */}
      {activeTab === "calendario" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            {/* Controladores de Mês */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg text-xs"
              >
                ◀
              </button>
              <h3 className="font-bold text-white text-sm">
                {monthNames[currentYearMonth.month]} {currentYearMonth.year}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg text-xs"
              >
                ▶
              </button>
            </div>

            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 font-semibold mb-2">
              <span>DOM</span>
              <span>SEG</span>
              <span>TER</span>
              <span>QUA</span>
              <span>QUI</span>
              <span>SEX</span>
              <span>SÁB</span>
            </div>

            {/* Grade de Dias do Mês */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {/* Espaços em branco antes do primeiro dia */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-9" />
              ))}

              {/* Dias reais do mês */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const monthStr = String(currentYearMonth.month + 1).padStart(2, "0");
                const dayStr = String(dayNum).padStart(2, "0");
                const dateKey = `${currentYearMonth.year}-${monthStr}-${dayStr}`;

                const daySaved = dailySavedMap[dateKey] || 0;
                const isSelected = selectedDate === dateKey;
                const isToday = dateKey === today();

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all border ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/20 text-white font-bold shadow-md shadow-emerald-500/10"
                        : isToday
                        ? "border-slate-700 bg-slate-800 text-emerald-400 font-semibold"
                        : "border-slate-800/80 bg-slate-950/50 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{dayNum}</span>
                    {daySaved > 0 && (
                      <span className="text-[8px] text-emerald-400 font-bold leading-none mt-0.5">
                        ●
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Detalhado do Dia Selecionado */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div>
                <span className="text-xs text-slate-400 font-medium">Dia Selecionado:</span>
                <h4 className="text-sm font-bold text-white">{fmtDate(selectedDate)}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Guardado no dia:</span>
                <div className="text-base font-bold text-emerald-400">{brl(selectedDayTotal)}</div>
              </div>
            </div>

            {/* Detalhes de depósitos no dia */}
            {selectedDayContributions.length === 0 ? (
              <p className="text-xs text-slate-500 my-3 text-center">
                Nenhum depósito registrado neste dia.
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {selectedDayContributions.map((c) => (
                  <div key={c.id} className="bg-slate-950 p-2.5 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-white block">{c.goalName}</span>
                      {c.notes && <span className="text-[10px] text-slate-400">{c.notes}</span>}
                    </div>
                    <span className="font-bold text-emerald-400">+{brl(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de adicionar depósito no dia selecionado */}
            {goals.length > 0 && (
              <button
                onClick={() => {
                  setContribGoalId(goals[0]?.id || "");
                  setContribDate(selectedDate);
                  setContributionModalGoal(null);
                  setIsModalOpen(false);
                }}
                className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs py-2 rounded-xl font-semibold transition-colors mt-2"
              >
                + Guardar valor para este dia ({fmtDate(selectedDate)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: Simulador Opcional de Rendimentos */}
      {activeTab === "simulador" && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm mb-1">📈 Simulação de Rendimentos Futuros</h3>
            <p className="text-xs text-slate-400">
              Projeção matemática com base no saldo atual guardado. Os valores estimados não são garantidos nem alteram o saldo real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Taxa Anual Estimada (%)</label>
              <input
                type="number"
                value={simRate}
                onChange={(e) => setSimRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prazo (Anos)</label>
              <input
                type="number"
                value={simYears}
                onChange={(e) => setSimYears(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {(() => {
            const rate = parseFloat(simRate) / 100 || 0;
            const years = parseFloat(simYears) || 0;
            const projected = totalSaved * Math.pow(1 + rate, years);
            const yieldAmount = Math.max(0, projected - totalSaved);

            return (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Saldo Real Atual:</span>
                  <span className="text-white font-semibold">{brl(totalSaved)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rendimento Estimado:</span>
                  <span className="text-emerald-400 font-semibold">+{brl(yieldAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                  <span className="text-slate-200 font-bold">Projeção Futura:</span>
                  <span className="text-emerald-400 font-bold">{brl(projected)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal de Criar/Editar Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {selectedGoal ? "Editar Meta" : "Nova Meta Financeira"}
            </h2>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Meta</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reserva de Emergência"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Prazo Final</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Frequência</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as "daily" | "monthly")}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="daily">Diária</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Contribuição */}
      {(contributionModalGoal || contribGoalId) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Registrar Contribuição</h2>
            <p className="text-xs text-slate-400 mb-4">
              Data: {fmtDate(contribDate)}
            </p>
            <form onSubmit={handleAddContribution} className="space-y-4">
              {!contributionModalGoal && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Meta Relacionada</label>
                  <select
                    value={contribGoalId}
                    onChange={(e) => setContribGoalId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Valor Depositado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="150.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setContributionModalGoal(null);
                    setContribGoalId("");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Confirmar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
