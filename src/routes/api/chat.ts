import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "@/lib/ai.server";

export const Route = createFileRoute("/api/chat")({
  loader: async () => {},
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleChat(request);
        } catch (error) {
          console.error("Erro na API de chat:", error);
          return new Response(JSON.stringify({ error: "Erro interno ao processar o chat." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
