import { useEffect, useMemo, useState } from "react";

type Bill = {
  id: string;
  x: number;        // 0..100 (%)
  size: number;     // px
  drift: number;    // px
  rotate: number;   // deg
  duration: number; // ms
  delay: number;    // ms
  opacity: number;  // 0..1
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeBills(seed: number, count: number): Bill[] {
  const base = String(seed);
  return Array.from({ length: count }).map((_, i) => ({
    id: `${base}-${i}-${Math.random().toString(16).slice(2)}`,
    x: rand(0, 100),
    size: rand(18, 52),
    drift: rand(-160, 160),
    rotate: rand(-220, 220),
    duration: rand(1500, 2800),
    delay: rand(0, 380),
    opacity: rand(0.55, 1.0),
  }));
}

export type MoneyRainOverlayProps = {
  /** これが変わるたびに雨が発生（Date.now() を渡すのが簡単） */
  seed: number;
  /** 札の枚数（大量感） */
  count?: number;
  /** 表示を消すまでの猶予（ms） */
  hideAfterMs?: number;
  /** 表示文字（画像に差し替えるならCSSでやってもOK） */
  symbol?: string;
};

export default function MoneyRainOverlay({
  seed,
  count = 90,
  hideAfterMs = 3200,
  symbol = "💵",
}: MoneyRainOverlayProps) {
  const bills = useMemo(() => makeBills(seed, count), [seed, count]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!seed) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), hideAfterMs);
    return () => window.clearTimeout(t);
  }, [seed, hideAfterMs]);

  if (!visible) return null;

  return (
    <div className="money-rain" aria-hidden="true">
      {bills.map((b) => (
        <div
          key={b.id}
          className="money-bill"
          style={{
            left: `${b.x}%`,
            fontSize: `${b.size}px`,
            opacity: b.opacity,
            ["--drift" as any]: `${b.drift}px`,
            ["--rotate" as any]: `${b.rotate}deg`,
            ["--dur" as any]: `${b.duration}ms`,
            ["--delay" as any]: `${b.delay}ms`,
          }}
        >
          {symbol}
        </div>
      ))}
    </div>
  );
}
