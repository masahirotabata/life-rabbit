// src/api.ts

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://liferabbit-api.onrender.com';

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
};

// ⭐ ここを追加
export function useApi() {
  // コンポーネント側で `const api = useApi();` として使えるようにラッパを返す
  return api;
}

export default api;
