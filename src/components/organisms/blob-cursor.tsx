"use client";

import { useEffect, useRef, useState } from "react";

import { blobState } from "@/lib/blob-state";

const SNAP_DISTANCE = 120;
const DETACH_VELOCITY = 6;
const BASE_RADIUS = 7;
const BLOB_POINTS = 16;
const CANVAS_SIZE = 120;

export const BlobCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const seedRef = useRef(0);
  const prevMouseRef = useRef({ x: -100, y: -100 });
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!hasFinePointer) {
      setIsTouch(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const onMove = (e: MouseEvent) => {
      blobState.mouseX = e.clientX;
      blobState.mouseY = e.clientY;
    };

    const animate = () => {
      // Velocity tracking
      blobState.velocityX = blobState.mouseX - prevMouseRef.current.x;
      blobState.velocityY = blobState.mouseY - prevMouseRef.current.y;
      prevMouseRef.current.x = blobState.mouseX;
      prevMouseRef.current.y = blobState.mouseY;

      const velocity = Math.sqrt(
        blobState.velocityX * blobState.velocityX + blobState.velocityY * blobState.velocityY,
      );

      // Find nearest logo/arrow
      let nearestLogo: {
        id: string;
        cx: number;
        cy: number;
        dist: number;
        visualRadius: number;
        type: "logo" | "arrow" | "nav";
      } | null = null;
      for (const logo of blobState.logos) {
        const rect = logo.getRect();
        if (!rect) continue;
        const lcx = rect.left + rect.width / 2;
        const lcy = rect.top + rect.height / 2;
        const dx = blobState.mouseX - lcx;
        const dy = blobState.mouseY - lcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!nearestLogo || dist < nearestLogo.dist) {
          nearestLogo = {
            id: logo.id,
            cx: lcx,
            cy: lcy,
            dist,
            visualRadius: logo.visualRadius,
            type: logo.type,
          };
        }
      }

      // Attachment logic
      const MAX_PULL = 10;
      if (blobState.attachedTo) {
        // Hop to a closer target if one is within snap distance
        if (
          nearestLogo &&
          nearestLogo.id !== blobState.attachedTo &&
          nearestLogo.dist < SNAP_DISTANCE
        ) {
          blobState.attachedTo = nearestLogo.id;
          blobState.targetRadius = nearestLogo.visualRadius;
          blobState.targetType = nearestLogo.type;
          blobState.pullOffsetX = 0;
          blobState.pullOffsetY = 0;
        } else if (velocity > DETACH_VELOCITY) {
          blobState.attachedTo = null;
          blobState.pullOffsetX = 0;
          blobState.pullOffsetY = 0;
        } else if (nearestLogo?.id === blobState.attachedTo) {
          blobState.mergeAmount += (1 - blobState.mergeAmount) * 0.1;
          blobState.targetRadius = nearestLogo.visualRadius;
          blobState.targetType = nearestLogo.type;
          blobState.cursorX += (nearestLogo.cx - blobState.cursorX) * 0.2;
          blobState.cursorY += (nearestLogo.cy - blobState.cursorY) * 0.2;

          // Pull offset — blob leans toward where mouse is pulling
          const pullDx = blobState.mouseX - nearestLogo.cx;
          const pullDy = blobState.mouseY - nearestLogo.cy;
          const pullDist = Math.sqrt(pullDx * pullDx + pullDy * pullDy);
          const clampedPull = Math.min(pullDist, MAX_PULL * 3) / 3;
          if (pullDist > 0.1) {
            const targetPullX = (pullDx / pullDist) * clampedPull;
            const targetPullY = (pullDy / pullDist) * clampedPull;
            blobState.pullOffsetX += (targetPullX - blobState.pullOffsetX) * 0.15;
            blobState.pullOffsetY += (targetPullY - blobState.pullOffsetY) * 0.15;
          }
        } else {
          blobState.attachedTo = null;
          blobState.pullOffsetX = 0;
          blobState.pullOffsetY = 0;
        }
      } else {
        if (nearestLogo && nearestLogo.dist < SNAP_DISTANCE) {
          blobState.attachedTo = nearestLogo.id;
          blobState.targetRadius = nearestLogo.visualRadius;
          blobState.targetType = nearestLogo.type;
        }
        blobState.mergeAmount *= 0.85;
        if (blobState.mergeAmount < 0.01) blobState.mergeAmount = 0;
        blobState.pullOffsetX *= 0.8;
        blobState.pullOffsetY *= 0.8;
      }

      // Smooth cursor position when free
      if (!blobState.attachedTo) {
        const lerp = 0.18;
        blobState.cursorX += (blobState.mouseX - blobState.cursorX) * lerp;
        blobState.cursorY += (blobState.mouseY - blobState.cursorY) * lerp;
      }

      seedRef.current += 0.015;

      // Refine footer detection — only if footer is visible AND cursor is over it
      if (blobState.inFooter) {
        const footer = document.querySelector("footer");
        if (footer) {
          const fRect = footer.getBoundingClientRect();
          blobState.inFooter = blobState.mouseY >= fRect.top;
        }
      }

      // Position canvas (apply pull offset so cursor visually shifts)
      const half = CANVAS_SIZE / 2;
      const drawX = blobState.cursorX + blobState.pullOffsetX;
      const drawY = blobState.cursorY + blobState.pullOffsetY;
      canvas.style.transform = `translate(${drawX - half}px, ${drawY - half}px)`;

      // Draw
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.save();
      ctx.translate(half, half);

      const seed = seedRef.current;
      const merge = blobState.mergeAmount;

      // Cursor radius shrinks toward target as it merges
      const targetR = blobState.targetRadius * 0.8;
      const blobR = BASE_RADIUS * (1 - merge) + targetR * merge;

      // Noise decreases as cursor merges (becomes cleaner circle)
      const noiseMul = 1 - merge * 0.9;

      // Opacity fades as cursor merges into target
      // For nav targets, fade completely so the nav blob becomes the cursor
      const isNavTarget = blobState.targetType === "nav";
      const opacity = isNavTarget ? 0.92 * (1 - merge) : 0.92 * (1 - merge * 0.85);

      // Tendril direction toward nearest logo
      let tendrilAngle = 0;
      let tendrilStrength = 0;
      if (nearestLogo && nearestLogo.dist < 150 && !blobState.attachedTo) {
        tendrilAngle = Math.atan2(
          nearestLogo.cy - blobState.cursorY,
          nearestLogo.cx - blobState.cursorX,
        );
        tendrilStrength = Math.max(0, 1 - nearestLogo.dist / 150);
      }

      // Generate blob shape
      const outerPoints: [number, number][] = [];
      for (let i = 0; i < BLOB_POINTS; i++) {
        const angle = (Math.PI * 2 * i) / BLOB_POINTS;

        const breathing = Math.sin(seed * 0.3) * blobR * 0.03;
        const n1 = Math.sin(seed * 1.3 + i * 1.2) * blobR * 0.06 * noiseMul;
        const n2 = Math.cos(seed * 0.9 + i * 1.8) * blobR * 0.04 * noiseMul;
        const n3 = Math.sin(seed * 2.1 + i * 0.7) * blobR * 0.02 * noiseMul;

        let tendril = 0;
        if (tendrilStrength > 0) {
          let ad = angle - tendrilAngle;
          while (ad > Math.PI) ad -= Math.PI * 2;
          while (ad < -Math.PI) ad += Math.PI * 2;
          tendril = Math.exp(-(ad * ad) / 3.5) * tendrilStrength * blobR * 1.2;
        }

        const r = blobR + breathing + n1 + n2 + n3 + tendril;
        outerPoints.push([Math.cos(angle) * r, Math.sin(angle) * r]);
      }

      // Draw blob
      const rgb = blobState.inFooter ? "119, 119, 119" : "0, 0, 0";
      ctx.fillStyle = `rgba(${rgb}, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(outerPoints[0][0], outerPoints[0][1]);
      for (let i = 0; i < BLOB_POINTS; i++) {
        const curr = outerPoints[i];
        const next = outerPoints[(i + 1) % BLOB_POINTS];
        const prev = outerPoints[(i - 1 + BLOB_POINTS) % BLOB_POINTS];
        const nextNext = outerPoints[(i + 2) % BLOB_POINTS];

        const tension = 2.2;
        const cp1x = curr[0] + (next[0] - prev[0]) / tension;
        const cp1y = curr[1] + (next[1] - prev[1]) / tension;
        const cp2x = next[0] - (nextNext[0] - curr[0]) / tension;
        const cp2y = next[1] - (nextNext[1] - curr[1]) / tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next[0], next[1]);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      frameRef.current = requestAnimationFrame(animate);
    };

    const onClick = () => {
      if (blobState.attachedTo) {
        const target = blobState.logos.find((l) => l.id === blobState.attachedTo);
        if (target) {
          const el = target.getElement();
          const clickable = el?.querySelector("a, button") as HTMLElement | null;
          if (clickable) clickable.click();
        }
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    frameRef.current = requestAnimationFrame(animate);
    document.documentElement.classList.add("blob-cursor-active");

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      cancelAnimationFrame(frameRef.current);
      document.documentElement.classList.remove("blob-cursor-active");
    };
  }, []);

  if (isTouch) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 z-[9999] pointer-events-none"
      height={CANVAS_SIZE}
      width={CANVAS_SIZE}
    />
  );
};
