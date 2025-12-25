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

// schedules 用 localStorage key（ユーザー別）
const SKEY = (userKey: string) => `todo-money:schedules:v1:${userKey}`;
// 履歴用（ユーザー別）
const HISTORY_KEY = (userKey: string) => `todo-money:scheduleHistory:v1:${userKey}`;

type ScheduleHistoryItem = {
  id: string;
  scheduleId: string;
  date: string; // "YYYY-MM-DD"
  doneAt: string; // ISO
  title: string;
};

function loadSchedules(userKey: string): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(SKEY(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function saveSchedules(userKey: string, list: ScheduleEvent[]) {
  localStorage.setItem(SKEY(userKey), JSON.stringify(list));
}

function loadHistory(userKey: string): ScheduleHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function saveHistory(userKey: string, list: ScheduleHistoryItem[]) {
  localStorage.setItem(HISTORY_KEY(userKey), JSON.stringify(list));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getUserKeyFromJwt(): string {
  const token =
    localStorage.getItem("todo-money:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    "";

  if (!token || token.split(".").length < 2) return "guest";

  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const obj = JSON.parse(json);
    return String(obj.email || obj.sub || obj.userId || obj.uid || "guest");
  } catch {
    return "guest";
  }
}

// YMD helpers
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Goal colors
const GOAL_COLORS = [
  "#111827",
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
];
function goalColor(goalId: number) {
  return GOAL_COLORS[Math.abs(goalId) % GOAL_COLORS.length];
}

// Goal tags (暫定)
function goalTag(goalTitle: string) {
  const t = goalTitle.toLowerCase();
  if (t.includes("セキ") || t.includes("支援") || t.includes("security")) return "📚セキスペ";
  if (t.includes("ラン") || t.includes("run") || t.includes("ジョグ") || t.includes("マラソン"))
    return "🏃ラン";
  if (t.includes("家事") || t.includes("育児") || t.includes("掃除") || t.includes("洗"))
    return "🏠家事";
  return "🎯Goal";
}

type TabId = "todo" | "calendar" | "history" | "other";

export default function GoalsPage() {
  const nav = useNavigate();
  const userKey = useMemo(() => getUserKeyFromJwt(), []);

  // ✅ mobile: DnDが効きにくいので「タップで選択→日付タップで登録」用
  const [pickedTask, setPickedTask] = useState<DragTaskPayload | null>(null);

  // Splash
  const [showSplash, setShowSplash] = useState(true);

  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [tasksByGoal, setTasksByGoal] = useState<Record<number, TaskItem[]>>({});
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("副業で月5万");
  const [newIncome, setNewIncome] = useState(600000);

  // MoneyRain
  const [rainSeed, setRainSeed] = useState(0);
  const prevTotalEarnedRef = useRef<number>(0);

  // schedules
  const [schedules, setSchedules] = useState<ScheduleEvent[]>(() => loadSchedules(userKey));

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBaseDate, setModalBaseDate] = useState<Date>(new Date());
  const [modalInitial, setModalInitial] = useState<Partial<ScheduleEvent> | null>(null);
  const [modalClickedDate, setModalClickedDate] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // ToDo open/close
  const [openGoals, setOpenGoals] = useState<Record<number, boolean>>({});

  // history
  const [history, setHistory] = useState<ScheduleHistoryItem[]>(() => loadHistory(userKey));

  // tabs
  const [activeTab, setActiveTab] = useState<TabId>("calendar");

  // calendar left tasklist open/close
  const [taskListOpen, setTaskListOpen] = useState(true);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      const small = mq.matches;
      setIsSmall(small);
      setTaskListOpen(!small);
    };

    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // mobile calendar autoscale
  const calOuterRef = useRef<HTMLDivElement | null>(null);
  const calContentRef = useRef<HTMLDivElement | null>(null);
  const [calScale, setCalScale] = useState(1);

  useEffect(() => {
    if (!isSmall || activeTab !== "calendar") {
      setCalScale(1);
      return;
    }

    const outer = calOuterRef.current;
    const content = calContentRef.current;
    if (!outer || !content) return;

    const recompute = () => {
      requestAnimationFrame(() => {
        const outerRect = outer.getBoundingClientRect();
        const available = window.innerHeight - outerRect.top - 12;
        const natural = content.scrollHeight;

        if (!natural || natural <= 0) return;

        const next = Math.min(1, available / natural);
        setCalScale(Math.max(0.55, next));
      });
    };

    recompute();
    window.addEventListener("resize", recompute);

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => recompute()) : null;

    ro?.observe(content);

    return () => {
      window.removeEventListener("resize", recompute);
      ro?.disconnect();
    };
  }, [isSmall, activeTab, taskListOpen, schedules.length]);

  // splash timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
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

  // initial load goals
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

  // load all tasks for all goals when goals change
  useEffect(() => {
    (async () => {
      const map: Record<number, TaskItem[]> = {};
      for (const g of goals as any[]) {
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

  // total earned -> rain
  useEffect(() => {
    const total = goals.reduce((sum: number, g: any) => sum + (g.earnedAmount ?? g.earned ?? 0), 0);
    if (total > prevTotalEarnedRef.current) setRainSeed(Date.now());
    prevTotalEarnedRef.current = total;
  }, [goals]);

  const totalEarned = useMemo(() => {
    return goals.reduce((sum, g: any) => sum + (g.earnedAmount ?? 0), 0);
  }, [goals]);

  // persist schedules/history
  useEffect(() => {
    saveSchedules(userKey, schedules);
  }, [userKey, schedules]);

  useEffect(() => {
    saveHistory(userKey, history);
  }, [userKey, history]);

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
    } catch (e: any) {
      setError(e?.message ?? "完了処理に失敗しました");
    }
  }

  // front-only edit title
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
      [goalId]: (prev[goalId] ?? []).map((t) => (t.id === task.id ? { ...t, title: trimmed } : t)),
    }));
  }

  function logout() {
    clearToken();
    nav("/login", { replace: true });
  }

  // open modal (new/edit)
  function openNewSchedule(date: Date, initial?: Partial<ScheduleEvent>, clickedDate?: string) {
    setModalBaseDate(date);
    setModalInitial(initial ?? null);
    setModalClickedDate(clickedDate ?? null);

    // initial が ScheduleEvent のときは id を持っている
    setEditingScheduleId((initial as any)?.id ?? null);

    setModalOpen(true);
  }

  // drop task into day
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

  // save schedule (new/edit)
  function handleSaveSchedule(data: Omit<ScheduleEvent, "id">) {
    setSchedules((prev) => {
      if (editingScheduleId) {
        return prev.map((x) =>
          x.id === editingScheduleId ? { ...x, ...data, id: editingScheduleId } : x
        );
      }
      return [...prev, { ...data, id: uid() }];
    });
    setModalOpen(false);
    setEditingScheduleId(null);
  }

  function handleDeleteSchedule(id: string) {
    if (!confirm("このスケジュールを削除しますか？")) return;
    setSchedules((prev) => prev.filter((x) => x.id !== id));
    setModalOpen(false);
    setEditingScheduleId(null);
  }

  function addTemplate(kind: "secsp" | "run" | "house") {
    const start = toYMD(new Date());
    const end = "2026-04-18";

    const mk = (title: string, weekdays: boolean[], memo = ""): ScheduleEvent => ({
      id: uid(),
      title,
      memo,
      startDate: start,
      endDate: end,
      weekdays,
      oneShot: false,
    });

    // [Sun..Sat]
    const SUN = false,
      MON = false,
      TUE = true,
      WED = true,
      THU = true,
      FRI = false,
      SAT = false;

    let items: ScheduleEvent[] = [];
    if (kind === "secsp") {
      items = [
        mk("午前Ⅱ 1問（本番意識）", [SUN, MON, true, false, true, false, false]),
        mk("午後Ⅰ 1問（読解）", [SUN, MON, false, true, false, true, false]),
        mk("午後Ⅱ 型練習 1問", [true, false, false, false, true, false, false]),
        mk("用語整理 30分", [SUN, true, false, true, false, false, true]),
      ];
    } else if (kind === "run") {
      items = [
        mk("回復ジョグ 5〜7km", [SUN, true, false, false, true, false, false]),
        mk("ジョグ 8〜10km", [false, false, true, false, false, true, false]),
        mk("ロング 10〜12km", [true, false, false, false, false, false, false]),
      ];
    } else {
      items = [
        mk("掃除 20分", [false, true, false, false, false, true, false]),
        mk("洗濯", [false, false, true, false, false, false, true]),
        mk("買い出し", [true, false, false, false, false, false, false]),
      ];
    }

    setSchedules((prev) => [...prev, ...items]);
  }

  // calendar event click -> open edit
  function handleEventClick(ev: ScheduleEvent, dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    openNewSchedule(new Date(y, m - 1, d), ev, dateStr);
  }

  // toggle tasks visibility (todo tab)
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

  // one-day done toggle
  function handleToggleDoneForDate(scheduleId: string, dateStr: string, done: boolean) {
    let scheduleTitle = "";

    setSchedules((prev) =>
      prev.map((ev: any) => {
        if (ev.id !== scheduleId) return ev;
        scheduleTitle = ev.title;
        const prevDates: string[] = ev.completedDates ?? [];
        let nextDates: string[];
        if (done) {
          if (prevDates.includes(dateStr)) return ev;
          nextDates = [...prevDates, dateStr];
        } else {
          nextDates = prevDates.filter((d) => d !== dateStr);
        }
        return { ...ev, completedDates: nextDates };
      })
    );

    if (done) setRainSeed(Date.now());

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
      setHistory((prev) => prev.filter((h) => !(h.scheduleId === scheduleId && h.date === dateStr)));
    }
  }

  // flatten uncompleted tasks
  const dragTaskList = useMemo(() => {
    const items: { goalId: number; goalTitle: string; task: TaskItem }[] = [];
    for (const g of goals as any[]) {
      const ts = tasksByGoal[g.id] ?? [];
      ts.filter((t) => !t.completed).forEach((t) =>
        items.push({ goalId: g.id, goalTitle: g.title, task: t })
      );
    }
    return items;
  }, [goals, tasksByGoal]);

  // taskRef -> schedules
  const schedulesByTaskRef = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const ev of schedules as any[]) {
      if (!ev.taskRef) continue;
      const key = `${ev.taskRef.goalId}-${ev.taskRef.taskId}`;
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
      map.set(k, arr);
    }
    return map;
  }, [schedules]);

  // splash
  if (showSplash) {
    return (
      <div className="splash-root">
        <div className="splash-bunny">🐰</div>
        <div className="splash-title">lifeRabbit</div>
        <div className="splash-sub">毎日のタスクでお金の雨を降らせよう</div>
      </div>
    );
  }

  return (
    // ✅ 横スクロールを抑止。縦スクロールはbody側で自然にOK
    <div className="container" style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <MoneyRainOverlay seed={rainSeed} />

      {/* header（Liferabbit文字は削除。Logoutだけに） */}
      <div className="row-between" style={{ alignItems: "center" }}>
        <div />
        <button onClick={logout}>Logout</button>
      </div>

      <div className="small" style={{ marginBottom: 12 }}>
        合計獲得（推定）： <b>{totalEarned.toFixed(2)} USD</b>
      </div>

      {/* tabs */}
      <div className="card" style={{ marginBottom: 16, padding: "6px 8px" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-around" }}>
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
                background: activeTab === tab.id ? "black" : "rgba(0,0,0,0.03)",
                color: activeTab === tab.id ? "white" : "#555",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ToDo */}
      {activeTab === "todo" && (
        <>
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

          {goals.map((g: any) => (
            <div className="card" key={g.id} style={{ marginBottom: 14 }}>
              <div className="row-between">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, wordBreak: "break-word" }}>{g.title}</div>
                  <div className="small">
                    annualIncome: {g.annualIncome} / day: {(g.annualIncome / g.daysPerYear).toFixed(2)} /
                    taskReward: {g.perTaskReward.toFixed(2)}
                  </div>
                  <div className="small">
                    tasks: {g.completedTaskCount}/{g.taskCount} / earned: {g.earnedAmount.toFixed(2)} USD
                  </div>
                </div>

                <div className="row">
                  <button onClick={() => onAddTask(g.id)}>+ Task</button>
                  <button onClick={() => handleToggleTasks(g.id)}>
                    {openGoals[g.id] ? "Hide Tasks" : "Show Tasks"}
                  </button>
                </div>
              </div>

              {openGoals[g.id] && tasksByGoal[g.id] && (
                <>
                  <hr />
                  {tasksByGoal[g.id].length === 0 ? (
                    <div className="small">タスクがありません</div>
                  ) : (
                    tasksByGoal[g.id].map((t) => (
                      <div key={t.id} className="task">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{ fontWeight: 600, cursor: "grab", userSelect: "none" }}
                            draggable={!t.completed}
                            onDragStart={(e) => {
                              const payload: DragTaskPayload = {
                                kind: "task",
                                goalId: g.id,
                                taskId: t.id,
                                title: t.title,
                              };
                              e.dataTransfer.setData("application/json", JSON.stringify(payload));
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            title={t.completed ? "完了済みはドラッグ不可" : "ドラッグしてカレンダーへ"}
                          >
                            {t.title}{" "}
                            {!t.completed && (
                              <span className="badge" style={{ marginLeft: 8 }}>
                                drag
                              </span>
                            )}
                          </div>

                          <div className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span className="badge">{goalTag(g.title)}</span>
                            <span className="small muted" style={{ opacity: 0.8, minWidth: 0 }}>
                              {g.title}
                            </span>
                            <span className="badge">{t.completed ? "completed" : "todo"}</span>
                          </div>
                        </div>

                        <div className="row" style={{ gap: 8 }}>
                          <button onClick={() => onEditTask(t, g.id)}>Edit</button>

                          {!t.completed &&
                            (isSmall ? (
                              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked) onComplete(t.id, g.id);
                                  }}
                                />
                                <span className="small">完了</span>
                              </label>
                            ) : (
                              <button className="primary" onClick={() => onComplete(t.id, g.id)}>
                                Complete
                              </button>
                            ))}
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

      {/* Calendar */}
      {activeTab === "calendar" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row-between" style={{ gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>カレンダー</h2>

            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div className="small muted">日付クリック or タスクをD&amp;D</div>

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
                    <div className="row-between" style={{ marginBottom: 8, gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>タスクリスト</h3>

                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <div className="small muted">{dragTaskList.length}件</div>
                        {pickedTask && (
                          <button
                            onClick={() => setPickedTask(null)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "white",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            選択解除
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ✅ スマホはD&Dではなくタップ選択 */}
                    <div className="small muted" style={{ marginBottom: 6 }}>
                      タスクをタップして選択 → カレンダーの日付をタップで登録
                    </div>

                    {dragTaskList.length === 0 ? (
                      <div className="small muted">未完了タスクはありません</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {dragTaskList.map(({ goalId, goalTitle, task }) => {
                          const key = `${goalId}-${task.id}`;
                          const linked = schedulesByTaskRef.get(key) ?? [];
                          const dot = goalColor(goalId);
                          const tag = goalTag(goalTitle);
                          const isPicked =
                            pickedTask?.goalId === goalId && pickedTask?.taskId === task.id;

                          return (
                            <div
                              key={key}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: isPicked
                                  ? "1px solid rgba(0,0,0,0.35)"
                                  : "1px solid rgba(0,0,0,0.08)",
                                background: isPicked ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
                              }}
                            >
                              {/* ✅ タップで選択 */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
                                onClick={() =>
                                  setPickedTask({
                                    kind: "task",
                                    goalId,
                                    taskId: task.id,
                                    title: task.title,
                                  })
                                }
                                title="タップして選択 → 日付タップで登録"
                              >
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: dot,
                                    flex: "0 0 auto",
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 12,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {task.title}
                                    {isPicked && (
                                      <span className="badge" style={{ marginLeft: 6 }}>
                                        選択中
                                      </span>
                                    )}
                                  </div>

                                  <div className="small muted" style={{ display: "flex", gap: 6 }}>
                                    <span>{tag}</span>
                                    <span
                                      style={{
                                        opacity: 0.7,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {goalTitle}
                                    </span>
                                    {linked.length > 0 && (
                                      <span className="badge" style={{ marginLeft: 6 }}>
                                        scheduled {linked.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {linked.length > 0 && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  {linked.map((ev) => (
                                    <div
                                      key={ev.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        padding: "6px 8px",
                                        borderRadius: 10,
                                        background: "white",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                      }}
                                    >
                                      <div className="small" style={{ minWidth: 0 }}>
                                        <b style={{ marginRight: 6 }}>{ev.title}</b>
                                        <span style={{ opacity: 0.7 }}>
                                          {ev.startDate}〜{ev.endDate}
                                        </span>
                                      </div>

                                      <button
                                        onClick={() =>
                                          openNewSchedule(parseYMD(ev.startDate), ev, ev.startDate)
                                        }
                                        style={{
                                          padding: "4px 8px",
                                          borderRadius: 999,
                                          border: "1px solid rgba(0,0,0,0.12)",
                                          background: "white",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* mobile calendar with scale */}
                <div ref={calOuterRef} style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      transform: `scale(${calScale})`,
                      transformOrigin: "top left",
                      width: calScale === 1 ? "100%" : `calc(100% / ${calScale})`,
                    }}
                  >
                    <div ref={calContentRef}>
                      <Calender
                        events={schedules}
                        onDayClick={(d) => {
                          // ✅ スマホ: タスク選択中なら、そのタスクで新規スケジュール作成
                          if (pickedTask) {
                            openNewSchedule(
                              d,
                              {
                                title: pickedTask.title,
                                memo: "",
                                taskRef: {
                                  goalId: pickedTask.goalId,
                                  taskId: pickedTask.taskId,
                                },
                              },
                              toYMD(d)
                            );
                            setPickedTask(null); // 1回登録したら解除
                            return;
                          }

                          // 通常: ただの日付クリック
                          openNewSchedule(d, undefined, toYMD(d));
                        }}
                        // iPhoneではDnDが効きにくいが、PC/一部環境では動くので残してOK
                        onDropTask={handleDropTask}
                        onEventClick={handleEventClick}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
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
                {/* PC left task list（ここは従来通り DnD） */}
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
                        {dragTaskList.map(({ goalId, goalTitle, task }) => {
                          const key = `${goalId}-${task.id}`;
                          const linked = schedulesByTaskRef.get(key) ?? [];
                          const dot = goalColor(goalId);
                          const tag = goalTag(goalTitle);

                          return (
                            <div
                              key={key}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.08)",
                                background: "rgba(0,0,0,0.02)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  cursor: "grab",
                                  userSelect: "none",
                                }}
                                draggable
                                onDragStart={(e) => {
                                  const payload: DragTaskPayload = {
                                    kind: "task",
                                    goalId,
                                    taskId: task.id,
                                    title: task.title,
                                  };
                                  e.dataTransfer.setData("application/json", JSON.stringify(payload));
                                  e.dataTransfer.effectAllowed = "copy";
                                }}
                                title={`${goalTitle} / ${task.title}`}
                              >
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: dot,
                                    flex: "0 0 auto",
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 12,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {task.title}
                                  </div>
                                  <div className="small muted" style={{ display: "flex", gap: 6 }}>
                                    <span>{tag}</span>
                                    <span
                                      style={{
                                        opacity: 0.7,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {goalTitle}
                                    </span>
                                    {linked.length > 0 && (
                                      <span className="badge" style={{ marginLeft: 6 }}>
                                        scheduled {linked.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {linked.length > 0 && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  {linked.map((ev) => (
                                    <div
                                      key={ev.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        padding: "6px 8px",
                                        borderRadius: 10,
                                        background: "white",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                      }}
                                    >
                                      <div className="small" style={{ minWidth: 0 }}>
                                        <b style={{ marginRight: 6 }}>{ev.title}</b>
                                        <span style={{ opacity: 0.7 }}>
                                          {ev.startDate}〜{ev.endDate}
                                        </span>
                                      </div>

                                      <button
                                        onClick={() =>
                                          openNewSchedule(parseYMD(ev.startDate), ev, ev.startDate)
                                        }
                                        style={{
                                          padding: "4px 8px",
                                          borderRadius: 999,
                                          border: "1px solid rgba(0,0,0,0.12)",
                                          background: "white",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PC calendar */}
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

      {/* Schedule modal */}
      <ScheduleModal
        open={modalOpen}
        baseDate={modalBaseDate}
        initial={modalInitial}
        clickedDate={modalClickedDate ?? undefined}
        onClose={() => {
          setModalOpen(false);
          setEditingScheduleId(null);
        }}
        onSave={handleSaveSchedule}
        onDelete={handleDeleteSchedule}
        onToggleDoneForDate={handleToggleDoneForDate}
      />

      {/* history */}
      {activeTab === "history" && (
        <>
          {history.length === 0 ? (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>タスク履歴</h2>
              <div className="small muted">まだ「この日だけ完了」の履歴はありません</div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>タスク履歴</h2>
              <div className="small muted">カレンダーから「この日だけ完了」にした履歴</div>
              <ul style={{ marginTop: 8, paddingLeft: 16, maxHeight: 260, overflowY: "auto" }}>
                {history
                  .slice()
                  .reverse()
                  .slice(0, 50)
                  .map((h) => (
                    <li key={h.id} className="small">
                      <span>{h.date} </span>
                      <span>{h.title}</span>
                      <span style={{ opacity: 0.6 }}> ({new Date(h.doneAt).toLocaleString()})</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* other */}
      {activeTab === "other" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>その他</h2>
          <div className="small" style={{ marginBottom: 8 }}>
            課金状態や設定などをまとめる予定の画面です。
          </div>

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
