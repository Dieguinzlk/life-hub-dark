import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  google: vi.fn(() => ({ provider: "google", modelId: "gemini-2.5-flash" })),
  createGoogle: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: mocks.createGoogle }));
vi.mock("ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("ai")>(),
  convertToModelMessages: vi.fn(async () => []),
  streamText: mocks.streamText,
}));

import { handleChat } from "@/lib/ai.server";

function request() {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Olá" }] }] }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("Gemini server configuration", () => {
  it("rejects missing GEMINI_API_KEY without contacting the provider", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await handleChat(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(mocks.createGoogle).not.toHaveBeenCalled();
  });

  it("passes the server key explicitly and selects gemini-2.5-flash by default", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-not-a-credential");
    vi.stubEnv("GEMINI_MODEL", "");
    mocks.createGoogle.mockReturnValue(mocks.google);
    mocks.streamText.mockReturnValue({ toUIMessageStreamResponse: () => new Response("test") });
    const response = await handleChat(request());
    expect(mocks.createGoogle).toHaveBeenCalledWith({ apiKey: "test-only-not-a-credential" });
    expect(mocks.google).toHaveBeenCalledWith("gemini-2.0-flash");
    expect(response.status).toBe(200);
  });
});