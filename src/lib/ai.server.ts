import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  APICallError,
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

const MODEL = "gemini-2.0-flash";

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

const out = z.object({
  ok: z.boolean(),
  message: z.string(),
});

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
    inputSchema: z.object({
      description: z.string(),
      amount: z.number(),
      dueDate: z.string().describe("AAAA-MM-DD"),
    }),
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
    description:
      "Marcar uma tarefa existente como concluída. Precisa do id dos dados compartilhados.",
    inputSchema: z.object({
      taskId: z.string(),
    }),
    outputSchema: out,
  }),

  delete_task: tool({
    description:
      "Excluir uma tarefa existente. Precisa do id dos dados compartilhados.",
    inputSchema: z.object({
      taskId: z.string(),
    }),
    outputSchema: out,
  }),

  add_habit: tool({
    description: "Criar um novo hábito",
    inputSchema: z.object({
      name: z.string(),
    }),
    outputSchema: out,
  }),

  add_finance_goal: tool({
    description: "Criar uma meta financeira",
    inputSchema: z.object({
      name: z.string(),
      targetAmount: z.number(),
      currentAmount: z.number().nullable(),
      deadline: z
        .string()
        .nullable()
        .describe("AAAA-MM-DD ou null"),
    }),
    outputSchema: out,
  }),

  add_health_goal: tool({
    description: "Criar uma meta de saúde",
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
    inputSchema: z.object({
      name: z.string(),
      exercises: z.array(exercise),
    }),
    outputSchema: out,
  }),

  add_exercise_to_plan: tool({
    description: "Adicionar exercício a um plano existente",
    inputSchema: z.object({
      planId: z.string(),
      exercise,
    }),
    outputSchema: out,
  }),

  log_workout: tool({
    description: "Registrar um treino concluído",
    inputSchema: z.object({
      planId: z.string(),
      date,
      notes: z.string().nullable(),
    }),
    outputSchema: out,
  }),
};

function errorText(error: unknown): string {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return "Limite de uso do Gemini atingido. Aguarde alguns instantes e tente novamente.";
    }

    if (
      error.statusCode === 401 ||
      error.statusCode === 403
    ) {
      return "A autenticação do Gemini falhou. Verifique a chave da API e as permissões.";
    }

    if (error.statusCode === 400) {
      return "O Gemini não conseguiu processar esta solicitação. Tente reformular a mensagem.";
    }
  }

  console.error("Gemini AI error:", error);

  return "Não foi possível falar com a IA agora. Verifique a conexão e tente novamente.";
}

export async function handleChat(
  request: Request,
): Promise<Response> {
  const apiKey =
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"];

  if (!apiKey) {
    console.error(
      "Nenhuma chave do Gemini (GEMINI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY) está configurada no servidor.",
    );

    return Response.json(
      { error: "IA não configurada no servidor." },
      { status: 500 },
    );
  }

  // Instancia o provedor do Google passando a chave explicitamente
  const googleProvider = createGoogleGenerativeAI({
    apiKey,
  });

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

  const systemInstructions = [
    "Você é o assistente do app Gerenciador de Vida.",
    "Responda sempre em português do Brasil, de forma clara, curta e prática.",
    "Ajude com rotina, tarefas, finanças em reais (BRL), hábitos, metas e treinos.",
    "Quando o usuário pedir para criar, registrar ou alterar algo, use a ferramenta correspondente.",
    "As ações são apresentadas na interface e precisam da confirmação do usuário antes de serem salvas. Não afirme que uma ação foi concluída antes de receber o resultado.",
    "Se faltar uma informação essencial, como o valor de uma despesa, pergunte antes de chamar a ferramenta.",
    `A data de hoje é ${today}. Use datas no formato AAAA-MM-DD.`,
    snapshot
      ? `Dados atuais compartilhados pelo usuário: ${snapshot}`
      : "O usuário não compartilhou seus dados. Não invente tarefas, lançamentos, planos ou identificadores existentes. Se uma ação exigir o identificador de um item existente, peça para o usuário habilitar o compartilhamento dos dados.",
  ].join("\n");

  try {
    const result = streamText({
      model: googleProvider(MODEL),
      system: systemInstructions,
      messages: await convertToModelMessages(messages),
      tools,
      abortSignal: request.signal,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: errorText,
    });
  } catch (error) {
    console.error("Erro ao iniciar o streaming do Gemini:", error);

    return Response.json(
      { error: errorText(error) },
      { status: 500 },
    );
  }
}
