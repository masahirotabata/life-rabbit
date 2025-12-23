import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setToken } from "../lib/api";

type ApiError = Error & { status?: number; body?: any };

const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ??
  (import.meta as any)?.env?.VITE_API_URL ??
  "https://todo-money-api.onrender.com";

function looksLikeHtml(s: string) {
  const t = s.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<head");
}

async function fetchJson<T = any>(path: string, options: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const ct = res.headers.get("content-type") || "";
  const body: any = ct.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text();

  if (!res.ok) {
    const err: ApiError = new Error();

    err.status = res.status;
    err.body = body;

    // メッセージ組み立て
    if (typeof body === "object" && body?.message) {
      err.message = body.message;
    } else if (typeof body === "string" && body) {
      err.message = looksLikeHtml(body)
        ? `APIがHTMLを返しました。API_BASE_URLが違う可能性があります（現在: ${API_BASE}）`
        : body;
    } else {
      err.message = `HTTP ${res.status}`;
    }

    throw err;
  }

  return body as T;
}

async function apiRegister(email: string, password: string) {
  // 例: POST /api/auth/register
  return fetchJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function apiLogin(email: string, password: string) {
  // 例: POST /api/auth/login -> { token: "..." }
  return fetchJson<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from ?? "/goals";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("pass1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await apiRegister(email, password);
      }
      const r = await apiLogin(email, password);
      setToken(r.token);
      nav(from, { replace: true });
    } catch (e: any) {
      // 409 register は「すでにある」なので案内に変える
      if (mode === "register" && e?.status === 409) {
        setError("このEmailは既に登録済みです。ログインしてください。");
      } else {
        setError(e?.message ?? "ログインに失敗しました");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div
        className="card"
        style={{
          maxWidth: 420,
          margin: "40px auto",
        }}
      >
        <div className="row-between" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            {mode === "login" ? "Login" : "Create account"}
          </h2>
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            disabled={busy}
          >
            {mode === "login" ? "Create account" : "Back to login"}
          </button>
        </div>

        {/* フォーム本体 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
              }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button className="primary" onClick={onSubmit} disabled={busy}>
              {busy ? "..." : mode === "login" ? "Login" : "Register & Login"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="small" style={{ marginTop: 4 }}>
            ※ 409 は「すでに登録済み」です（エラーじゃなく案内）
            <br />
            ※ 現在のAPI: <code>{API_BASE}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
