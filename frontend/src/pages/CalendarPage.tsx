import { useEffect, useMemo, useState } from "react";
import {
  calendar,
  completeOccurrence,
  upsertSchedule,
  listTasks,
  addTask,
} from "../lib/api";

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
  const map: Record<string, number> = { sun: 1, mon: 2, tue: 4, wed: 8, thu: 16, fri: 32, sat: 64 };
  return input
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .reduce((mask, k) => mask | (map[k] ?? 0), 0);
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => ymd(new Date()));
  const [items, setItems] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // ★ 左「タスクリスト」用
  const [poolTasks, setPoolTasks] = useState<any[]>([]);
  const [taskListOpen, setTaskListOpen] = useState<boolean>(true);

  // ★ スマホ幅ならデフォルト閉じる
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isSmall = window.matchMedia("(max-width: 768px)").matches;
    setTaskListOpen(!isSmall);
  }, []);

  async function refresh() {
    const from = ymd(startOfMonth(month));
    const to = ymd(endOfMonth(month));
    const data = await calendar(from, to);
    setItems(data);
  }

  async function refreshPool() {
    // ★ あなたのAPIに合わせて調整:
    // 例: listTasks(goalId) が必要なら、ここで選択中ゴールIDを渡す
    const tasks = await listTasks(null as any);
    setPoolTasks(tasks ?? []);
  }

  useEffect(() => {
    refresh();
  }, [month]);

  useEffect(() => {
    refreshPool();
  }, []);

  const byDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const it of items) (m[it.date] ??= []).push(it);
    return m;
  }, [items]);

  const days = useMemo(() => {
    const s = startOfMonth(month);
    const gridStart = new Date(s);
    gridStart.setDate(s.getDate() - s.getDay()); // Sunday start
    const grid: Date[] = [];
    const cur = new Date(gridStart);
    while (grid.length < 42) {
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

    const created = await addTask(null as any, title);
    // memo を保存するAPIが無いならここは省略（将来 updateTask を作る）
    await upsertSchedule({ taskId: created.id, type: "DATE", date: dateStr });
    await refresh();
    await refreshPool();
  }

  async function onDropToDate(taskId: number, dateStr: string) {
    const kind = prompt("スケジュール種類: 1=単日 2=期間 3=曜日繰り返し", "1") ?? "1";

    if (kind === "2") {
      const end = prompt("終了日(yyyy-mm-dd)", dateStr) ?? dateStr;
      await upsertSchedule({ taskId, type: "RANGE", startDate: dateStr, endDate: end });
    } else if (kind === "3") {
      const end = prompt("終了日(yyyy-mm-dd) デフォルトは1ヶ月後", "") || "";
      const endDate =
        end ||
        (() => {
          const d = new Date(dateStr);
          d.setMonth(d.getMonth() + 1);
          return ymd(d);
        })();
      const dow = prompt("曜日: sun,mon,tue,wed,thu,fri,sat をカンマ区切り", "mon,wed,fri") ?? "";
      await upsertSchedule({
        taskId,
        type: "WEEKLY",
        startDate: dateStr,
        endDate,
        daysOfWeekMask: dowMaskFromInput(dow),
      });
    } else {
      await upsertSchedule({ taskId, type: "DATE", date: dateStr });
    }

    await refresh();
  }

  const selectedItems = byDate[selected] ?? [];

  return (
    <div className="container">
      <div className="row-between">
        <h1>lifeRabbit</h1>

        <div className="row">
          <button
            onClick={() => {
              const d = new Date(month);
              d.setMonth(d.getMonth() - 1);
              setMonth(d);
            }}
          >
            ◀
          </button>

          <div style={{ padding: "8px 12px", fontWeight: 700 }}>
            {month.getFullYear()} / {month.getMonth() + 1}
          </div>

          <button
            onClick={() => {
              const d = new Date(month);
              d.setMonth(d.getMonth() + 1);
              setMonth(d);
            }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* ★ レイアウト：左タスクリスト（開閉） + 右カレンダー */}
      <div className="cal-layout">
        {/* モバイルで開いた時の背景 */}
        <div
          className={`cal-overlay ${taskListOpen ? "is-open" : ""}`}
          onClick={() => setTaskListOpen(false)}
        />

        <aside className={`cal-sidebar ${taskListOpen ? "is-open" : ""}`}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>タスクリスト</div>
            <button className="cal-close" onClick={() => setTaskListOpen(false)}>
              ✕
            </button>
          </div>

          <div className="small" style={{ marginBottom: 10 }}>
            右のカレンダーへドラッグ＆ドロップ
          </div>

          <div className="card" style={{ padding: 12 }}>
            {poolTasks.length === 0 ? (
              <div className="small">タスクがありません</div>
            ) : (
              poolTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="pool-task"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/taskId", String(t.id))}
                >
                  <div style={{ fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </div>
                  {t.goalTitle && <div className="small">{t.goalTitle}</div>}
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="cal-main">
          {/* スマホ用：タスクリストを開くボタン */}
          <div className="cal-toolbar">
            <button className="cal-open" onClick={() => setTaskListOpen(true)}>
              ☰ タスクリスト
            </button>
            <div className="small">日付クリック or タスクをD&amp;D</div>
          </div>

          <div className="calendar-wrap">
            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
                <div key={x} className="small calendar-dow">
                  {x}
                </div>
              ))}

              {days.map((d) => {
                const dateStr = ymd(d);
                const count = byDate[dateStr]?.length ?? 0;
                const isThisMonth = d.getMonth() === month.getMonth();
                const isSel = dateStr === selected;

                return (
                  <div
                    key={dateStr}
                    className="calendar-cell"
                    onClick={() => onClickDate(dateStr)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const taskId = Number(e.dataTransfer.getData("text/taskId"));
                      if (taskId) onDropToDate(taskId, dateStr);
                    }}
                    style={{
                      opacity: isThisMonth ? 1 : 0.5,
                      background: isSel ? "rgba(0,0,0,0.03)" : "#fff",
                    }}
                  >
                    <div className="row-between">
                      <div style={{ fontWeight: 800 }}>{d.getDate()}</div>
                      {count > 0 && <span className="badge">{count}</span>}
                    </div>

                    <div className="calendar-dots">
                      {(byDate[dateStr] ?? [])
                        .slice(0, 3)
                        .flatMap((it) => (it.tags ?? []).slice(0, 1))
                        .map((t: any) => (
                          <span
                            key={`${dateStr}-${t.id}`}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: t.color || "#999",
                              display: "inline-block",
                            }}
                          />
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="row-between">
              <h2 style={{ margin: 0 }}>ToDo（{selected}）</h2>
              <button onClick={() => setCollapsed((v) => !v)}>{collapsed ? "開く" : "閉じる"}</button>
            </div>

            {!collapsed && (
              <div className="card" style={{ marginTop: 10 }}>
                {selectedItems.length === 0 ? (
                  <div className="small">この日のタスクはありません（セルをタップして追加）</div>
                ) : (
                  selectedItems.map((it: any) => (
                    <div
                      key={`${it.taskId}@${it.date}`}
                      className="task"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/taskId", String(it.taskId))}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {it.title}
                        </div>
                        {it.memo && <div className="small">{it.memo}</div>}
                      </div>

                      <div className="row" style={{ gap: 8 }}>
                        {!it.completed ? (
                          <button
                            className="primary"
                            onClick={async () => {
                              await completeOccurrence(it.taskId, it.date);
                              await refresh();
                            }}
                          >
                            Complete
                          </button>
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
        </main>
      </div>
    </div>
  );
}
