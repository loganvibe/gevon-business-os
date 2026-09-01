/**
 * Gevon AI Platform — Provider Abstraction
 * -----------------------------------------
 * OpenRouter is the primary gateway. The provider interface keeps
 * the system agnostic so future providers (OpenAI, Anthropic, Gemini,
 * Ollama…) can be added without changing callers.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  extraBody?: Record<string, unknown>;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionResult {
  content: string;
  usage: AIUsage;
  model: string;
  provider: string;
}

export interface AIProvider {
  name: string;
  chat(messages: AIMessage[], opts?: AICompletionOptions): Promise<AICompletionResult>;
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY environment variable");
  return key;
}

export function createOpenRouterProvider(): AIProvider {
  const key = getOpenRouterKey();
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";

  return {
    name: "openrouter",
    async chat(messages, opts = {}) {
      const body: Record<string, unknown> = {
        model: opts.model ?? "google/gemini-2.0-flash-exp:free",
        messages,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
      };
      if (opts.extraBody) Object.assign(body, opts.extraBody);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": process.env.APP_URL ?? "http://localhost:8080",
          "X-Title": "Gevon BusinessOS",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter error ${res.status}: ${text}`);
      }

      const json = await res.json() as any;
      const choice = json.choices?.[0];
      const usage = json.usage;

      if (!choice?.message?.content) {
        throw new Error("OpenRouter returned empty completion");
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
        model: json.model ?? opts.model ?? "unknown",
        provider: "openrouter",
      };
    },
  };
}
