"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import { blobState, registerLogo } from "@/lib/blob-state";

function generateLogoBlobPath(
  cx: number,
  cy: number,
  radius: number,
  cursorAngle: number,
  proximity: number,
  seed: number,
  isMerged: boolean,
  mergeAmount: number,
): string {
  const points = 48;
  const angleStep = (Math.PI * 2) / points;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = angleStep * i;
    let angleDiff = angle - cursorAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Very wide gaussian — fully smooth falloff, no sharp edges
    const alignment = Math.exp(-(angleDiff * angleDiff) / 4.0);

    // Extension toward cursor
    const extendMultiplier = isMerged ? 0.85 + mergeAmount * 0.6 : 0.85;
    const extend = alignment * proximity * radius * extendMultiplier;

    // Gentle organic wobble
    const wobbleScale = isMerged ? 1 + mergeAmount * 0.5 : 1;
    const breathing = Math.sin(seed * 0.3) * radius * 0.02;
    const wobble =
      proximity *
      wobbleScale *
      (Math.sin(seed * 1.2 + i * 1.0) * radius * 0.03 +
        Math.cos(seed * 0.8 + i * 1.6) * radius * 0.02);

    // Subtle merge pulse
    const mergePulse = isMerged ? Math.sin(seed * 2) * mergeAmount * radius * 0.05 : 0;

    const r = radius + breathing + extend + wobble + mergePulse;
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  let d = `M ${coords[0][0]} ${coords[0][1]} `;
  for (let i = 0; i < points; i++) {
    const curr = coords[i];
    const next = coords[(i + 1) % points];
    const prev = coords[(i - 1 + points) % points];
    const nextNext = coords[(i + 2) % points];

    // Very low tension = extremely round, smooth curves
    const tension = 1.5;
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

interface BlobLogoProps {
  size?: number;
  textSize?: string;
  className?: string;
  darkMode?: boolean;
}

export const BlobLogo = ({
  size = 32,
  textSize = "10px",
  className = "",
  darkMode = false,
}: BlobLogoProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const proximityRef = useRef(0);
  const seedRef = useRef(Math.random() * 100);
  const cursorAngleRef = useRef(0);
  const logoId = useId();

  // Register this logo so the cursor can find it
  useEffect(
    () =>
      registerLogo({
        id: logoId,
        getRect: () => containerRef.current?.getBoundingClientRect() ?? null,
        visualRadius: size / 2,
        type: "logo",
      }),
    [logoId],
  );

  const animate = useCallback(() => {
    seedRef.current += 0.008;

    if (svgRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Use the shared cursor position
      const dx = blobState.cursorX - centerX;
      const dy = blobState.cursorY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isMerged = blobState.attachedTo === logoId;
      const mergeAmount = isMerged ? blobState.mergeAmount : 0;

      // Proximity — more sensitive range
      const range = isMerged ? 250 : 180;
      const targetProximity = isMerged
        ? Math.max(0.6, Math.min(1, 1 - dist / range))
        : Math.max(0, Math.min(1, 1 - dist / range));
      const lerpSpeed = isMerged ? 0.15 : 0.1;
      proximityRef.current += (targetProximity - proximityRef.current) * lerpSpeed;

      // Angle toward cursor
      if (dist > 1) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - cursorAngleRef.current;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        cursorAngleRef.current += angleDiff * 0.15;
      }

      // Pull offset shifts the blob center when attached (scaled to viewBox)
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
            generateLogoBlobPath(
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
  }, [logoId]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  const fill = darkMode ? "#3b3b3b" : "#000000";
  const textColor = darkMode ? "#777777" : "#f9f9f7";

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 overflow-visible"
        height={size}
        viewBox="0 0 100 100"
        width={size}
      >
        <path d={circlePath(50, 50, 42)} fill={fill} />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          color: textColor,
          fontSize: textSize,
          letterSpacing: "1px",
          fontWeight: 700,
          fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
        }}
      >
        ZC
      </span>
    </div>
  );
};
