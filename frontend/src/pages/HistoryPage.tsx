import { useEffect, useState } from "react";
import { history } from "../lib/api";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

export default function HistoryPage() {
  const [from, setFrom] = useState(() => todayYmd());
  const [to, setTo] = useState(() => todayYmd());
  const [rows, setRows] = useState<any[]>([]);

  async function refresh() {
    setRows(await history(from, to));
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="container">
      <h1>History</h1>

      <div className="card">
        <label>from</label>
        <input value={from} onChange={(e) => setFrom(e.target.value)} />
        <label>to</label>
        <input value={to} onChange={(e) => setTo(e.target.value)} />
        <div style={{ marginTop: 12 }}>
          <button className="primary" onClick={refresh}>Load</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {rows.length === 0 ? (
          <div className="small">履歴がありません</div>
        ) : (
          rows.map((r:any) => (
            <div key={r.id} className="task">
              <div>
                <div style={{ fontWeight: 700 }}>{r.task?.title ?? "(task)"}</div>
                <div className="small">occurrence: {r.occurrenceDate}</div>
                <div className="small">completedAt: {r.completedAt}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
