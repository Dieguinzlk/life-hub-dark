import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, today, snapshot } = await req.json();

    const result = streamText({
      // Define o modelo desejado (ex: gemini-2.0-flash ou gemini-1.5-pro)
      model: google("gemini-2.0-flash"),
      // Ajusta a criatividade/temperatura para 0.8
      temperature: 0.8,
      messages,
      system: `Você é o assistente pessoal do Gerenciador de Vida. Data de hoje: ${today}`,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Erro na API da IA:", error);
    return new Response(
      JSON.stringify({
        error: "O assistente está temporariamente indisponível. Tente novamente em instantes.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
