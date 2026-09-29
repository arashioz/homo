export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
}

const defaultApiUrl = "http://localhost:4000/v1";
export const apiBaseUrl = (import.meta.env.VITE_CRM_API_URL || defaultApiUrl).replace(/\/$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function responseMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.message === "string") return payload.message;
  return fallback;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, token, headers: optionHeaders, ...requestOptions } = options;
  const headers = new Headers(optionHeaders);
  headers.set("Accept", "application/json");
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(responseMessage(payload, "ارتباط با سرور با خطا مواجه شد."), response.status);
  }

  if (!isRecord(payload) || payload.success !== true || !("data" in payload)) {
    throw new ApiError("پاسخ نامعتبر از سرور دریافت شد.", response.status);
  }

  return payload.data as T;
}
