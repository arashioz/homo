export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
}

export interface AiCompletionResult {
  provider: string;
  model: string;
  text: string;
}

export interface AiProviderConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider {
  readonly id: string;
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

export class AiProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`ارائه‌دهنده هوش مصنوعی «${provider}» پیکربندی نشده است. لطفاً کلید API یا آدرس سرور را در بخش تنظیمات AI وارد کنید.`);
    this.name = "AiProviderNotConfiguredError";
  }
}
