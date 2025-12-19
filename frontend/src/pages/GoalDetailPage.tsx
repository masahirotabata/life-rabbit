// src/pages/GoalDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../api";
import MoneyRain from "../components/MoneyRain";

type Goal = {
  id: number;
  title: string;
  annualIncome: number;
  achieved: boolean;
  taskCount: number;
  completedTaskCount: number;
  perTaskReward: number;
  earnedAmount: number;
};

type Task = {
  id: number;
  goalId: number;
  title: string;
  completed: boolean;
};

export default function GoalDetailPage() {
  const { id } = useParams();
  const goalId = Number(id);
  const api = useApi();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  const [rain, setRain] = useState<{ show: boolean; amount: number }>({
    show: false,
    amount: 0,
  });

  const loadGoal = async () => {
    const res = await api.get(`/api/goals/${goalId}`);
    setGoal(res.data);
  };

  const loadTasks = async () => {
    // GoalController の GET /api/goals/{id}/tasks を想定
    const res = await api.get(`/api/goals/${goalId}/tasks`);
    setTasks(res.data as Task[]);
  };

  useEffect(() => {
    loadGoal();
    loadTasks();
  }, [goalId]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    await api.post(`/api/goals/${goalId}/tasks`, { title: newTask });
    setNewTask("");
    await loadGoal();
    await loadTasks();
  };

  const achieve = async () => {
    await api.post(`/api/goals/${goalId}/achieve`);
    await loadGoal();
  };

  const canAchieve = useMemo(
    () =>
      goal &&
      goal.taskCount > 0 &&
      goal.completedTaskCount === goal.taskCount,
    [goal]
  );

  // ★ 追加: タスク削除
  const deleteTask = async (taskId: number) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    // GoalController 側に DELETE /api/goals/{goalId}/tasks/{taskId} を実装して呼び出す想定
    await api.delete(`/api/goals/${goalId}/tasks/${taskId}`);
    await loadGoal();
    await loadTasks();
  };

  // （今は完了処理は次ステップで実装予定）
  const demoComplete = async () => {
    alert(
      "次のステップで「タスク完了API」を追加して、この画面からも完了できるようにします。"
    );
  };

  return (
    <div className="stack">
      <MoneyRain
        show={rain.show}
        amount={rain.amount}
        onDone={() => setRain({ show: false, amount: 0 })}
      />

      <div className="card">
        <h2>{goal?.title ?? "Loading..."}</h2>
        {goal && (
          <>
            <div className="muted">
              tasks {goal.completedTaskCount}/{goal.taskCount} ・ perTask $
              {goal.perTaskReward.toFixed(2)} ・ earned $
              {goal.earnedAmount.toFixed(2)}
            </div>
            <div className="row gap">
              <button className="btn" onClick={demoComplete}>
                Complete Task (next step)
              </button>
              <button
                className="btn primary"
                disabled={!canAchieve}
                onClick={achieve}
              >
                Achieve ✅
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3>タスク追加</h3>
        <div className="row gap">
          <input
            className="grow"
            placeholder="例：午前は過去問、午後は復習"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button className="btn primary" onClick={addTask}>
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <h3>タスク一覧</h3>
        {tasks.length === 0 ? (
          <p className="muted">タスクがありません</p>
        ) : (
          <div className="stack gap">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="row-between"
                style={{ alignItems: "center", padding: "4px 0" }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div className="small">
                    {t.completed ? (
                      <span className="badge">completed</span>
                    ) : (
                      <span className="badge">todo</span>
                    )}
                  </div>
                </div>

                <div className="row gap">
                  {/* 完了ボタンは次ステップで本実装 */}
                  {/* <button className="btn" onClick={() => completeTask(t.id)}>Complete</button> */}
                  <button
                    className="btn"
                    style={{
                      background: "#fff0f0",
                      borderColor: "#ffb3b3",
                      color: "#b00020",
                    }}
                    onClick={() => deleteTask(t.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
