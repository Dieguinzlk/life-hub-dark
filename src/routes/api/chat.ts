import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, today, snapshot } = await req.json();

    const result = streamText({
      model: google("gemini-2.0-flash"),
      temperature: 0.8,
      maxRetries: 1, // Reduz as tentativas automáticas para evitar estourar o limite de tempo da Serverless Function
      messages,
      system: `Você é o assistente pessoal do Gerenciador de Vida. Data de hoje: ${today}`,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Erro na API da IA:", error);
    return new Response(
      JSON.stringify({
        error: "O assistente está com alta demanda nos servidores. Tente novamente em alguns segundos.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
