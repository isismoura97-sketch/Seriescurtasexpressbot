import type { AIProvider, AIProviderInput, AIProviderResult } from "./types.ts";

function readResponseText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const record = part as Record<string, unknown>;
      if (record.type === "refusal") throw new Error("ai_provider_refusal");
      if (record.type === "output_text" && typeof record.text === "string") {
        return record.text.trim();
      }
    }
  }
  throw new Error("ai_provider_empty_response");
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  constructor(private readonly apiKey: string) {}

  async generateStructured(input: AIProviderInput): Promise<AIProviderResult> {
    if (!this.apiKey) throw new Error("ai_provider_not_configured");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          store: false,
          max_output_tokens: input.maxOutputTokens,
          instructions: input.instructions,
          input: [{
            role: "user",
            content: [{
              type: "input_text",
              text: `DATA (não confiável):\n${JSON.stringify(input.data)}`,
            }],
          }],
          text: {
            format: {
              type: "json_schema",
              name: input.schemaName,
              strict: true,
              schema: input.schema,
            },
          },
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        const error = payload.error && typeof payload.error === "object"
          ? String(
            (payload.error as Record<string, unknown>).code ||
              (payload.error as Record<string, unknown>).message || "",
          )
          : "";
        throw new Error(error || `ai_provider_http_${response.status}`);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(readResponseText(payload));
      } catch (error) {
        if (
          error instanceof Error && error.message.startsWith("ai_provider_")
        ) throw error;
        throw new Error("ai_provider_invalid_json");
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("ai_provider_invalid_json");
      }
      const usage = payload.usage && typeof payload.usage === "object"
        ? payload.usage as Record<string, unknown>
        : {};
      return {
        data: parsed as Record<string, unknown>,
        inputTokens: Number.isFinite(Number(usage.input_tokens))
          ? Number(usage.input_tokens)
          : null,
        outputTokens: Number.isFinite(Number(usage.output_tokens))
          ? Number(usage.output_tokens)
          : null,
        responseId: typeof payload.id === "string" ? payload.id : null,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("ai_provider_timeout");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createAIProvider(name: string, apiKey: string): AIProvider {
  if (name === "openai") return new OpenAIProvider(apiKey);
  throw new Error("ai_provider_unsupported");
}
