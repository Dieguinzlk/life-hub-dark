
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  APICallError,
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

const MODEL = "gemini-2.5-flash";

const date = z
  .string()
  .nullable()
  .describe("Data no formato AAAA-MM-DD, ou null para hoje");

const exercise = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number().nullable().describe("Carga em kg ou null"),
});

// As ferramentas mantêm os nomes usados pela interface do aplicativo.
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
  }),

  add_bill: tool({
    description: "Cadastrar uma conta a pagar",
    inputSchema: z.object({
      description: z.string(),
      amount: z.number(),
      dueDate: z.string().describe("AAAA-MM-DD"),
    }),
  }),

  add_task: tool({
    description: "Criar uma tarefa na rotina",
    inputSchema: z.object({
      title: z.string(),
      date,
      time: z.string().nullable().describe("HH:MM ou null"),
      priority: z.enum(["alta", "media", "baixa"]).nullable(),
    }),
  }),

  complete_task: tool({
    description: "Marcar uma tarefa existente como concluída usando seu ID",
    inputSchema: z.object({
      taskId: z.string(),
    }),
  }),

  delete_task: tool({
    description: "Excluir uma tarefa existente usando seu ID",
    inputSchema: z.object({
      taskId: z.string(),
    }),
  }),

  add_habit: tool({
    description: "Criar um novo hábito",
    inputSchema: z.object({
      name: z.string(),
    }),
  }),

  add_finance_goal: tool({
    description: "Criar uma meta financeira",
    inputSchema: z.object({
      name: z.string(),
      targetAmount: z.number(),
      currentAmount: z.number().nullable(),
      deadline: z.string().nullable().describe("AAAA-MM-DD ou null"),
    }),
  }),

  add_health_goal: tool({
    description: "Criar uma meta de saúde, peso, treinos ou hábitos",
    inputSchema: z.object({
      name: z.string(),
      category: z.enum(["peso", "treinos", "habito", "outra"]),
      currentValue: z.number(),
      targetValue: z.number(),
      unit: z.string(),
      deadline: z.string().nullable(),
    }),
  }),

  create_workout_plan: tool({
    description: "Criar um plano de treino com exercícios",
    inputSchema: z.object({
      name: z.string(),
      exercises: z.array(exercise),
    }),
  }),

  add_exercise_to_plan: tool({
    description: "Adicionar um exercício a um plano existente",
    inputSchema: z.object({
      planId: z.string(),
      exercise,
    }),
  }),

  log_workout: tool({
    description: "Registrar um treino concluído de um plano existente",
    inputSchema: z.object({
      planId: z.string(),
      date,
      notes: z.string().nullable(),
    }),
  }),
};

function errorText(error: unknown): string {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;

    if (status === 429) {
      return "O limite de uso da IA foi atingido. Aguarde um pouco e tente novamente.";
    }

    if (status === 401 || status === 403) {
      return "A chave do Gemini não foi aceita. Confira a variável GEMINI_API_KEY na Vercel.";
    }

    if (status === 404) {
      return "O modelo de IA solicitado não está disponível. Precisamos conferir o nome do modelo.";
    }

    if (status === 400) {
      return "A IA não conseguiu processar essa solicitação. Tente enviar uma mensagem mais simples.";
    }
  }

  console.error("Erro no assistente Gemini:", error);
  return "Não foi possível conectar à IA agora. Confira a conexão e tente novamente.";
}

export async function handleChat(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "IA não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente do servidor.",
      },
      { status: 500 },
    );
  }

  let body: {
    messages?: UIMessage[];
    snapshot?: unknown;
    today?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Requisição inválida." },
      { status: 400 },
    );
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-40)
    : [];

  if (messages.length === 0) {
    return Response.json(
      { error: "Mensagem vazia." },
      { status: 400 },
    );
  }

  const today =
    typeof body.today === "string"
      ? body.today.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const snapshot = body.snapshot
    ? JSON.stringify(body.snapshot).slice(0, 20000)
    : null;

  const instructions = [
    "Você é o assistente do aplicativo Gerenciador de Vida.",
    "Responda sempre em português do Brasil, com clareza e objetividade.",
    "Ajude com rotina, tarefas, finanças em reais, hábitos, metas e treinos.",
    "Quando o usuário pedir para criar ou registrar algo, use a ferramenta correspondente.",
    "As ações precisam ser confirmadas pelo usuário no aplicativo antes de serem salvas.",
    "Nunca diga que uma ação foi salva antes da confirmação.",
    "Se faltar uma informação essencial, como o valor de uma despesa, pergunte antes de chamar a ferramenta.",
    "Não invente dados financeiros, tarefas, hábitos ou treinos.",
    `A data de hoje é ${today}. Use datas no formato AAAA-MM-DD.`,
    snapshot
      ? `Resumo dos dados compartilhados pelo usuário: ${snapshot}`
      : "O usuário não compartilhou seus dados. Não afirme conhecer seus lançamentos, tarefas ou planos existentes. Para ações que exigem um ID existente, explique que é necessário ativar o compartilhamento de dados.",
  ].join("\n");

  try {
    const google = createGoogleGenerativeAI({ apiKey });

    const result = streamText({
      model: google(MODEL),
      system: instructions,
      messages: await convertToModelMessages(messages),
      tools,
      abortSignal: request.signal,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: errorText,
    });
  } catch (error) {
    console.error("Falha ao iniciar o assistente Gemini:", error);

    return Response.json(
      { error: errorText(error) },
      { status: 500 },
    );
  }
}
