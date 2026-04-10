"use client";

import { useCallback, useEffect, useRef } from "react";

const ENTER_DURATION = 200;
const LEAVE_DURATION = 500;

type Phase = "idle" | "entering" | "covering" | "leaving";

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export const PageLoadingTransition = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const startTimeRef = useRef(0);
  const frameRef = useRef(0);

  const render = useCallback((fadeAmount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Solid page background
    ctx.fillStyle = `rgba(249, 249, 247, ${fadeAmount})`;
    ctx.fillRect(0, 0, w, h);

    // Subtle vignette
    if (fadeAmount > 0.3) {
      const maxDim = Math.hypot(cx, cy);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
      const vignetteAlpha = (fadeAmount - 0.3) * 0.06;
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.7, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteAlpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

  }, []);

  // Animate enter: transparent → fully opaque. Returns promise when done.
  const animateEnter = useCallback((): Promise<void> => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.display = "block";
    phaseRef.current = "entering";
    startTimeRef.current = performance.now();
    return new Promise<void>((resolve) => {
      const tick = () => {
        const progress = Math.min((performance.now() - startTimeRef.current) / ENTER_DURATION, 1);
        render(easeInOut(progress));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          phaseRef.current = "covering";
          resolve();
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    });
  }, [render]);

  // Keep rendering at full opacity while waiting (blob keeps animating)
  const holdLoop = useCallback(() => {
    if (phaseRef.current !== "covering") return;
    render(1);
    frameRef.current = requestAnimationFrame(holdLoop);
  }, [render]);

  // Animate leave: fully opaque → transparent
  const animateLeave = useCallback(() => {
    phaseRef.current = "leaving";
    startTimeRef.current = performance.now();

    const tick = () => {
      const progress = Math.min((performance.now() - startTimeRef.current) / LEAVE_DURATION, 1);
      render(1 - easeInOut(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        phaseRef.current = "idle";
        const canvas = canvasRef.current;
        if (canvas) canvas.style.display = "none";
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [render]);

  useEffect(() => {
    const onBeforePrep = (e: Event) => {
      const event = e as Event & { loader: () => Promise<void> };
      const originalLoader = event.loader;

      event.loader = async () => {
        // 1. Fade in the cover
        await animateEnter();
        // 2. Start hold loop (blob keeps animating)
        frameRef.current = requestAnimationFrame(holdLoop);
        // 3. Let Astro fetch + swap the DOM (hidden behind our canvas)
        await originalLoader();
      };
    };

    const onAfterSwap = () => {
      // Give React islands time to mount, then reveal
      setTimeout(() => {
        cancelAnimationFrame(frameRef.current);
        animateLeave();
      }, 200);
    };

    document.addEventListener("astro:before-preparation", onBeforePrep);
    document.addEventListener("astro:after-swap", onAfterSwap);

    return () => {
      document.removeEventListener("astro:before-preparation", onBeforePrep);
      document.removeEventListener("astro:after-swap", onAfterSwap);
      cancelAnimationFrame(frameRef.current);
    };
  }, [animateEnter, holdLoop, animateLeave]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{ display: "none" }}
    />
  );
};
