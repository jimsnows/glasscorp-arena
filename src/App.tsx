```tsx
import React, { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
};

export default function GlasscorpArenaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const width = 1200;
    const height = 380;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.15,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.2,
    }));

    function drawNoiseText(
      text: string,
      x: number,
      y: number,
      fontSize: number,
      fillGradient: CanvasGradient,
      glow: string,
      fadeBottom = false
    ) {
      ctx.save();

      ctx.font = `900 ${fontSize}px Bebas Neue, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.shadowBlur = 40;
      ctx.shadowColor = glow;

      ctx.fillStyle = fillGradient;
      ctx.fillText(text, x, y);

      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = fontSize * 1.1;

      ctx.globalCompositeOperation = "source-atop";

      for (let i = 0; i < 2500; i++) {
        const px = x - textWidth / 2 + Math.random() * textWidth;
        const py = y - textHeight / 2 + Math.random() * textHeight;

        const alpha = Math.random() * 0.08;

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(px, py, 2, 2);
      }

      ctx.globalCompositeOperation = "source-over";

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.strokeText(text, x, y);

      if (fadeBottom) {
        ctx.globalCompositeOperation = "destination-in";

        const mask = ctx.createLinearGradient(
          0,
          y - textHeight / 2,
          0,
          y + textHeight / 2
        );

        mask.addColorStop(0, "rgba(0,0,0,1)");
        mask.addColorStop(0.65, "rgba(0,0,0,1)");
        mask.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = mask;
        ctx.fillRect(
          x - textWidth / 2 - 20,
          y - textHeight / 2 - 20,
          textWidth + 40,
          textHeight + 40
        );

        ctx.globalCompositeOperation = "source-over";
      }

      ctx.restore();
    }

    let frame = 0;

    const render = () => {
      frame++;

      ctx.clearRect(0, 0, width, height);

      // GOLD PARTICLES
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        ctx.fillStyle = `rgba(201,146,42,${p.alpha})`;
        ctx.fill();
      });

      // GLASSCORP
      const glassGradient = ctx.createLinearGradient(0, 80, 0, 190);

      glassGradient.addColorStop(0, "#ffffff");
      glassGradient.addColorStop(0.25, "#f3f3f7");
      glassGradient.addColorStop(0.5, "#d8d8e0");
      glassGradient.addColorStop(0.8, "#c6c7d1");
      glassGradient.addColorStop(1, "#aeb0ba");

      drawNoiseText(
        "GLASSCORP",
        width / 2,
        120,
        140,
        glassGradient,
        "rgba(255,255,255,0.25)"
      );

      // ARENA BACK GLOW
      ctx.save();

      ctx.font = `900 170px Bebas Neue, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(123,47,255,0.55)";
      ctx.filter = "blur(40px)";
      ctx.fillText("ARENA", width / 2, 265);

      ctx.restore();

      // ARENA
      const arenaGradient = ctx.createLinearGradient(0, 170, 0, 340);

      arenaGradient.addColorStop(0, "#f2e9ff");
      arenaGradient.addColorStop(0.12, "#d6b7ff");
      arenaGradient.addColorStop(0.35, "#a56aff");
      arenaGradient.addColorStop(0.65, "#7b2fff");
      arenaGradient.addColorStop(1, "#5c1ec9");

      drawNoiseText(
        "ARENA",
        width / 2,
        265,
        170,
        arenaGradient,
        "rgba(123,47,255,0.45)",
        true
      );

      requestAnimationFrame(render);
    };

    render();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        background: "transparent",
      }}
    />
  );
}
```
