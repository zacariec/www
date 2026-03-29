"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import { blobState, registerLogo } from "@/lib/blob-state";

function generateBlobPath(
  cx: number,
  cy: number,
  radius: number,
  cursorAngle: number,
  proximity: number,
  seed: number,
  isMerged: boolean,
  mergeAmount: number,
): string {
  const points = 24;
  const angleStep = (Math.PI * 2) / points;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = angleStep * i;
    let angleDiff = angle - cursorAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const alignment = Math.exp(-(angleDiff * angleDiff) / 3.5);
    const extendMul = isMerged ? 0.7 + mergeAmount * 0.4 : 0.7;
    const extend = alignment * proximity * radius * extendMul;

    const wobble =
      proximity *
      (Math.sin(seed * 2.5 + i * 2.1) * radius * 0.04 +
        Math.cos(seed * 1.8 + i * 3.4) * radius * 0.03);

    const pulse = isMerged ? Math.sin(seed * 2) * mergeAmount * radius * 0.04 : 0;
    const r = radius + extend + wobble + pulse;
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
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

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;
}

interface BlobArrowProps {
  size?: number;
  className?: string;
  color?: string;
  arrowColor?: string;
}

export const BlobArrow = ({
  size = 20,
  className = "",
  color = "#c6c6c6",
  arrowColor = "#f9f9f7",
}: BlobArrowProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const proximityRef = useRef(0);
  const seedRef = useRef(Math.random() * 100);
  const cursorAngleRef = useRef(0);
  const arrowId = useId();

  useEffect(
    () =>
      registerLogo({
        id: arrowId,
        getRect: () => containerRef.current?.getBoundingClientRect() ?? null,
        getElement: () => containerRef.current,
        visualRadius: size / 2,
        type: "arrow",
      }),
    [arrowId, size],
  );

  const animate = useCallback(() => {
    seedRef.current += 0.025;

    if (svgRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = blobState.cursorX - centerX;
      const dy = blobState.cursorY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isMerged = blobState.attachedTo === arrowId;
      const mergeAmount = isMerged ? blobState.mergeAmount : 0;

      const range = isMerged ? 200 : 120;
      const targetProximity = isMerged
        ? Math.max(0.5, Math.min(1, 1 - dist / range))
        : Math.max(0, Math.min(1, 1 - dist / range));
      proximityRef.current += (targetProximity - proximityRef.current) * 0.1;

      if (dist > 1) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - cursorAngleRef.current;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        cursorAngleRef.current += angleDiff * 0.12;
      }

      const pullScale = isMerged ? (100 / size) * 0.5 : 0;
      const cx = 50 + blobState.pullOffsetX * pullScale;
      const cy = 50 + blobState.pullOffsetY * pullScale;

      const path = svgRef.current.querySelector("path");
      if (path) {
        if (proximityRef.current < 0.005 && !isMerged) {
          path.setAttribute("d", circlePath(cx, cy, 42));
        } else {
          path.setAttribute(
            "d",
            generateBlobPath(
              cx,
              cy,
              42,
              cursorAngleRef.current,
              proximityRef.current,
              seedRef.current,
              isMerged,
              mergeAmount,
            ),
          );
        }
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrowId]);

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
      {/* Arrow icon */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        fill="none"
        height={size * 0.5}
        stroke={arrowColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        width={size * 0.5}
      >
        <line x1="7" x2="17" y1="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </div>
  );
};
