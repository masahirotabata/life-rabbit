// src/api.ts

// axios は使わず、fetch ベースのシンプルなクライアントにします。

export type ApiResponse<T> = {
    data: T;
  };
  
  export type ApiClient = {
    get<T = unknown>(path: string): Promise<ApiResponse<T>>;
    post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>>;
    delete<T = unknown>(path: string): Promise<ApiResponse<T>>;
  };
  
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  
  async function request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem("todo-money:token");
  
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
  
    let fetchBody: BodyInit | undefined = undefined;
  
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }
  
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: fetchBody,
    });
  
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
  
      // サーバー側が { message: "..."} を返している場合はそれをエラーメッセージに採用
      try {
        const errJson = await res.json();
        if (errJson && typeof errJson === "object" && "message" in errJson) {
          message = String((errJson as any).message);
        }
      } catch {
        // JSON でない場合は無視
      }
  
      throw new Error(message);
    }
  
    const json = (await res.json()) as T;
    return { data: json };
  }
  
  /**
   * 各ページで使う API フック
   *
   * 使用例：
   *   const api = useApi();
   *   const res = await api.get<Summary>("/api/me/summary");
   *   setS(res.data);
   */
  export function useApi(): ApiClient {
    return {
      get:  <T = unknown>(path: string) => request<T>("GET", path),
      post: <T = unknown>(path: string, body?: unknown) =>
        request<T>("POST", path, body),
      delete: <T = unknown>(path: string) => request<T>("DELETE", path),
    };
  }
  