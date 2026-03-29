"use client";

import { useCallback, useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

const ENTER_DURATION = 300;
const HOLD_DURATION = 200;
const LEAVE_DURATION = 400;

type Phase = "idle" | "entering" | "holding" | "leaving";

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export const PageTransition = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const phaseRef = useRef<Phase>("idle");
  const startTimeRef = useRef(0);
  const frameRef = useRef(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const phase = phaseRef.current;

    if (phase === "idle") {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";
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

    let fadeAmount = 0;

    if (phase === "entering") {
      const progress = Math.min(elapsed / ENTER_DURATION, 1);
      fadeAmount = easeInOut(progress);
      if (progress >= 1) {
        phaseRef.current = "holding";
        startTimeRef.current = now;
      }
    } else if (phase === "holding") {
      fadeAmount = 1;
      if (elapsed >= HOLD_DURATION) {
        phaseRef.current = "leaving";
        startTimeRef.current = now;
      }
    } else if (phase === "leaving") {
      const progress = Math.min(elapsed / LEAVE_DURATION, 1);
      fadeAmount = 1 - easeInOut(progress);
      if (progress >= 1) {
        phaseRef.current = "idle";
        canvas.style.display = "none";
        return;
      }
    }

    ctx.clearRect(0, 0, w, h);

    // White vignette — radial gradient from transparent center to page bg at edges
    const maxDim = Math.hypot(cx, cy);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
    gradient.addColorStop(0, `rgba(249, 249, 247, 0)`);
    gradient.addColorStop(0.3, `rgba(249, 249, 247, ${fadeAmount * 0.3})`);
    gradient.addColorStop(0.6, `rgba(249, 249, 247, ${fadeAmount * 0.7})`);
    gradient.addColorStop(1, `rgba(249, 249, 247, ${fadeAmount})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      phaseRef.current = "entering";
      startTimeRef.current = performance.now();
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [pathname, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{ display: "none" }}
    />
  );
};
