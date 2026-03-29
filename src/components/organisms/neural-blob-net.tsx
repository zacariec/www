"use client";

import { useEffect, useRef } from "react";

const DEFAULT_NODE_COUNT = 150;
const CONNECTION_DISTANCE = 100;
const MAX_TILT = 0.4;
const TILT_LERP = 0.06;

interface BlobNode {
  sx: number;
  sy: number;
  sz: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  depth: number;
}

function createNodes(count: number): BlobNode[] {
  const nodes: BlobNode[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / count);
    const phi = (2 * Math.PI * i) / goldenRatio;

    nodes.push({
      sx: Math.sin(theta) * Math.cos(phi),
      sy: Math.sin(theta) * Math.sin(phi),
      sz: Math.cos(theta),
      x: 0,
      y: 0,
      radius: 2 + Math.random() * 3,
      opacity: 0,
      depth: 0,
    });
  }
  return nodes;
}

interface NeuralBlobNetProps {
  nodeCount?: number;
}

export const NeuralBlobNet = ({ nodeCount = DEFAULT_NODE_COUNT }: NeuralBlobNetProps) => {
  const resolvedCount = Math.max(40, nodeCount);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<BlobNode[]>([]);
  const frameRef = useRef(0);
  const rotationRef = useRef(0);
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (nodesRef.current.length === 0) {
      nodesRef.current = createNodes(resolvedCount);
    }

    const parent = canvas.parentElement;

    const resize = () => {
      const rect = parent?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = parent?.getBoundingClientRect();
      if (!rect) return;
      const offsetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const offsetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      tiltRef.current.targetX = -offsetY * MAX_TILT;
      tiltRef.current.targetY = offsetX * MAX_TILT;
    };

    const onMouseLeave = () => {
      tiltRef.current.targetX = 0;
      tiltRef.current.targetY = 0;
    };

    resize();
    window.addEventListener("resize", resize);
    parent?.addEventListener("mousemove", onMouseMove);
    parent?.addEventListener("mouseleave", onMouseLeave);

    const animate = () => {
      const rect = parent?.getBoundingClientRect();
      if (!rect) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const w = rect.width;
      const h = rect.height;
      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const sphereRadius = Math.min(w, h) * 0.35;

      // Lerp tilt toward target
      const tilt = tiltRef.current;
      tilt.x += (tilt.targetX - tilt.x) * TILT_LERP;
      tilt.y += (tilt.targetY - tilt.y) * TILT_LERP;

      // Slow auto-rotation + cursor tilt
      rotationRef.current += 0.002;
      const rotY = rotationRef.current + tilt.y;
      const rotX = tilt.x;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const nodes = nodesRef.current;

      // Project 3D to 2D
      for (const node of nodes) {
        const x = node.sx * cosY + node.sz * sinY;
        const y = node.sy;
        const z = -node.sx * sinY + node.sz * cosY;

        const y2 = y * cosX - z * sinX;
        const z2 = y * sinX + z * cosX;

        const perspective = 3;
        const scale = perspective / (perspective + z2);

        node.x = cx + x * sphereRadius * scale;
        node.y = cy + y2 * sphereRadius * scale;
        node.depth = z2;

        const depthFactor = (z2 + 1) / 2;
        node.radius = (1.5 + depthFactor * 4) * scale;
        node.opacity = (0.06 + depthFactor * 0.55) * scale;
      }

      // Sort by depth
      const sorted = [...nodes].sort((a, b) => a.depth - b.depth);

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const dx = sorted[i].x - sorted[j].x;
          const dy = sorted[i].y - sorted[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha =
              (1 - dist / CONNECTION_DISTANCE) *
              0.06 *
              Math.min(sorted[i].opacity, sorted[j].opacity);
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(sorted[i].x, sorted[i].y);
            ctx.lineTo(sorted[j].x, sorted[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw circle nodes
      for (const node of sorted) {
        ctx.fillStyle = `rgba(0, 0, 0, ${node.opacity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      parent?.removeEventListener("mousemove", onMouseMove);
      parent?.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};
