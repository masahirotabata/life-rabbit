// src/components/ScheduleModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { ScheduleEvent } from "../pages/Calender";

type Props = {
  open: boolean;
  baseDate: Date;
  initial: Partial<ScheduleEvent> | null;
  // ★ 追加: カレンダーでクリックした日（"YYYY-MM-DD"）
  clickedDate?: string;
  onClose: () => void;
  onSave: (data: Omit<ScheduleEvent, "id">, editingId?: string) => void;
  onDelete: (id: string) => void;
  // ★ 追加: 「この日だけ完了」トグル
  onToggleDoneForDate?: (scheduleId: string, dateStr: string, done: boolean) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

// タグ機能の解放フラグ（あとで課金ステータスと連動させる想定）
const TAG_FEATURE_UNLOCKED = false;

export default function ScheduleModal(props: Props) {
  const {
    open,
    baseDate,
    initial,
    clickedDate,
    onClose,
    onSave,
    onDelete,
    onToggleDoneForDate,
  } = props;

  const editingId = (initial as any)?.id as string | undefined;

  const defaultStart = useMemo(() => toYMD(baseDate), [baseDate]);
  const defaultEnd = useMemo(() => toYMD(addMonths(baseDate, 1)), [baseDate]);

  // base曜日だけON（または初期値）
  const defaultWeekdays = useMemo(() => {
    if (initial?.weekdays && initial.weekdays.length === 7)
      return initial.weekdays.slice();
    const arr = Array(7).fill(false) as boolean[];
    arr[baseDate.getDay()] = true;
    return arr;
  }, [baseDate, initial]);

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [weekdays, setWeekdays] = useState<boolean[]>(defaultWeekdays);
  const [taskRef, setTaskRef] =
    useState<ScheduleEvent["taskRef"] | undefined>(undefined);

  // 開始/終了時刻
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // タグ入力
  const [tagsInput, setTagsInput] = useState<string>("");

  // ★ 「この日だけ完了」チェック状態
  const [doneForThisDate, setDoneForThisDate] = useState(false);

  // 今回対象としている日付文字列
  const currentDateStr = clickedDate ?? toYMD(baseDate);

  useEffect(() => {
    if (!open) return;

    setTitle(initial?.title ?? "");
    setMemo(initial?.memo ?? "");
    setStartDate(initial?.startDate ?? defaultStart);
    setEndDate(initial?.endDate ?? defaultEnd);
    setWeekdays(defaultWeekdays);
    setTaskRef(initial?.taskRef);

    const initialStart =
      ((initial as any)?.startTime as string | undefined) ||
      ((initial as any)?.time as string | undefined) ||
      "";
    const initialEnd =
      ((initial as any)?.endTime as string | undefined) || "";

    setStartTime(initialStart);
    setEndTime(initialEnd);

    const tags = (initial?.tags ?? []).join(", ");
    setTagsInput(tags);

    // ★ completedDates に含まれていればチェックON
    const completedDates =
      ((initial as any)?.completedDates as string[] | undefined) ?? [];
    setDoneForThisDate(
      !!currentDateStr && completedDates.includes(currentDateStr)
    );
  }, [
    open,
    initial,
    defaultStart,
    defaultEnd,
    defaultWeekdays,
    currentDateStr,
  ]);

  if (!open) return null;

  const weekNames = ["日", "月", "火", "水", "木", "金", "土"];
  const isEveryday = weekdays.every(Boolean);

  function toggleDow(i: number) {
    const next = weekdays.slice();
    next[i] = !next[i];
    setWeekdays(next);
  }

  function setEveryday(on: boolean) {
    setWeekdays(Array(7).fill(on) as boolean[]);
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert("タスク名を入力してください");
      return;
    }
    if (endDate < startDate) {
      alert("終了日は開始日以降にしてください");
      return;
    }

    const selectedWeekdays = weekdays
      .map((checked, idx) => (checked ? idx : null))
      .filter((v): v is number => v !== null);

    const isOneShot = !isEveryday && selectedWeekdays.length === 0;

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: Partial<ScheduleEvent> = {
      title: trimmedTitle,
      memo: memo ?? "",
      startDate,
      endDate,
      weekdays: isOneShot ? [] : weekdays,
      taskRef,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      oneShot: isOneShot,
    };

    if (TAG_FEATURE_UNLOCKED && parsedTags.length > 0) {
      payload.tags = parsedTags;
    }

    onSave(payload as Omit<ScheduleEvent, "id">, editingId);
  }

  // ★ 「この日だけ完了」チェック変更
  function handleToggleDone(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setDoneForThisDate(checked);

    if (!editingId || !currentDateStr) return;
    if (!onToggleDoneForDate) return;

    onToggleDoneForDate(editingId, currentDateStr, checked);
  }

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          maxHeight: "90vh",
          background: "white",
          borderRadius: 14,
          padding: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 6,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            {editingId ? "スケジュール編集" : "スケジュール追加"}
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ★ 今回操作する日 & この日だけ完了 */}
        {editingId && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.03)",
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              今回操作する日: <b>{currentDateStr.replace(/-/g, "/")}</b>
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={doneForThisDate}
                onChange={handleToggleDone}
              />
              <span>この日だけ完了</span>
            </label>
          </div>
        )}

        {/* 本文（スクロール） */}
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gap: 10,
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {/* タイトル */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              タスク名
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：セキスペ勉強 / 腕立て / 仕入れ作業"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
            {taskRef && (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                連携タスク: goalId={taskRef.goalId}, taskId={taskRef.taskId}
              </div>
            )}
          </div>

          {/* 曜日 */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              曜日（毎日もOK）
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <label
                style={{ display: "flex", gap: 6, alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={isEveryday}
                  onChange={(e) => setEveryday(e.target.checked)}
                />
                毎日
              </label>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {weekNames.map((w, i) => (
                  <label
                    key={w}
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      background: weekdays[i]
                        ? "rgba(0,0,0,0.06)"
                        : "transparent",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={weekdays[i]}
                      onChange={() => toggleDow(i)}
                    />
                    {w}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 日付 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                開始日
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                終了日（デフォ：1ヶ月後）
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          </div>

          {/* 時刻 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                開始時刻（任意）
              </div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                終了時刻（任意）
              </div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          </div>

          {/* タグ（課金で解放予定） */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              タグ（任意）
            </div>
            {TAG_FEATURE_UNLOCKED ? (
              <>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="例：家事, 副業, 勉強"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />
                <div
                  style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}
                >
                  カンマ区切りで複数タグを追加できます
                </div>
              </>
            ) : (
              <>
                <input
                  value=""
                  disabled
                  placeholder="タグ機能は課金で解放予定です"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    color: "#aaa",
                  }}
                />
                <div
                  style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}
                >
                  ※ 有料プラン連携後にタグ編集が可能になります
                </div>
              </>
            )}
          </div>

          {/* メモ */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              メモ
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモ（任意）"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <div>
            {editingId && (
              <button
                onClick={() => onDelete(editingId)}
                style={{
                  background: "transparent",
                  border: "1px solid #f0b3b3",
                  color: "#b00020",
                  padding: "10px 12px",
                  borderRadius: 10,
                }}
              >
                削除
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #ddd",
                padding: "10px 12px",
                borderRadius: 10,
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              style={{
                background: "black",
                color: "white",
                border: "none",
                padding: "10px 12px",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
