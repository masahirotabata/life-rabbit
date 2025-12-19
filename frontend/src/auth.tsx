import { createContext, useContext, useMemo, useState } from "react";

const KEY = "todomoney_token";

type AuthCtx = {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(KEY));

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  };

  const logout = () => setToken(null);

  const value = useMemo(() => ({ token, setToken, logout }), [token]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
