import { useEffect, useMemo, useState } from "react";
import { calendar, completeOccurrence, upsertSchedule, listTasks, addTask, listTags, setTaskTags } from "../lib/api";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function dowMaskFromInput(input: string): number {
  // "mon,wed,fri" など
  const map: Record<string, number> = { sun:1, mon:2, tue:4, wed:8, thu:16, fri:32, sat:64 };
  return input.split(",").map(s => s.trim().toLowerCase()).reduce((mask, k) => mask | (map[k] ?? 0), 0);
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [items, setItems] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // 右側に「候補タスク（ゴール配下）」を出したい場合：最小は “goalIdを選んでlistTasks” でもOK
  // ここでは「ゴール外タスク」も扱えるように、単純に selected日の items を表示するだけにしてます

  async function refresh() {
    const from = ymd(startOfMonth(month));
    const to = ymd(endOfMonth(month));
    const data = await calendar(from, to);
    setItems(data);
  }

  useEffect(() => { refresh(); }, [month]);

  const byDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const it of items) {
      (m[it.date] ??= []).push(it);
    }
    return m;
  }, [items]);

  const days = useMemo(() => {
    const s = startOfMonth(month);
    const e = endOfMonth(month);

    // 月初の曜日に合わせて前の月の日も埋める（最小）
    const gridStart = new Date(s);
    gridStart.setDate(s.getDate() - s.getDay()); // Sunday start

    const grid: Date[] = [];
    const cur = new Date(gridStart);
    while (grid.length < 42) { // 6週
      grid.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return grid;
  }, [month]);

  async function onClickDate(dateStr: string) {
    setSelected(dateStr);

    const title = prompt("タスク名を入力してください");
    if (!title) return;
    const memo = prompt("メモ（省略OK）") ?? "";

    // ★ 既存の addTask(goalId, title) しかない場合は、最小の新APIを作るのが理想
    // ただし今は “goalId=null” を許可できるなら addTask(null as any, title) でいけます
    // ここはあなたのAPIに合わせて調整してください

    const created = await addTask(null as any, title); // goalId=null のタスクを作る想定
    // memo を保存するAPIが無いなら Task更新APIを作る（最小ならここは省略OK）

    await upsertSchedule({ taskId: created.id, type: "DATE", date: dateStr });
    await refresh();
  }

  async function onDropToDate(taskId: number, dateStr: string) {
    // 最小：promptで種類を選ぶ
    const kind = prompt("スケジュール種類: 1=単日 2=期間 3=曜日繰り返し", "1") ?? "1";

    if (kind === "2") {
      const end = prompt("終了日(yyyy-mm-dd)", dateStr) ?? dateStr;
      await upsertSchedule({ taskId, type: "RANGE", startDate: dateStr, endDate: end });
    } else if (kind === "3") {
      const end = prompt("終了日(yyyy-mm-dd) デフォルトは1ヶ月後", "") || "";
      const endDate = end || (() => {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + 1);
        return ymd(d);
      })();
      const dow = prompt("曜日: sun,mon,tue,wed,thu,fri,sat をカンマ区切り", "mon,wed,fri") ?? "";
      await upsertSchedule({ taskId, type: "WEEKLY", startDate: dateStr, endDate, daysOfWeekMask: dowMaskFromInput(dow) });
    } else {
      await upsertSchedule({ taskId, type: "DATE", date: dateStr });
    }

    await refresh();
  }

  const selectedItems = byDate[selected] ?? [];

  return (
    <div className="container">
      <div className="row-between">
        <h1>Calendar</h1>
        <div className="row">
          <button onClick={() => {
            const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d);
          }}>◀</button>
          <div style={{ padding: "8px 12px" }}>
            {month.getFullYear()} / {month.getMonth() + 1}
          </div>
          <button onClick={() => {
            const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d);
          }}>▶</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x => (
          <div key={x} className="small" style={{ textAlign: "center" }}>{x}</div>
        ))}

        {days.map((d) => {
          const dateStr = ymd(d);
          const count = (byDate[dateStr]?.length ?? 0);
          const isThisMonth = d.getMonth() === month.getMonth();
          const isSel = dateStr === selected;

          return (
            <div
              key={dateStr}
              onClick={() => onClickDate(dateStr)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = Number(e.dataTransfer.getData("text/taskId"));
                if (taskId) onDropToDate(taskId, dateStr);
              }}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 10,
                minHeight: 72,
                background: isSel ? "#eef2ff" : "#fff",
                opacity: isThisMonth ? 1 : 0.5,
                cursor: "pointer"
              }}
            >
              <div className="row-between">
                <div style={{ fontWeight: 700 }}>{d.getDate()}</div>
                {count > 0 && <span className="badge">{count}</span>}
              </div>

              {/* タグ色のドットだけ表示（最小） */}
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {(byDate[dateStr] ?? []).slice(0, 3).flatMap(it => (it.tags ?? []).slice(0,1)).map((t:any) => (
                  <span key={`${dateStr}-${t.id}`} style={{
                    width: 10, height: 10, borderRadius: 999, background: t.color || "#999", display: "inline-block"
                  }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="row-between">
          <h2 style={{ margin: 0 }}>ToDo（{selected}）</h2>
          <button onClick={() => setCollapsed(v => !v)}>{collapsed ? "開く" : "閉じる"}</button>
        </div>

        {!collapsed && (
          <div className="card" style={{ marginTop: 10 }}>
            {selectedItems.length === 0 ? (
              <div className="small">この日のタスクはありません（セルをタップして追加）</div>
            ) : (
              selectedItems.map((it:any) => (
                <div key={`${it.taskId}@${it.date}`} className="task"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/taskId", String(it.taskId))}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.title}</div>
                    {it.memo && <div className="small">{it.memo}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {(it.tags ?? []).map((t:any) => (
                        <span key={t.id} className="badge" style={{ borderColor: t.color || "#e5e7eb" }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: 999, background: t.color || "#999",
                            display: "inline-block", marginRight: 6
                          }} />
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {!it.completed ? (
                      <button className="primary" onClick={async () => {
                        await completeOccurrence(it.taskId, it.date);
                        await refresh();
                      }}>Complete</button>
                    ) : (
                      <span className="badge">completed</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
