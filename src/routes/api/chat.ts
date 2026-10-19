import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const google = createGoogleGenerativeAI({
  apiKey,
});

export const Route = createAPIFileRoute("/api/chat")({
  POST: async ({ request }) => {
    try {
      const { messages, today, snapshot } = await request.json();

      const result = streamText({
        model: google(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
        temperature: 0.8,
        maxRetries: 1,
        messages,
        system: `Você é o assistente pessoal do Gerenciador de Vida. Data de hoje: ${today}.
Contexto de dados do usuário: ${JSON.stringify(snapshot ?? {})}`,
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error("Erro na API da IA:", error);
      return new Response(
        JSON.stringify({
          error: "O assistente Gemini está temporariamente indisponível. Tente novamente em alguns segundos.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
