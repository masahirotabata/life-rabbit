// src/api.ts

const API_BASE_URL =
  // 環境変数があればそれを優先（ローカル開発用）
  import.meta.env.VITE_API_BASE_URL ?? 'https://liferabbit-api.onrender.com';

// axios っぽいインターフェースだけ合わせたラッパ
export interface ApiResponse<T> {
  data: T;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as T;
  return { data };
}

export const api = {
  get:  <T = unknown>(path: string) =>
    request<T>(path),

  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined
    }),

  // 必要になったら put/delete もあとで足せます
};

export default api;
