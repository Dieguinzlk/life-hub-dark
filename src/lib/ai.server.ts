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
    outputSchema: out,
  }),
  add_health_goal: tool({
    description: "Criar uma meta de saúde (peso, treinos, hábito ou outra)",
    inputSchema: z.object({
      name: z.string(),
      category: z.enum(["peso", "treinos", "habito", "outra"]),
      currentValue: z.number(),
      targetValue: z.number(),
      unit: z.string(),
      deadline: z.string().nullable(),
    }),
    outputSchema: out,
  }),
  create_workout_plan: tool({
    description: "Criar um plano de treino com exercícios",
    inputSchema: z.object({ name: z.string(), exercises: z.array(exercise) }),
    outputSchema: out,
  }),
  add_exercise_to_plan: tool({
    description: "Adicionar exercício a um plano existente (precisa do id do plano)",
    inputSchema: z.object({ planId: z.string(), exercise }),
    outputSchema: out,
  }),
  log_workout: tool({
    description: "Registrar um treino concluído de um plano existente",
    inputSchema: z.object({ planId: z.string(), date, notes: z.string().nullable() }),
    outputSchema: out,
  }),
};

function errorText(error: unknown): string {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (status === 429) return "Limite de uso atingido no momento. Aguarde alguns instantes e tente de novo.";
  if (status === 401 || status === 403) return "O Gemini recusou o acesso. Verifique a chave e as permissões no servidor.";
  if (status === 400) return "O Gemini não aceitou a solicitação. Verifique o modelo configurado no servidor.";
  return "Não foi possível falar com a IA agora. Verifique a conexão e tente de novo.";
}

export async function handleChat(request: Request): Promise<Response> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return Response.json({ error: "IA não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente do servidor." }, { status: 500 });
  const google = createGoogleGenerativeAI({ apiKey });
  const model = process.env["GEMINI_MODEL"] || "gemini-2.5-flash";

  let body: { messages?: UIMessage[]; snapshot?: unknown; today?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  if (messages.length === 0) return Response.json({ error: "Mensagem vazia." }, { status: 400 });

  const today = typeof body.today === "string" ? body.today.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const snapshot = body.snapshot ? JSON.stringify(body.snapshot).slice(0, 20000) : null;

  const instructions = [
    "Você é o assistente do app Gerenciador de Vida. Responda sempre em português do Brasil, de forma curta e prática.",
    "Ajude com rotina, tarefas, finanças (valores em BRL), hábitos, metas e treinos.",
    "Quando o usuário pedir para criar/registrar/alterar algo, use as ferramentas. Cada ação é confirmada pelo usuário no aparelho antes de ser salva; não diga que salvou antes de receber o resultado.",
    "Se faltar uma informação essencial (ex.: valor de uma despesa), pergunte antes de chamar a ferramenta.",
    `Hoje é ${today}. Use datas no formato AAAA-MM-DD.`,
    snapshot
      ? `Dados atuais do usuário (compartilhados com autorização): ${snapshot}`
      : "O usuário NÃO compartilhou seus dados. Você não conhece tarefas, planos ou lançamentos existentes; para ações que precisam de um id existente, peça para ativar 'Compartilhar meus dados'.",
  ].join("\n");

  try {
  const result = streamText({
    model: google(model),
    instructions,
    messages: await convertToModelMessages(messages),
    tools,
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({ originalMessages: messages, onError: errorText });
  } catch (error) {
    return Response.json({ error: errorText(error) }, { status: 502 });
  }
}
