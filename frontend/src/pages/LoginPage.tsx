import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, register, setToken } from "../lib/api";

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
        await register(email, password);
      }
      const r = await login(email, password);
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
          </div>
        </div>
      </div>
    </div>
  );
}
