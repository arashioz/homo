import OpenAI from "openai";
import {
  AiProvider,
  AiProviderNotConfiguredError,
  type AiCompletionRequest,
  type AiCompletionResult,
  type AiProviderConfig,
} from "./ai-provider";

export class DisabledAiProvider implements AiProvider {
  readonly id = "none";
  isConfigured() {
    return false;
  }
  async complete(): Promise<AiCompletionResult> {
    throw new AiProviderNotConfiguredError("none");
  }
}

export class GapGptProvider implements AiProvider {
  readonly id = "gapgpt";
  private client: OpenAI | null = null;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config?: Partial<AiProviderConfig>) {
    this.apiKey = config?.apiKey || process.env.GAPGPT_API_KEY || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config?.baseUrl || process.env.GAPGPT_BASE_URL || "https://api.gapgpt.app/v1";
    this.model = config?.model || process.env.GAPGPT_MODEL || "gapgpt-qwen-3.6";
    if (this.apiKey.trim()) {
      this.client = new OpenAI({
        apiKey: this.apiKey.trim(),
        baseURL: this.baseUrl.trim(),
      });
    }
  }

  isConfigured() {
    return Boolean(this.apiKey.trim());
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.isConfigured() || !this.client) {
      throw new AiProviderNotConfiguredError(this.id);
    }

    // 1. Attempt client.responses.create (matches user sample code)
    try {
      const responsesApi = (this.client as unknown as { responses?: { create: (opts: { model: string; input: string }) => Promise<{ output_text?: string; choices?: Array<{ message?: { content?: string } }> }> } }).responses;
      if (typeof responsesApi?.create === "function") {
        const inputPrompt = request.messages
          .map((m) => `${m.role === "system" ? "System Instructions" : m.role === "assistant" ? "Assistant" : "User"}:\n${m.content}`)
          .join("\n\n");

        const resp = await responsesApi.create({
          model: this.model,
          input: inputPrompt,
        });

        const out = resp?.output_text || resp?.choices?.[0]?.message?.content;
        if (out && typeof out === "string") {
          return {
            provider: this.id,
            model: this.model,
            text: out.trim(),
          };
        }
      }
    } catch (err: unknown) {
      // Fallback to chat.completions if responses API fails or is not supported by backend gateway
      console.warn("GapGPT responses.create fallback to chat.completions:", (err as Error)?.message);
    }

    // 2. Fallback to client.chat.completions.create
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 2000,
      ...(request.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
    });

    return {
      provider: this.id,
      model: this.model,
      text: completion.choices[0]?.message?.content?.trim() || "",
    };
  }
}

export class OpenAiProvider implements AiProvider {
  readonly id = "openai";
  private client: OpenAI | null = null;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config?: Partial<AiProviderConfig>) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.model = config?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (this.apiKey.trim()) {
      this.client = new OpenAI({
        apiKey: this.apiKey.trim(),
        baseURL: this.baseUrl.trim(),
      });
    }
  }

  isConfigured() {
    return Boolean(this.apiKey.trim());
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.isConfigured() || !this.client) {
      throw new AiProviderNotConfiguredError(this.id);
    }
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 2000,
      ...(request.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
    });
    return {
      provider: this.id,
      model: this.model,
      text: completion.choices[0]?.message?.content?.trim() || "",
    };
  }
}

export class OllamaProvider implements AiProvider {
  readonly id = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(config?: Partial<AiProviderConfig>) {
    this.baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    this.model = config?.model || process.env.OLLAMA_MODEL || "llama3.1";
  }

  isConfigured() {
    return Boolean(this.baseUrl.trim() && this.model.trim());
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        options: { temperature: request.temperature ?? 0.3 },
        messages: request.messages,
      }),
    });
    if (!response.ok) throw new Error(`Ollama request failed with status ${response.status}`);
    const payload = (await response.json()) as { message?: { content?: string } };
    return { provider: this.id, model: this.model, text: payload.message?.content?.trim() || "" };
  }
}

export function createAiProvider(config?: Partial<AiProviderConfig>): AiProvider {
  const providerName = (config?.provider || process.env.AI_PROVIDER || "gapgpt").trim().toLowerCase();
  if (providerName === "gapgpt" || providerName.includes("gap")) return new GapGptProvider(config);
  if (providerName === "openai" || providerName === "custom") return new OpenAiProvider(config);
  if (providerName === "ollama") return new OllamaProvider(config);
  if (providerName === "none") return new DisabledAiProvider();
  return new GapGptProvider(config);
}
