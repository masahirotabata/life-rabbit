// =====================
// Token
// =====================
const TOKEN_KEY = "todoMoneyToken";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// =====================
// API base URL
// =====================
// Vite の環境変数からベース URL を読む
// Render の Static Site では VITE_API_BASE_URL を設定しておく想定
// 例: https://liferabbit-api.onrender.com
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// =====================
// Request helper
// =====================
export type ApiError = { status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  // ベース URL とパスを結合
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      msg = data?.message ?? data?.error ?? msg;
    } catch {
      // JSONじゃない場合はそのまま
    }
    throw { status: res.status, message: msg } as ApiError;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

// 互換用（あなたの既存コードが fetchJson を呼ぶならこれでOK）
const fetchJson = request;

// =====================
// Types
// =====================
export type GoalListItem = {
  id: number;
  title: string;
  annualIncome: number;
  daysPerYear: number;
  achieved: boolean;
  taskCount: number;
  completedTaskCount: number;
  perTaskReward: number;
  earnedAmount: number;
};

export type TaskItem = {
  id: number;
  goalId: number;
  title: string;
  completed: boolean;
  completedAt: string | null;
};

export type TagItem = { id: number; name: string; color?: string };

export type CalendarItem = {
  taskId: number;
  title: string;
  memo?: string;
  date: string; // yyyy-MM-dd
  completed: boolean;
  tags: TagItem[];
};

// =====================
// Auth
// =====================
export async function register(email: string, password: string) {
  return request<{ id: number; email: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// =====================
// Goals / Tasks
// =====================
export async function listGoals() {
  return request<GoalListItem[]>("/api/goals");
}

export async function createGoal(title: string, annualIncome: number) {
  return request<GoalListItem>("/api/goals", {
    method: "POST",
    body: JSON.stringify({ title, annualIncome }),
  });
}

export async function listTasks(goalId: number) {
  return request<TaskItem[]>(`/api/goals/${goalId}/tasks`);
}

export async function addTask(goalId: number, title: string) {
  return request<TaskItem>(`/api/goals/${goalId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function completeTask(taskId: number) {
  return request<{ rewardAmount: number; currency: string }>(
    `/api/tasks/${taskId}/complete`,
    { method: "POST" }
  );
}

// =====================
// Tags / Calendar / Schedule / History
// =====================
export async function listTags(): Promise<TagItem[]> {
  return fetchJson("/api/tags");
}

export async function createTag(
  name: string,
  color?: string
): Promise<TagItem> {
  return fetchJson("/api/tags", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

export async function setTaskTags(
  taskId: number,
  tagIds: number[]
): Promise<any> {
  return fetchJson(`/api/tasks/${taskId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagIds }),
  });
}

export async function calendar(
  from: string,
  to: string
): Promise<CalendarItem[]> {
  return fetchJson(
    `/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function upsertSchedule(body: {
  taskId: number;
  type: "DATE" | "RANGE" | "WEEKLY";
  date?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeekMask?: number;
}): Promise<any> {
  return fetchJson("/api/schedules/upsert", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function completeOccurrence(
  taskId: number,
  date: string
): Promise<void> {
  await fetchJson("/api/complete", {
    method: "POST",
    body: JSON.stringify({ taskId, date }),
  });
}

export async function history(from: string, to: string): Promise<any[]> {
  return fetchJson(
    `/api/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}
