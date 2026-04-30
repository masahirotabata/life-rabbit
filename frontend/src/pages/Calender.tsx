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
  startDate: string;
  endDate: string;
  weekdays: boolean[];
  taskRef?: { goalId: number; taskId: number };
  startTime?: string;
  endTime?: string;
  oneShot?: boolean;
  tags?: string[];
  completedDates?: string[];
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

  return !!weekdays[date.getDay()];
}

function getEventsForDate(events: ScheduleEvent[], date: Date): ScheduleEvent[] {
  return events.filter((ev) => hasEventOnDate(ev, date));
}

function short4(s: string) {
  return Array.from(s ?? "").slice(0, 4).join("");
}

export default function Calender(props: Props) {
  const { events, onDayClick, onDropTask, onEventClick } = props;

  const [base, setBase] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [wrapW, setWrapW] = useState(0);

  const cells = useMemo(() => buildMonthGrid(base), [base]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};

    for (const d of cells) {
      const key = toYMD(d);
      map[key] = getEventsForDate(events, d);
    }

    return map;
  }, [cells, events]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateWidth = () => {
      setWrapW(el.getBoundingClientRect().width);
    };

    updateWidth();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateWidth)
        : null;

    ro?.observe(el);
    window.addEventListener("resize", updateWidth);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const isCompact = wrapW > 0 && wrapW < 520;
  const gap = isCompact ? 4 : 6;
  const weekNames = ["日", "月", "火", "水", "木", "金", "土"];

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => {
            const d = new Date(base);
            d.setMonth(d.getMonth() - 1);
            setBase(d);
          }}
        >
          ◀
        </button>

        <div
          style={{
            fontWeight: 700,
            minWidth: 110,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {monthLabel(base)}
        </div>

        <button
          type="button"
          onClick={() => {
            const d = new Date(base);
            d.setMonth(d.getMonth() + 1);
            setBase(d);
          }}
        >
          ▶
        </button>
      </div>

      <div ref={wrapperRef} style={{ width: "100%", maxWidth: "100%" }}>
        <div style={{ ...gridStyle, marginBottom: gap }}>
          {weekNames.map((w) => (
            <div
              key={w}
              style={{
                fontSize: isCompact ? 10 : 12,
                opacity: 0.7,
                textAlign: "center",
                minWidth: 0,
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div style={gridStyle}>
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
                    if (parsed?.kind === "task") {
                      onDropTask(d, parsed);
                    }
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: isCompact ? 8 : 10,
                  padding: isCompact ? 4 : 8,
                  minHeight: isCompact ? 58 : 80,
                  cursor: "pointer",
                  background: inMonth ? "white" : "rgba(0,0,0,0.03)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  minWidth: 0,
                }}
                title="クリックで追加 / タスクをドロップで追加"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
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
                          overflow: "hidden",
                          minWidth: 0,
                        }}
                        title={ev.memo ? `${ev.title}\n${ev.memo}` : ev.title}
                      >
                        {timeLabel && !isCompact && (
                          <div
                            style={{
                              fontSize: 10,
                              opacity: 0.75,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100%",
                            }}
                          >
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
                    <div
                      style={{
                        fontSize: isCompact ? 9 : 11,
                        opacity: 0.6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
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
