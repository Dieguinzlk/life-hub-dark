import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData, update, brl, fmtDate, today, uid, getGoalSavedAmount, FinanceGoal, Contribution } from "../lib/store";

export const Route = createFileRoute("/metas")({
  component: MetasPage,
});

function MetasPage() {
  const data = useData();
  const goals = data.financeGoals || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinanceGoal | null>(null);
  const [contributionModalGoal, setContributionModalGoal] = useState<FinanceGoal | null>(null);

  // Estados do formulário de Meta
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "monthly">("monthly");
  const [notes, setNotes] = useState("");

  // Estados do formulário de Contribuição
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(today());
  const [contribNotes, setContribNotes] = useState("");

  // Cálculos de Resumo Geral
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + getGoalSavedAmount(g), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const progressPercent = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetAmount) return;

    const target = parseFloat(targetAmount);
    const initial = initialAmount ? parseFloat(initialAmount) : 0;

    update((draft) => {
      if (selectedGoal) {
        draft.financeGoals = draft.financeGoals.map((g) =>
          g.id === selectedGoal.id
            ? {
                ...g,
                name,
                targetAmount: target,
                initialAmount: initial,
                deadline: deadline || undefined,
                frequency,
                notes: notes || undefined,
              }
            : g
        );
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
    if (!contributionModalGoal || !contribAmount) return;

    const amount = parseFloat(contribAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newContribution: Contribution = {
      id: uid(),
      goalId: contributionModalGoal.id,
      amount,
      date: contribDate || today(),
      notes: contribNotes || undefined,
    };

    update((draft) => {
      draft.financeGoals = draft.financeGoals.map((g) => {
        if (g.id === contributionModalGoal.id) {
          const contributions = Array.isArray(g.contributions) ? g.contributions : [];
          return {
            ...g,
            contributions: [...contributions, newContribution],
          };
        }
        return g;
      });
      return draft;
    });

    setContributionModalGoal(null);
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

  return (
    <div className="pb-24 pt-6 px-4 max-w-3xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            🎯 Metas Financeiras
          </h1>
          <p className="text-sm text-slate-400">Acompanhe seus objetivos e crescimento patrimonial</p>
        </div>
        <button
          onClick={() => {
            setSelectedGoal(null);
            setIsModalOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
        >
          + Nova Meta
        </button>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Guardado</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{brl(totalSaved)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Alvo: {brl(totalTarget)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Falta Guardar</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{brl(totalRemaining)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{progressPercent.toFixed(1)}% concluído</div>
        </div>
      </div>

      {/* Barra de Progresso Geral */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6">
        <div className="flex justify-between text-xs font-semibold mb-2 text-slate-300">
          <span>Progresso Geral</span>
          <span>{progressPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lista de Metas */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-400 text-sm mb-2">Nenhuma meta cadastrada ainda.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-emerald-400 text-sm font-medium hover:underline"
            >
              Criar sua primeira meta agora
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
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base">{goal.name}</h3>
                    {goal.deadline && (
                      <span className="text-xs text-slate-400">Prazo: {fmtDate(goal.deadline)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setContributionModalGoal(goal)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      + Depositar
                    </button>
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-emerald-400 font-semibold">{brl(saved)}</span>
                  <span className="text-slate-400">Meta: {brl(target)}</span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {contributions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-xs font-medium text-slate-400 block mb-1">Últimas contribuições:</span>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {contributions.slice(-3).reverse().map((c) => (
                        <div key={c.id} className="flex justify-between text-xs text-slate-300 bg-slate-950/40 px-2 py-1 rounded">
                          <span>{fmtDate(c.date)} {c.notes ? `- ${c.notes}` : ""}</span>
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
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Observações (Opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
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
      {contributionModalGoal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Registrar Contribuição</h2>
            <p className="text-xs text-slate-400 mb-4">Meta: {contributionModalGoal.name}</p>
            <form onSubmit={handleAddContribution} className="space-y-4">
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
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nota / Origem (Opcional)</label>
                <input
                  type="text"
                  value={contribNotes}
                  onChange={(e) => setContribNotes(e.target.value)}
                  placeholder="Ex: Sobra do salário"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContributionModalGoal(null)}
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
