import { useEffect, useRef } from "react";

type Props = {
  show: boolean;
  amount: number;
  onDone: () => void;
};

type Particle = {
  x: number;
  y: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  delay: number;
};

export default function MoneyRain({ show, amount, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!show) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -50,
      vy: 3 + Math.random() * 6,
      size: 18 + Math.random() * 18,
      rot: Math.random() * Math.PI,
      vr: (-0.08 + Math.random() * 0.16),
      delay: Math.random() * 40
    }));

    let frame = 0;
    let done = false;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // dim background
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // center text
      ctx.fillStyle = "white";
      ctx.font = "700 28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`+ $${amount.toFixed(2)}`, window.innerWidth / 2, window.innerHeight * 0.35);

      // particles
      for (const p of particles) {
        if (p.delay > 0) { p.delay -= 1; continue; }
        p.y += p.vy;
        p.rot += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = `${p.size}px system-ui`;
        ctx.fillText("💵", 0, 0);
        ctx.restore();
      }

      if (!done) {
        const alive = particles.some(p => p.y < window.innerHeight + 60);
        if (frame > 120 && !alive) {
          done = true;
          onDone();
          return;
        }
        requestAnimationFrame(draw);
      }
    };

    requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [show, amount, onDone]);

  if (!show) return null;

  return (
    <div className="overlay">
      <canvas ref={canvasRef} className="canvas" />
    </div>
  );
}
