// src/pages/GoalsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearToken,
  listGoals,
  createGoal,
  addTask,
  listTasks,
  completeTask,
  GoalListItem,
  TaskItem,
} from "../lib/api";

import MoneyRainOverlay from "../components/MoneyRainOverlay";

import Calender, { DragTaskPayload, ScheduleEvent } from "./Calender";
import ScheduleModal from "../components/ScheduleModel";

// schedules 用 localStorage key
const SKEY = "todo-money:schedules:v1";

// ★ 履歴用
const HISTORY_KEY = "todo-money:scheduleHistory:v1";

type ScheduleHistoryItem = {
  id: string;
  scheduleId: string;
  date: string; // "YYYY-MM-DD"
  doneAt: string; // ISO
  title: string;
};

function loadSchedules(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(SKEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function saveSchedules(list: ScheduleEvent[]) {
  localStorage.setItem(SKEY, JSON.stringify(list));
}

function loadHistory(): ScheduleHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function saveHistory(list: ScheduleHistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// 便宜上ここにも YMD ヘルパー
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

type TabId = "todo" | "calendar" | "history" | "other";

export default function GoalsPage() {
  const nav = useNavigate();

  // ★ スプラッシュ（lifeRabbit）
  const [showSplash, setShowSplash] = useState(true);

  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [tasksByGoal, setTasksByGoal] = useState<Record<number, TaskItem[]>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("副業で月5万");
  const [newIncome, setNewIncome] = useState(600000);

  // MoneyRain用
  const [rainSeed, setRainSeed] = useState(0);
  const prevTotalEarnedRef = useRef<number>(0);

  // schedules
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() =>
    loadSchedules()
  );

  // モーダル
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBaseDate, setModalBaseDate] = useState<Date>(new Date());
  const [modalInitial, setModalInitial] =
    useState<Partial<ScheduleEvent> | null>(null);
  // ★ クリックした「その日」の情報
  const [modalClickedDate, setModalClickedDate] = useState<string | null>(null);

  // Show Tasks 開閉
  const [openGoals, setOpenGoals] = useState<Record<number, boolean>>({});

  // ★ 履歴
  const [history, setHistory] = useState<ScheduleHistoryItem[]>(() =>
    loadHistory()
  );

  // ★ タブ
  const [activeTab, setActiveTab] = useState<TabId>("calendar");

  // ====== ★ ここから追加：カレンダー左タスクリスト開閉 ======
  const [taskListOpen, setTaskListOpen] = useState(true);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      const small = mq.matches;
      setIsSmall(small);
      // スマホは閉じる / PCは開く
      setTaskListOpen(!small);
    };

    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  // ====== ★ 追加ここまで ======

  // ====== ★ 追加：スマホでカレンダーを1画面に収める自動スケール ======
  const calFitRef = useRef<HTMLDivElement | null>(null);
  const [calScale, setCalScale] = useState(1);

  useEffect(() => {
    // スマホのカレンダータブだけ適用
    if (!isSmall || activeTab !== "calendar") {
      setCalScale(1);
      return;
    }

    const el = calFitRef.current;
    if (!el) return;

    const recompute = () => {
      // レイアウト確定後に計測（イベントが多い・画像読み込みなどでもズレにくい）
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const available = window.innerHeight - rect.top - 12; // 下余白 12px
        const natural = el.scrollHeight; // スケール前の本来高さ
        if (!natural || natural <= 0) return;

        const next = Math.min(1, available / natural);
        // 小さくしすぎるとタップしづらいので下限を設ける
        setCalScale(Math.max(0.78, next));
      });
    };

    recompute();
    window.addEventListener("resize", recompute);

    return () => window.removeEventListener("resize", recompute);
  }, [isSmall, activeTab, taskListOpen, schedules.length]);
  // ====== ★ 追加ここまで ======

  // ★ 初回マウント時に lifeRabbit スプラッシュを少しだけ表示
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500); // 1.5秒表示
    return () => clearTimeout(timer);
  }, []);

  async function refreshGoals() {
    const g = await listGoals();
    setGoals(g);
  }

  async function loadTasks(goalId: number) {
    const t = await listTasks(goalId);
    setTasksByGoal((m) => ({ ...m, [goalId]: t }));
  }

  // 初回：Goal 一覧だけ読み込み
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await refreshGoals();
      } catch (e: any) {
        setError(e?.message ?? "読み込みに失敗しました");
      }
    })();
  }, []);

  // ★ Goal が変わったら、全 Goal のタスクをまとめて取得
  useEffect(() => {
    (async () => {
      const map: Record<number, TaskItem[]> = {};
      for (const g of goals) {
        try {
          const ts = await listTasks(g.id);
          map[g.id] = ts;
        } catch {
          map[g.id] = [];
        }
      }
      setTasksByGoal(map);
    })();
  }, [goals]);

  // 合計獲得 → 雨
  useEffect(() => {
    const total = goals.reduce(
      (sum: number, g: any) => sum + (g.earnedAmount ?? g.earned ?? 0),
      0
    );
    if (total > prevTotalEarnedRef.current) setRainSeed(Date.now());
    prevTotalEarnedRef.current = total;
  }, [goals]);

  const totalEarned = useMemo(() => {
    return goals.reduce((sum, g: any) => sum + (g.earnedAmount ?? 0), 0);
  }, [goals]);

  // schedules 永続化
  useEffect(() => {
    saveSchedules(schedules);
  }, [schedules]);

  // 履歴 永続化
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  async function onCreateGoal() {
    setError(null);
    try {
      await createGoal(newTitle, Number(newIncome));
      await refreshGoals();
    } catch (e: any) {
      setError(e?.message ?? "Goal作成に失敗しました");
    }
  }

  async function onAddTask(goalId: number) {
    const title = prompt("タスク名を入力してください");
    if (!title) return;
    setError(null);
    try {
      await addTask(goalId, title);
      await refreshGoals();
      await loadTasks(goalId);
    } catch (e: any) {
      setError(e?.message ?? "タスク追加に失敗しました");
    }
  }

  async function onComplete(taskId: number, goalId: number) {
    setError(null);
    try {
      await completeTask(taskId);
      await refreshGoals();
      await loadTasks(goalId);
      // ★ ここで「Goalタスクの履歴」にも足すのは次ステップでOK
    } catch (e: any) {
      setError(e?.message ?? "完了処理に失敗しました");
    }
  }

  // ★ 詳細タスクのタイトル編集（フロントのみ）
  function onEditTask(task: TaskItem, goalId: number) {
    const next = prompt("タスク名を編集", task.title);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      alert("タスク名が空です");
      return;
    }

    setTasksByGoal((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] ?? []).map((t) =>
        t.id === task.id ? { ...t, title: trimmed } : t
      ),
    }));
  }

  function logout() {
    clearToken();
    nav("/login", { replace: true });
  }

  // ★ カレンダー：日付クリック → 新規追加モーダル
  function openNewSchedule(
    date: Date,
    initial?: Partial<ScheduleEvent>,
    clickedDate?: string
  ) {
    setModalBaseDate(date);
    setModalInitial(initial ?? null);
    setModalClickedDate(clickedDate ?? null);
    setModalOpen(true);
  }

  // ★ ドロップ：タスクを落とした日を開始日に
  function handleDropTask(date: Date, task: DragTaskPayload) {
    openNewSchedule(
      date,
      {
        title: task.title,
        memo: "",
        taskRef: { goalId: task.goalId, taskId: task.taskId },
      },
      toYMD(date)
    );
  }

  // ★ 保存（新規/編集）
  function handleSaveSchedule(
    data: Omit<ScheduleEvent, "id">,
    editingId?: string
  ) {
    setSchedules((prev) => {
      if (editingId) {
        return prev.map((x) =>
          x.id === editingId ? { ...x, ...data, id: editingId } : x
        );
      }
      return [...prev, { ...data, id: uid() }];
    });
    setModalOpen(false);
  }

  function handleDeleteSchedule(id: string) {
    if (!confirm("このスケジュールを削除しますか？")) return;
    setSchedules((prev) => prev.filter((x) => x.id !== id));
    setModalOpen(false);
  }

  // ★ カレンダー上のイベントクリック → 編集モード + その日だけ完了
  function handleEventClick(ev: ScheduleEvent, dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    openNewSchedule(new Date(y, m - 1, d), ev, dateStr);
  }

  // ★ Show Tasks 開閉（ToDoタブ用）
  async function handleToggleTasks(goalId: number) {
    setError(null);
    const isOpen = openGoals[goalId];

    if (isOpen) {
      setOpenGoals((m) => ({ ...m, [goalId]: false }));
      return;
    }

    try {
      if (!tasksByGoal[goalId]) {
        await loadTasks(goalId);
      }
      setOpenGoals((m) => ({ ...m, [goalId]: true }));
    } catch (e: any) {
      setError(e?.message ?? "タスク読み込みに失敗しました");
    }
  }

  // ★ 「この日だけ完了」トグル
  function handleToggleDoneForDate(
    scheduleId: string,
    dateStr: string,
    done: boolean
  ) {
    let scheduleTitle = "";

    // completedDates を更新
    setSchedules((prev) =>
      prev.map((ev) => {
        if (ev.id !== scheduleId) return ev;
        scheduleTitle = ev.title;
        const prevDates = ev.completedDates ?? [];
        let nextDates: string[];
        if (done) {
          // すでに含まれていればそのまま
          if (prevDates.includes(dateStr)) return ev;
          nextDates = [...prevDates, dateStr];
        } else {
          nextDates = prevDates.filter((d) => d !== dateStr);
        }
        return { ...ev, completedDates: nextDates };
      })
    );

    // ★ 日々のタスク完了でも「お金の雨」を降らせる
    if (done) {
      setRainSeed(Date.now());
    }

    // 履歴も更新
    if (done) {
      const item: ScheduleHistoryItem = {
        id: uid(),
        scheduleId,
        date: dateStr,
        doneAt: new Date().toISOString(),
        title: scheduleTitle,
      };
      setHistory((prev) => [...prev, item]);
    } else {
      setHistory((prev) =>
        prev.filter((h) => !(h.scheduleId === scheduleId && h.date === dateStr))
      );
    }
  }

  // ★ カレンダー左用：全 Goal の未完了タスクをフラット化
  const dragTaskList = useMemo(() => {
    const items: { goalId: number; goalTitle: string; task: TaskItem }[] = [];
    for (const g of goals) {
      const ts = tasksByGoal[g.id] ?? [];
      ts
        .filter((t) => !t.completed)
        .forEach((t) => items.push({ goalId: g.id, goalTitle: g.title, task: t }));
    }
    return items;
  }, [goals, tasksByGoal]);

  // ★ スプラッシュ表示中は lifeRabbit 画面だけ表示
  if (showSplash) {
    return (
      <div className="splash-root">
        <div className="splash-bunny">🐰</div>
        <div className="splash-title">lifeRabbit</div>
        <div className="splash-sub">毎日のタスクでお金の雨を降らせよう</div>
      </div>
    );
  }

  // ここから通常画面
  return (
    <div className="container">
      <MoneyRainOverlay seed={rainSeed} />

      {/* ヘッダー */}
      <div className="row-between">
        <h1>Liferabbit</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="small" style={{ marginBottom: 12 }}>
        合計獲得（推定）： <b>{totalEarned.toFixed(2)} USD</b>
      </div>

      {/* ★ タブバー */}
      <div className="card" style={{ marginBottom: 16, padding: "6px 8px" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "space-around",
          }}
        >
          {(
            [
              { id: "todo", label: "ToDo" },
              { id: "calendar", label: "カレンダー" },
              { id: "history", label: "履歴" },
              { id: "other", label: "その他" },
            ] as { id: TabId; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 999,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  activeTab === tab.id ? "black" : "rgba(0,0,0,0.03)",
                color: activeTab === tab.id ? "white" : "#555",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* === ToDo タブ === */}
      {activeTab === "todo" && (
        <>
          {/* 新規リスト*/}
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0 }}>新規リスト</h2>

            <label>Title</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />

            <label>Annual Income（JPY換算でもOK）</label>
            <input
              value={newIncome}
              onChange={(e) => setNewIncome(Number(e.target.value))}
              inputMode="numeric"
            />

            <div style={{ marginTop: 14 }}>
              <button className="primary" onClick={onCreateGoal}>
                Create
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {/* goals & 詳細タスク */}
          {goals.map((g: any) => (
            <div className="card" key={g.id} style={{ marginBottom: 14 }}>
              <div className="row-between">
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{g.title}</div>
                  <div className="small">
                    annualIncome: {g.annualIncome} / day:{" "}
                    {(g.annualIncome / g.daysPerYear).toFixed(2)} / taskReward:{" "}
                    {g.perTaskReward.toFixed(2)}
                  </div>
                  <div className="small">
                    tasks: {g.completedTaskCount}/{g.taskCount} / earned:{" "}
                    {g.earnedAmount.toFixed(2)} USD
                  </div>
                </div>

                <div className="row">
                  <button onClick={() => onAddTask(g.id)}>+ Task</button>
                  <button onClick={() => handleToggleTasks(g.id)}>
                    {openGoals[g.id] ? "Hide Tasks" : "Show Tasks"}
                  </button>
                </div>
              </div>

              {/* 詳細タスク */}
              {openGoals[g.id] && tasksByGoal[g.id] && (
                <>
                  <hr />
                  {tasksByGoal[g.id].length === 0 ? (
                    <div className="small">タスクがありません</div>
                  ) : (
                    tasksByGoal[g.id].map((t) => (
                      <div key={t.id} className="task">
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              cursor: "grab",
                              userSelect: "none",
                            }}
                            draggable={!t.completed}
                            onDragStart={(e) => {
                              const payload: DragTaskPayload = {
                                kind: "task",
                                goalId: g.id,
                                taskId: t.id,
                                title: t.title,
                              };
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify(payload)
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            title={
                              t.completed
                                ? "完了済みはドラッグ不可"
                                : "ドラッグしてカレンダーへ"
                            }
                          >
                            {t.title}{" "}
                            {!t.completed && (
                              <span className="badge" style={{ marginLeft: 8 }}>
                                drag
                              </span>
                            )}
                          </div>
                          <div className="small">
                            {t.completed ? (
                              <span className="badge">completed</span>
                            ) : (
                              <span className="badge">todo</span>
                            )}
                          </div>
                        </div>

                        <div className="row" style={{ gap: 8 }}>
                          <button onClick={() => onEditTask(t, g.id)}>Edit</button>
                          {!t.completed && (
                            <button
                              className="primary"
                              onClick={() => onComplete(t.id, g.id)}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          ))}
        </>
      )}

      {/* === カレンダー タブ === */}
      {activeTab === "calendar" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row-between">
            <h2 style={{ marginTop: 0 }}>カレンダー</h2>

            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <div className="small muted">日付クリック or タスクをD&amp;D</div>

              {/* ★ 追加：トグル（PC/スマホ両方） */}
              <button
                onClick={() => setTaskListOpen((v) => !v)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {taskListOpen ? "タスクリストを閉じる" : "タスクリストを開く"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            {/* ---- スマホ：縦積み ---- */}
            {isSmall ? (
              <>
                {taskListOpen && (
                  <div
                    style={{
                      background: "#fafafa",
                      borderRadius: 12,
                      padding: 8,
                      marginBottom: 12,
                      maxHeight: 280,
                      overflowY: "auto",
                    }}
                  >
                    <div className="row-between" style={{ marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>タスクリスト</h3>
                      <div className="small muted">{dragTaskList.length}件</div>
                    </div>
                    <div className="small muted" style={{ marginBottom: 6 }}>
                      カレンダーにドラッグ＆ドロップして登録
                    </div>

                    {dragTaskList.length === 0 ? (
                      <div className="small muted">未完了タスクはありません</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {dragTaskList.map(({ goalId, goalTitle, task }) => (
                          <div
                            key={`${goalId}-${task.id}`}
                            style={{
                              padding: "6px 8px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(0,0,0,0.02)",
                              cursor: "grab",
                              userSelect: "none",
                              fontSize: 12,
                            }}
                            draggable
                            onDragStart={(e) => {
                              const payload: DragTaskPayload = {
                                kind: "task",
                                goalId,
                                taskId: task.id,
                                title: task.title,
                              };
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify(payload)
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            title={`${goalTitle} / ${task.title}`}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                marginBottom: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {task.title}
                            </div>
                            <div className="small muted">{goalTitle}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* カレンダー本体：スマホは“1画面に収める”ために自動スケール */}
                <div style={{ overflow: "hidden" }}>
                  <div
                    ref={calFitRef}
                    style={{
                      transform: `scale(${calScale})`,
                      transformOrigin: "top left",
                      // scaleすると横幅も縮むので、幅を逆補正してクリップを防ぐ
                      width: calScale === 1 ? "100%" : `calc(100% / ${calScale})`,
                    }}
                  >
                    <Calender
                      events={schedules}
                      onDayClick={(d) => openNewSchedule(d, undefined, toYMD(d))}
                      onDropTask={handleDropTask}
                      onEventClick={handleEventClick}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* ---- PC：2カラム（開いてる時だけ） ---- */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: taskListOpen
                    ? "minmax(220px,260px) minmax(0,1fr)"
                    : "minmax(0,1fr)",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                {/* 左：タスクリスト */}
                {taskListOpen && (
                  <div
                    style={{
                      background: "#fafafa",
                      borderRadius: 12,
                      padding: 8,
                      maxHeight: 520,
                      overflowY: "auto",
                    }}
                  >
                    <div className="row-between" style={{ marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>タスクリスト</h3>
                      <div className="small muted">{dragTaskList.length}件</div>
                    </div>
                    <div className="small muted" style={{ marginBottom: 6 }}>
                      右側のカレンダーにドラッグ＆ドロップしてスケジュール登録
                    </div>

                    {dragTaskList.length === 0 ? (
                      <div className="small muted">未完了タスクはありません</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {dragTaskList.map(({ goalId, goalTitle, task }) => (
                          <div
                            key={`${goalId}-${task.id}`}
                            style={{
                              padding: "6px 8px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(0,0,0,0.02)",
                              cursor: "grab",
                              userSelect: "none",
                              fontSize: 12,
                            }}
                            draggable
                            onDragStart={(e) => {
                              const payload: DragTaskPayload = {
                                kind: "task",
                                goalId,
                                taskId: task.id,
                                title: task.title,
                              };
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify(payload)
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            title={`${goalTitle} / ${task.title}`}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                marginBottom: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {task.title}
                            </div>
                            <div className="small muted">{goalTitle}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 右：カレンダー本体 */}
                <div style={{ overflowX: "auto", minWidth: 0 }}>
                  <Calender
                    events={schedules}
                    onDayClick={(d) => openNewSchedule(d, undefined, toYMD(d))}
                    onDropTask={handleDropTask}
                    onEventClick={handleEventClick}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* スケジュールモーダル（どのタブでも共通） */}
      <ScheduleModal
        open={modalOpen}
        baseDate={modalBaseDate}
        initial={modalInitial}
        clickedDate={modalClickedDate ?? undefined}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSchedule}
        onDelete={handleDeleteSchedule}
        onToggleDoneForDate={handleToggleDoneForDate}
      />

      {/* === 履歴タブ === */}
      {activeTab === "history" && (
        <>
          {history.length === 0 ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>タスク履歴</h2>
              <div className="small muted">
                まだ「この日だけ完了」の履歴はありません
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>タスク履歴</h2>
              <div className="small muted">
                カレンダーから「この日だけ完了」にした履歴
              </div>
              <ul
                style={{
                  marginTop: 8,
                  paddingLeft: 16,
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {history
                  .slice()
                  .reverse()
                  .slice(0, 50)
                  .map((h) => (
                    <li key={h.id} className="small">
                      <span>{h.date} </span>
                      <span>{h.title}</span>
                      <span style={{ opacity: 0.6 }}>
                        {" "}
                        ({new Date(h.doneAt).toLocaleString()})
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* === その他タブ === */}
      {activeTab === "other" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>その他</h2>
          <div className="small" style={{ marginBottom: 8 }}>
            課金状態や設定などをまとめる予定の画面です。
          </div>

          {/* 課金状態プレースホルダ */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              marginBottom: 12,
            }}
          >
            <div className="small muted">課金ステータス</div>
            <div className="small">未実装（Coming Soon）</div>
          </div>

          <button
            className="primary"
            style={{ marginBottom: 12 }}
            onClick={() => alert("課金処理はまだ実装していません")}
          >
            課金プランを購入（ダミー）
          </button>

          <hr style={{ margin: "12px 0" }} />

          <button onClick={logout}>ログアウト</button>
        </div>
      )}
    </div>
  );
}
