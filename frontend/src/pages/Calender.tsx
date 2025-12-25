// src/pages/Calender.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export type DragTaskPayload = {
  kind: "task";
  goalId: number;
  taskId: number;
  title: string;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  memo?: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  weekdays: boolean[]; // [Sun..Sat] length=7
  taskRef?: { goalId: number; taskId: number };

  // optional time
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"

  // one-shot (単発)
  oneShot?: boolean;

  // tags (paid feature etc)
  tags?: string[];

  // ✅ one-day completion
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

function hasEventOnDate(ev: ScheduleEvent, date: Date): boolean {
  const key = toYMD(date);
  const weekdays = ev.weekdays ?? [];
  const isOneShot = !!ev.oneShot || weekdays.length === 0;

  if (isOneShot) return key === ev.startDate;

  if (!sameOrAfter(key, ev.startDate)) return false;
  if (!sameOrBefore(key, ev.endDate)) return false;

  const dow = date.getDay();
  return !!weekdays[dow];
}

function getEventsForDate(events: ScheduleEvent[], date: Date): ScheduleEvent[] {
  return events.filter((ev) => hasEventOnDate(ev, date));
}

// ✅ 4文字まで（絵文字も考慮して Array.from）
function short4(s: string) {
  const chars = Array.from(s ?? "");
  return chars.slice(0, 4).join("");
}

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

  // ===== Responsive sizing =====
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [wrapW, setWrapW] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // ✅ ResizeObserver が無い環境でも落ちないように保険
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            setWrapW(el.getBoundingClientRect().width);
          })
        : null;

    ro?.observe(el);
    setWrapW(el.getBoundingClientRect().width);

    const onResize = () => setWrapW(el.getBoundingClientRect().width);
    window.addEventListener("resize", onResize);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const GAP = wrapW && wrapW < 520 ? 4 : 6;

  const cellW = useMemo(() => {
    if (!wrapW) return 0;
    const inner = Math.max(0, wrapW - GAP * 6);
    const w = Math.floor(inner / 7);
    return Math.max(44, Math.min(110, w));
  }, [wrapW, GAP]);

  const isCompact = cellW > 0 && cellW < 70;
  const weekNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div>
      {/* 年月ナビ */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
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

      {/* 本体 */}
      <div ref={wrapperRef} style={{ width: "100%" }}>
        {/* 曜日ヘッダ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cellW > 0 ? `repeat(7, ${cellW}px)` : "repeat(7, 1fr)",
            gap: GAP,
            marginBottom: GAP,
            justifyContent: "space-between",
          }}
        >
          {weekNames.map((w) => (
            <div
              key={w}
              style={{
                fontSize: isCompact ? 10 : 12,
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cellW > 0 ? `repeat(7, ${cellW}px)` : "repeat(7, 1fr)",
            gap: GAP,
            justifyContent: "space-between",
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
                  padding: isCompact ? 5 : 8,
                  minHeight: isCompact ? 64 : 80,
                  cursor: "pointer",
                  background: inMonth ? "white" : "rgba(0,0,0,0.03)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden", // ✅ セルを広げない
                }}
                title="クリックで追加 / タスクをドロップで追加"
              >
                {/* 日付 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      fontSize: isCompact ? 10 : 12,
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
                    marginTop: isCompact ? 4 : 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: isCompact ? 3 : 4,
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  {list.slice(0, isCompact ? 2 : 3).map((ev) => {
                    const completed = ev.completedDates?.includes(key) ?? false;

                    const timeLabel = ev.startTime
                      ? ev.endTime
                        ? `${ev.startTime}〜${ev.endTime}`
                        : ev.startTime
                      : "";

                    const displayTitle = short4(ev.title);

                    return (
                      <div
                        key={ev.id + "_" + key}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(ev, key);
                        }}
                        style={{
                          fontSize: isCompact ? 9 : 11,
                          padding: isCompact ? "3px 4px" : "4px 6px",
                          borderRadius: 8,
                          background: completed ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)",
                          textDecoration: completed ? "line-through" : "none",
                          opacity: completed ? 0.55 : 1,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 1,
                          overflow: "hidden",
                        }}
                        title={ev.memo ? `${ev.title}\n${ev.memo}` : ev.title}
                      >
                        {timeLabel && !isCompact && (
                          <div style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                            {timeLabel}
                          </div>
                        )}

                        <div
                          style={{
                            fontWeight: 600,
                            lineHeight: 1.15,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                          }}
                        >
                          {ev.taskRef ? "🧩 " : ""}
                          {displayTitle}
                        </div>
                      </div>
                    );
                  })}

                  {list.length > (isCompact ? 2 : 3) && (
                    <div style={{ fontSize: isCompact ? 9 : 11, opacity: 0.6, whiteSpace: "nowrap" }}>
                      +{list.length - (isCompact ? 2 : 3)} more
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
