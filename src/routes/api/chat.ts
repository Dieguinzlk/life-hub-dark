import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

// Lê a chave de API do ambiente do Vercel
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const google = createGoogleGenerativeAI({
  apiKey,
});

export async function POST(req: Request) {
  try {
    const { messages, today, snapshot } = await req.json();

    const result = streamText({
      // Define o modelo da família Gemini mais recente
      model: google(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
      temperature: 0.8, // Configurado conforme solicitado
      maxRetries: 1, // Limita as tentativas automáticas para evitar estouro do tempo da Serverless Function
      messages,
      system: `Você é o assistente pessoal do Gerenciador de Vida. Data de hoje: ${today}.
Contexto de dados do usuário: ${JSON.stringify(snapshot ?? {})}`,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Erro na API da IA:", error);
    return new Response(
      JSON.stringify({
        error: "O assistente Gemini está temporariamente indisponível ou com alta demanda. Tente novamente em alguns segundos.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
