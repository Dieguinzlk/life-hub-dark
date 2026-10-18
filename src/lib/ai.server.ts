import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

const date = z.string().nullable().describe("Data no formato AAAA-MM-DD, ou null para hoje");
const exercise = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number().nullable().describe("Carga em kg ou null"),
});

const out = z.object({ ok: z.boolean(), message: z.string() });

// Ferramentas sem `execute`: o celular mostra uma confirmação e só então altera os dados locais.
export const tools = {
  add_transaction: tool({
    description: "Registrar uma receita ou despesa",
    inputSchema: z.object({
      type: z.enum(["receita", "despesa"]),
      description: z.string(),
      amount: z.number().describe("Valor positivo em reais"),
      category: z.string(),
      date,
    }),
    outputSchema: out,
  }),
  add_bill: tool({
    description: "Cadastrar uma conta a pagar",
    inputSchema: z.object({ description: z.string(), amount: z.number(), dueDate: z.string().describe("AAAA-MM-DD") }),
    outputSchema: out,
  }),
  add_task: tool({
    description: "Criar uma tarefa na rotina",
    inputSchema: z.object({
      title: z.string(),
      date,
      time: z.string().nullable().describe("HH:MM ou null"),
      priority: z.enum(["alta", "media", "baixa"]).nullable(),
    }),
    outputSchema: out,
  }),
  complete_task: tool({
    description: "Marcar uma tarefa existente como concluída (precisa do id dos dados compartilhados)",
    inputSchema: z.object({ taskId: z.string() }),
    outputSchema: out,
  }),
  delete_task: tool({
    description: "Excluir uma tarefa existente (precisa do id dos dados compartilhados)",
    inputSchema: z.object({ taskId: z.string() }),
    outputSchema: out,
  }),
  add_habit: tool({ description: "Criar um novo hábito", inputSchema: z.object({ name: z.string() }), outputSchema: out }),
  add_finance_goal: tool({
    description: "Criar uma meta financeira",
    inputSchema: z.object({
      name: z.string(),
      targetAmount: z.number(),
      currentAmount: z.number().nullable(),
      deadline: z.string().nullable().describe("AAAA-MM-DD ou null"),
    }),
    
