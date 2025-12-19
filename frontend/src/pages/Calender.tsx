// src/pages/Calender.tsx
import React, { useMemo, useState } from "react";

export type DragTaskPayload = {
  kind: "task";
  goalId: number;
  taskId: number;
  title: string;
};

// ★ 型を拡張
export type ScheduleEvent = {
  id: string;
  title: string;
  memo?: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  weekdays: boolean[]; // [Sun..Sat] length=7
  taskRef?: { goalId: number; taskId: number };

  // 時刻（任意）
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"

  // 単発かどうか
  oneShot?: boolean;

  // タグ（有料機能用）
  tags?: string[];

  // ★ 追加: 「このスケジュールが完了した日」の一覧
  completedDates?: string[]; // ["2025-12-15", ...]
};

type Props = {
  events: ScheduleEvent[];
  onDayClick?: (date: Date) => void;
  onDropTask?: (date: Date, task: DragTaskPayload) => void;
  onEventClick?: (ev: ScheduleEvent, dateStr: string) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function ymdToNum(ymd: string) {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return y * 10000 + m * 100 + d;
}
function sameOrAfter(a: string, b: string) {
  return ymdToNum(a) >= ymdToNum(b);
}
function sameOrBefore(a: string, b: string) {
  return ymdToNum(a) <= ymdToNum(b);
}

function monthLabel(d: Date) {
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
}

function buildMonthGrid(base: Date) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const start = new Date(y, m, 1 - startDow);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

// ★ その日付にイベントがあるか判定
function hasEventOnDate(ev: ScheduleEvent, date: Date): boolean {
  const key = toYMD(date);
  const weekdays = ev.weekdays ?? [];

  const isOneShot = ev.oneShot || weekdays.length === 0;

  if (isOneShot) {
    return key === ev.startDate;
  }

  if (!sameOrAfter(key, ev.startDate)) return false;
  if (!sameOrBefore(key, ev.endDate)) return false;

  const dow = date.getDay();
  return !!weekdays[dow];
}

// ★ その日のイベント一覧
function getEventsForDate(events: ScheduleEvent[], date: Date): ScheduleEvent[] {
  return events.filter((ev) => hasEventOnDate(ev, date));
}

// 各日セルの最小幅（これを下回ると横スクロール）
const CELL_MIN_WIDTH = 120;

export default function Calender(props: Props) {
  const { events, onDayClick, onDropTask, onEventClick } = props;

  const [base, setBase] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const cells = useMemo(() => buildMonthGrid(base), [base]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    for (const d of cells) {
      const key = toYMD(d);
      map[key] = getEventsForDate(events, d);
    }
    return map;
  }, [cells, events]);

  const weekNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div>
      {/* 年月ナビゲーション */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => {
            const d = new Date(base);
            d.setMonth(d.getMonth() - 1);
            setBase(d);
          }}
        >
          ◀
        </button>
        <div style={{ fontWeight: 700 }}>{monthLabel(base)}</div>
        <button
          onClick={() => {
            const d = new Date(base);
            d.setMonth(d.getMonth() + 1);
            setBase(d);
          }}
        >
          ▶
        </button>
      </div>

      {/* カレンダー本体：横スクロール可能 */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        {/* weekday header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(7, minmax(${CELL_MIN_WIDTH}px, 1fr))`,
            gap: 6,
            marginBottom: 6,
            minWidth: CELL_MIN_WIDTH * 7,
          }}
        >
          {weekNames.map((w) => (
            <div
              key={w}
              style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(7, minmax(${CELL_MIN_WIDTH}px, 1fr))`,
            gap: 6,
            minWidth: CELL_MIN_WIDTH * 7,
          }}
        >
          {cells.map((d) => {
            const key = toYMD(d);
            const inMonth = d.getMonth() === base.getMonth();
            const list = eventsByDate[key] ?? [];

            return (
              <div
                key={key}
                onClick={() => onDayClick?.(d)}
                onDragOver={(e) => {
                  if (onDropTask) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!onDropTask) return;
                  e.preventDefault();
                  const raw = e.dataTransfer.getData("application/json");
                  if (!raw) return;
                  try {
                    const parsed = JSON.parse(raw) as DragTaskPayload;
                    if (parsed?.kind === "task") onDropTask(d, parsed);
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: 8,
                  minHeight: 80,
                  cursor: "pointer",
                  background: inMonth ? "white" : "rgba(0,0,0,0.03)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                }}
                title="クリックで追加 / タスクをドロップで追加"
              >
                {/* 日付ラベル */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      opacity: inMonth ? 1 : 0.45,
                    }}
                  >
                    {d.getDate()}
                  </div>
                </div>

                {/* イベント一覧 */}
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {list.slice(0, 3).map((ev) => {
                    const completed =
                      ev.completedDates?.includes(key) ?? false;

                    const timeLabel = ev.startTime
                      ? ev.endTime
                        ? `${ev.startTime}〜${ev.endTime}`
                        : ev.startTime
                      : "";

                    return (
                      <div
                        key={ev.id + "_" + key}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(ev, key);
                        }}
                        style={{
                          fontSize: 11,
                          padding: "4px 6px",
                          borderRadius: 8,
                          background: completed
                            ? "rgba(0,0,0,0.15)"
                            : "rgba(0,0,0,0.06)",
                          textDecoration: completed ? "line-through" : "none",
                          opacity: completed ? 0.55 : 1,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 1,
                        }}
                        title={ev.memo ? `${ev.title}\n${ev.memo}` : ev.title}
                      >
                        {/* 時刻 */}
                        {timeLabel && (
                          <div
                            style={{
                              fontSize: 10,
                              opacity: 0.75,
                              lineHeight: 1.1,
                            }}
                          >
                            {timeLabel}
                          </div>
                        )}
                        {/* タイトル（＋連携アイコン） */}
                        <div
                          style={{
                            fontWeight: 600,
                            lineHeight: 1.2,
                            wordBreak: "break-word",
                          }}
                        >
                          {ev.taskRef ? "🧩 " : ""}
                          {ev.title}
                        </div>
                      </div>
                    );
                  })}
                  {list.length > 3 && (
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      +{list.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
