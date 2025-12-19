// src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  listGoals,
  createGoal,
  listTasks,
  GoalListItem,
  TaskItem,
} from "../lib/api";

// カレンダーと同じドラッグペイロード型
import { DragTaskPayload } from "./Calender";

export default function HomePage() {
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [annualIncome, setAnnualIncome] = useState("6000000");
  const [title, setTitle] = useState("");

  // goalId ごとのタスク
  const [tasksByGoal, setTasksByGoal] = useState<Record<number, TaskItem[]>>(
    {}
  );

  // Goal & Task をまとめてロード
  const loadAll = async () => {
    const g = await listGoals();
    setGoals(g);

    const map: Record<number, TaskItem[]> = {};
    for (const goal of g) {
      try {
        const ts = await listTasks(goal.id);
        map[goal.id] = ts;
      } catch {
        map[goal.id] = [];
      }
    }
    setTasksByGoal(map);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const create = async () => {
    if (!title.trim()) return;
    await createGoal(title.trim(), Number(annualIncome));
    setTitle("");
    await loadAll();
  };

  const total = goals.reduce(
    (s, g) => s + (g.earnedAmount ?? 0),
    0
  );

  // ★ 左カラム用：全 Goal の「未完了タスク」をフラットにしたリスト
  const dragTaskList = useMemo(
    () => {
      const items: { goalId: number; goalTitle: string; task: TaskItem }[] = [];
      for (const g of goals) {
        const ts = tasksByGoal[g.id] ?? [];
        ts.filter((t) => !t.completed).forEach((t) => {
          items.push({ goalId: g.id, goalTitle: g.title, task: t });
        });
      }
      return items;
    },
    [goals, tasksByGoal]
  );

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ★ 左：ドラッグ専用タスクリスト */}
        <div
          style={{
            flex: "0 0 260px",
            maxHeight: 520,
            overflowY: "auto",
          }}
        >
          <div className="card">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>タスクリスト</h2>
              <div className="small muted">{dragTaskList.length}件</div>
            </div>
            <div className="small muted" style={{ marginBottom: 6 }}>
              カレンダーのある画面にドラッグ＆ドロップしてスケジュール登録
            </div>

            {dragTaskList.length === 0 ? (
              <div className="small muted">未完了タスクはありません</div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
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
        </div>

        {/* ★ 右：従来の HomePage コンテンツ */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="stack">
            <div className="card">
              <div className="row">
                <div>
                  <div className="muted">総潜在貯金（完了分）</div>
                  <div className="big">${total.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>目標を追加</h2>
              <div className="grid2">
                <input
                  placeholder="例：セキスペ合格"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  placeholder="想定年収"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                />
              </div>
              <button className="btn primary" onClick={create}>
                Add Goal
              </button>
            </div>

            <div className="card">
              <h2>目標一覧</h2>
              <div className="list">
                {goals.map((g) => (
                  <Link key={g.id} to={`/goals/${g.id}`} className="item">
                    <div className="itemMain">
                      <div className="itemTitle">
                        {g.title} {g.achieved ? "✅" : ""}
                      </div>
                      <div className="muted">
                        tasks {g.completedTaskCount}/{g.taskCount} ・ perTask $
                        {g.perTaskReward.toFixed(2)} ・ earned $
                        {g.earnedAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="pill">
                      ${g.annualIncome.toFixed(0)}/y
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
