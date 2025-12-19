import { useEffect, useState } from "react";
import { useApi } from "../api";

type Summary = {
  potentialTotal: number;
  achievedTotal: number;
  currencyCount: number;
};

export default function MyPage() {
  const api = useApi();
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api
      .get<Summary>("/api/me/summary")
      .then((res: { data: Summary }) => setS(res.data));
  }, [api]);

  return (
    <div className="stack">
      <div className="card">
        <h2>My Page</h2>
        {s ? (
          <>
            <div className="muted">潜在貯金（未達成）</div>
            <div className="big">${s.potentialTotal.toFixed(2)}</div>

            <div className="muted" style={{ marginTop: 12 }}>
              実現済み貯金（達成）
            </div>
            <div className="big">${s.achievedTotal.toFixed(2)}</div>

            <div className="muted" style={{ marginTop: 12 }}>
              通貨獲得回数
            </div>
            <div className="big">{s.currencyCount}</div>
          </>
        ) : (
          <p className="muted">Loading...</p>
        )}
      </div>
    </div>
  );
}
