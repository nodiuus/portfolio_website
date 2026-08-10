import { createEffect, onCleanup, onMount } from "solid-js";
import type { ThemePalette } from "./types";

type WaveCanvas = HTMLCanvasElement & { __xmbFrames?: number };

export default function PspWave(props: { animated: boolean; palette: ThemePalette; preview?: boolean }) {
  let canvas!: WaveCanvas;

  onMount(() => {
    const drawingContext = canvas.getContext("2d", { alpha: false });
    if (!drawingContext) return;
    const context: CanvasRenderingContext2D = drawingContext;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let raf = 0;
    let fallbackTimer = 0;
    let lastDraw = 0;
    let running = false;
    let start = performance.now();
    let width = 1;
    let height = 1;
    let dpr = 1;

    const particles = Array.from({ length: 28 }, (_, index) => ({
      x: ((index * 37) % 101) / 100,
      y: ((index * 61) % 97) / 100,
      size: 0.45 + ((index * 13) % 17) / 14,
      phase: index * 0.73,
    }));

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const nextWidth = Math.round(width * dpr);
      const nextHeight = Math.round(height * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    function wavePath(time: number, baseline: number, amplitude: number, speed: number, frequency: number) {
      context.beginPath();
      context.moveTo(0, height);
      context.lineTo(0, baseline);
      for (let x = 0; x <= width + 8; x += 8) {
        const normalized = x / Math.max(1, width);
        const y =
          baseline +
          Math.sin(normalized * Math.PI * frequency + time * speed) * amplitude +
          Math.sin(normalized * Math.PI * (frequency * 0.46) - time * speed * 0.62) * amplitude * 0.36;
        context.lineTo(x, y);
      }
      context.lineTo(width, height);
      context.closePath();
    }

    function draw(stamp = performance.now()) {
      resize();
      const time = (stamp - start) / 1000;
      const palette = props.palette;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, palette.start);
      gradient.addColorStop(0.48, palette.middle);
      gradient.addColorStop(1, palette.end);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(width * 0.7, height * 0.15, 0, width * 0.7, height * 0.15, width * 0.8);
      glow.addColorStop(0, palette.glow);
      glow.addColorStop(1, "rgba(0,30,120,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      wavePath(time, height * 0.58, height * 0.035, 0.48, 2.3);
      context.fillStyle = palette.wavePrimary;
      context.fill();

      wavePath(time + 1.7, height * 0.65, height * 0.052, -0.34, 2.7);
      context.fillStyle = palette.waveSecondary;
      context.fill();

      wavePath(time + 3.4, height * 0.74, height * 0.028, 0.24, 3.4);
      context.fillStyle = palette.waveTertiary;
      context.fill();

      for (const particle of particles) {
        const pulse = 0.42 + Math.sin(time * 0.7 + particle.phase) * 0.24;
        context.fillStyle = `rgba(235,249,255,${Math.max(0.08, pulse)})`;
        context.beginPath();
        context.arc(particle.x * width, particle.y * height, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      frame += 1;
      lastDraw = performance.now();
      canvas.__xmbFrames = frame;
    }

    function tick(stamp: number) {
      draw(stamp);
      raf = requestAnimationFrame(tick);
    }

    function startAnimation() {
      if (running) return;
      running = true;
      start = performance.now();
      raf = requestAnimationFrame(tick);
      // Some embedded/headless browsers aggressively pause RAF for a canvas
      // inside a device frame. Keep a low-frequency visible-state fallback so
      // motion recovers without running a second full animation loop.
      fallbackTimer = window.setInterval(() => {
        if (running && performance.now() - lastDraw > 180) draw();
      }, 200);
    }

    function stopAnimation() {
      running = false;
      cancelAnimationFrame(raf);
      window.clearInterval(fallbackTimer);
      draw();
    }

    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);

    createEffect(() => {
      props.palette;
      if (props.animated && !reduced.matches) startAnimation();
      else stopAnimation();
      draw();
    });

    draw();
    onCleanup(() => {
      cancelAnimationFrame(raf);
      window.clearInterval(fallbackTimer);
      observer.disconnect();
    });
  });

  return (
    <canvas
      id={props.preview ? undefined : "xmb-shader"}
      class="xmb-shader"
      classList={{ "xmb-theme-preview-canvas": props.preview }}
      ref={canvas}
      aria-hidden="true"
    />
  );
}
