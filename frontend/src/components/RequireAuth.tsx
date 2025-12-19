import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../lib/api";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = getToken();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
