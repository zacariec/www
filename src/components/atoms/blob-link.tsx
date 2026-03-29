"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import { blobState, registerLogo } from "@/lib/blob-state";

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;
}

function generateBlobPath(
  cx: number,
  cy: number,
  radius: number,
  cursorAngle: number,
  proximity: number,
  seed: number,
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
    const breathing = Math.sin(seed * 0.3) * radius * 0.02;
    const wobble =
      (Math.sin(seed * 1.2 + i * 1.0) * radius * 0.02 +
        Math.cos(seed * 0.8 + i * 1.6) * radius * 0.015) *
      (0.3 + proximity * 0.7);

    const pullScale = isMerged ? 0.4 : 0;
    const r = radius + breathing + extend + wobble;
    coords.push([
      cx + blobState.pullOffsetX * pullScale + Math.cos(angle) * r,
      cy + blobState.pullOffsetY * pullScale + Math.sin(angle) * r,
    ]);
  }

  let d = `M ${coords[0][0]} ${coords[0][1]} `;
  for (let i = 0; i < points; i++) {
    const curr = coords[i];
    const next = coords[(i + 1) % points];
    const prev = coords[(i - 1 + points) % points];
    const nextNext = coords[(i + 2) % points];
    const tension = 2.0;
    d += `C ${curr[0] + (next[0] - prev[0]) / tension} ${curr[1] + (next[1] - prev[1]) / tension}, ${next[0] - (nextNext[0] - curr[0]) / tension} ${next[1] - (nextNext[1] - curr[1]) / tension}, ${next[0]} ${next[1]} `;
  }
  d += "Z";
  return d;
}

interface BlobLinkProps {
  children: React.ReactNode;
  /** Blob size in px */
  size?: number;
  /** Blob fill color */
  color?: string;
  /** Additional className on wrapper */
  className?: string;
  /** Whether to show the blob visually (false = invisible snap target) */
  visible?: boolean;
  /** Position of the blob relative to children */
  position?: "center" | "left";
}

/**
 * Wraps any element with a blob snap target.
 * The blob is positioned behind the children (absolute, centered).
 * When visible=true, renders an SVG blob. When false, still registers
 * as a snap target but is invisible.
 */
export const BlobLink = ({
  children,
  size = 8,
  color = "#000000",
  className = "",
  visible = true,
  position = "center",
}: BlobLinkProps) => {
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
        visualRadius: size / 2,
        type: "nav",
      }),
    [blobId, size],
  );

  const animate = useCallback(() => {
    seedRef.current += 0.01;

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
            generateBlobPath(
              50,
              50,
              42,
              cursorAngleRef.current,
              proximityRef.current,
              seedRef.current,
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
    <div ref={containerRef} className={`relative inline-flex items-center z-[10000] active:scale-95 transition-transform duration-75 ${className}`}>
      {visible ? (
        <svg
          ref={svgRef}
          height={size}
          viewBox="0 0 100 100"
          width={size}
          className={`absolute top-1/2 -translate-y-1/2 overflow-visible pointer-events-none ${
            position === "left" ? "-left-2 -translate-x-1/2" : "left-1/2 -translate-x-1/2"
          }`}
        >
          <path d={circlePath(50, 50, 42)} fill={color} />
        </svg>
      ) : null}
      {!visible && (
        <svg ref={svgRef} className="absolute" height={0} viewBox="0 0 100 100" width={0}>
          <path d={circlePath(50, 50, 42)} fill="transparent" />
        </svg>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
