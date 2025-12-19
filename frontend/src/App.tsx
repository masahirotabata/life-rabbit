import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import GoalsPage from "./pages/GoalsPage";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/goals"
        element={
          <RequireAuth>
            <GoalsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/goals" replace />} />
    </Routes>
  );
}
