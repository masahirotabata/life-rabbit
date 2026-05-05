import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, register, setToken } from "../lib/api";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from ?? "/goals";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) return;
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("EmailとPasswordを入力してください。");
      return;
    }

    setBusy(true);

    try {
      if (mode === "register") {
        const data = await register(trimmedEmail, trimmedPassword);
        setToken(data.token);
        nav(from, { replace: true });
        return;
      }

      const data = await login(trimmedEmail, trimmedPassword);
      setToken(data.token);
      nav(from, { replace: true });
    } catch (e: any) {
      if (mode === "register" && e?.status === 409) {
        setError("このEmailは既に登録済みです。ログインしてください。");
        setMode("login");
      } else if (e?.status === 401) {
        setError("EmailまたはPasswordが違います。");
      } else {
        setError(e?.message ?? "処理に失敗しました。");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            {mode === "login" ? "Login" : "Create Account"}
          </h2>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
            disabled={busy}
          >
            {mode === "login" ? "Create account" : "Back to login"}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
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
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "..." : mode === "login" ? "Login" : "Register"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
