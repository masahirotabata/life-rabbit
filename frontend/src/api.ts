// src/api.ts
import axios, { AxiosInstance, AxiosResponse } from "axios";

/**
 * API クライアントの戻り値型
 */
export type ApiClient = {
  get<T = unknown>(path: string): Promise<AxiosResponse<T>>;
  post<T = unknown>(path: string, body?: unknown): Promise<AxiosResponse<T>>;
  delete<T = unknown>(path: string): Promise<AxiosResponse<T>>;
};

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!client) {
    const baseURL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    client = axios.create({
      baseURL,
    });

    // 必要なら Authorization ヘッダなどもここで付与
    client.interceptors.request.use((config) => {
      const token = localStorage.getItem("todo-money:token");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  return client;
}

/**
 * 各ページで使う API フック
 *
 * 例：
 *   const api = useApi();
 *   const res = await api.get<Summary>("/api/me/summary");
 *   setS(res.data);
 */
export function useApi(): ApiClient {
  const c = getClient();
  return {
    get: <T = unknown>(path: string) => c.get<T>(path),
    post: <T = unknown>(path: string, body?: unknown) => c.post<T>(path, body),
    delete: <T = unknown>(path: string) => c.delete<T>(path),
  };
}
