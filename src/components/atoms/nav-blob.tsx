"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import { blobState, registerLogo } from "@/lib/blob-state";

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;
}

function generateNavBlobPath(
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  proximity: number,
  cursorAngle: number,
  isMerged: boolean,
): string {
  const points = 20;
  const angleStep = (Math.PI * 2) / points;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = angleStep * i;
    let angleDiff = angle - cursorAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const alignment = Math.exp(-(angleDiff * angleDiff) / 3.0);
    const extend = alignment * proximity * radius * 0.6;
    const wobble =
      (Math.sin(seed * 2.0 + i * 2.5) * radius * 0.03 +
        Math.cos(seed * 1.5 + i * 3.2) * radius * 0.02) *
      (0.3 + proximity * 0.7);

    const pullScale = isMerged ? 0.4 : 0;
    const pullX = blobState.pullOffsetX * pullScale;
    const pullY = blobState.pullOffsetY * pullScale;

    const r = radius + extend + wobble;
    coords.push([cx + pullX + Math.cos(angle) * r, cy + pullY + Math.sin(angle) * r]);
  }

  let d = `M ${coords[0][0]} ${coords[0][1]} `;
  for (let i = 0; i < points; i++) {
    const curr = coords[i];
    const next = coords[(i + 1) % points];
    const prev = coords[(i - 1 + points) % points];
    const nextNext = coords[(i + 2) % points];
    const tension = 1.6;
    const cp1x = curr[0] + (next[0] - prev[0]) / tension;
    const cp1y = curr[1] + (next[1] - prev[1]) / tension;
    const cp2x = next[0] - (nextNext[0] - curr[0]) / tension;
    const cp2y = next[1] - (nextNext[1] - curr[1]) / tension;
    d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next[0]} ${next[1]} `;
  }
  d += "Z";
  return d;
}

interface NavBlobProps {
  size?: number;
  color?: string;
  className?: string;
}

export const NavBlob = ({ size = 6, color = "#000000", className = "" }: NavBlobProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const proximityRef = useRef(0);
  const seedRef = useRef(Math.random() * 100);
  const cursorAngleRef = useRef(0);
  const blobId = useId();

  useEffect(
    () =>
      registerLogo({
        id: blobId,
        getRect: () => containerRef.current?.getBoundingClientRect() ?? null,
        getElement: () => containerRef.current,
        visualRadius: size / 2,
        type: "nav",
      }),
    [blobId, size],
  );

  const animate = useCallback(() => {
    seedRef.current += 0.02;

    if (svgRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = blobState.cursorX - centerX;
      const dy = blobState.cursorY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isMerged = blobState.attachedTo === blobId;
      const range = isMerged ? 150 : 80;
      const targetProximity = isMerged
        ? Math.max(0.4, Math.min(1, 1 - dist / range))
        : Math.max(0, Math.min(1, 1 - dist / range));
      proximityRef.current += (targetProximity - proximityRef.current) * 0.1;

      if (dist > 1) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - cursorAngleRef.current;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        cursorAngleRef.current += angleDiff * 0.12;
      }

      const path = svgRef.current.querySelector("path");
      if (path) {
        if (proximityRef.current < 0.005 && !isMerged) {
          path.setAttribute("d", circlePath(50, 50, 42));
        } else {
          path.setAttribute(
            "d",
            generateNavBlobPath(
              50,
              50,
              42,
              seedRef.current,
              proximityRef.current,
              cursorAngleRef.current,
              isMerged,
            ),
          );
        }
      }
    }

    frameRef.current = requestAnimationFrame(animate);
  }, [blobId]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className={`relative z-[10000] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 overflow-visible"
        height={size}
        viewBox="0 0 100 100"
        width={size}
      >
        <path d={circlePath(50, 50, 42)} fill={color} />
      </svg>
    </div>
  );
};
