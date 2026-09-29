/* eslint @typescript-eslint/promise-function-async: "off" -- Cover and reveal return shared in-flight promises. */
export type WipeMode = "radial" | "down" | "up" | "dissolve" | "off";

export interface WipeOptions {
  mode?: WipeMode;
  x?: number;
  y?: number;
  edge?: string;
  label?: string;
  action?: () => void | Promise<void>;
}

interface ActiveWipe {
  generation: number;
  covered: Promise<void>;
  fastCover: () => void;
  reveal: () => Promise<void>;
  dispose: () => void;
}

const B8 = new Float64Array([
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7,
  39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
]);
for (let i = 0; i < B8.length; i++) B8[i] = (B8[i] + 0.5) / 64;

let active: ActiveWipe | undefined;
let reducedMotion: MediaQueryList | undefined;

function hash(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function skip(mode: WipeMode): boolean {
  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    mode === "off" ||
    document.documentElement.dataset.prefMotion === "still"
  )
    return true;
  reducedMotion ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotion.matches;
}

function createWipe(opts: WipeOptions, mode: Exclude<WipeMode, "off">): ActiveWipe | undefined {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx = context;
  const label = document.createElement("div");
  canvas.setAttribute("aria-hidden", "true");
  label.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "2147483000",
    pointerEvents: "auto",
    imageRendering: "pixelated",
    touchAction: "none",
  });
  Object.assign(label.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    zIndex: "2147483001",
    pointerEvents: "none",
    font: "500 12px 'IBM Plex Mono',monospace",
    color: "#EEEAE3",
    background: "#1E1E1E",
    padding: "6px 10px",
    opacity: "0",
    transition: "opacity .18s ease",
    whiteSpace: "nowrap",
  });
  label.textContent = opts.label ?? (mode === "up" ? "cd ↑" : "");

  let color = (opts.edge ?? "#F386A1").trim();
  if (color.length === 4)
    color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  const edge = new Uint8Array([
    parseInt(color.slice(1, 3), 16) || 0,
    parseInt(color.slice(3, 5), 16) || 0,
    parseInt(color.slice(5, 7), 16) || 0,
  ]);
  const softness = mode === "dissolve" ? 0.55 : 0.32;
  const coverDuration = mode === "up" ? 380 : 440;
  const holdDuration = mode === "up" ? 90 : 140;
  const revealDuration = mode === "up" ? 460 : 520;
  let width = 0;
  let height = 0;
  let image: ImageData;
  let field: Float32Array;
  let phase: "cover" | "hold" | "reveal" = "cover";
  let progress = 0;
  let started = performance.now();
  let heldAt = 0;
  let frame = 0;
  let timer: number | undefined;
  let disposed = false;
  let resolveCovered!: () => void;
  const covered = new Promise<void>((resolve) => {
    resolveCovered = resolve;
  });
  let revealed: Promise<void> | undefined;
  let resolveRevealed: (() => void) | undefined;
  let state: ActiveWipe;

  function draw(p: number, reverse: boolean): void {
    progress = p;
    const { data } = image;
    for (let i = 0, n = width * height; i < n; i++) {
      const x = i % width;
      const y = (i / width) | 0;
      const threshold = B8[(y & 7) * 8 + (x & 7)];
      let t = (p * (1 + softness) - field[i]) / softness;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      const on = reverse ? t <= threshold : t > threshold;
      const tinted = reverse ? t > 0.3 : t < 0.6;
      const k = i * 4;
      if (on) {
        data[k] = tinted ? edge[0] : 30;
        data[k + 1] = tinted ? edge[1] : 30;
        data[k + 2] = tinted ? edge[2] : 30;
        data[k + 3] = 255;
      } else {
        data[k + 3] = 0;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  function resize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(1, Math.ceil(vw / 6));
    const h = Math.max(1, Math.ceil(vh / 6));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    image = ctx.createImageData(w, h);
    field = new Float32Array(w * h);
    const cx = (opts.x ?? vw / 2) / 6;
    const cy = (opts.y ?? vh / 2) / 6;
    const maxDistance =
      Math.max(
        Math.hypot(cx, cy),
        Math.hypot(w - cx, cy),
        Math.hypot(cx, h - cy),
        Math.hypot(w - cx, h - cy),
      ) || 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let value: number;
        if (mode === "radial") value = Math.hypot(x - cx, y - cy) / maxDistance;
        else if (mode === "up") value = 1 - y / Math.max(1, h - 1);
        else if (mode === "down") value = y / Math.max(1, h - 1);
        else value = hash(x >> 1, y >> 1) * 0.8 + (y / Math.max(1, h - 1)) * 0.2;
        field[y * w + x] = value;
      }
    }
    // Resizing clears the bitmap; repaint synchronously before the browser can expose it.
    draw(phase === "hold" ? 1 : progress, phase === "reveal");
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    window.removeEventListener("resize", resize);
    canvas.remove();
    label.remove();
    if (active === state) active = undefined;
    resolveCovered();
    resolveRevealed?.();
  }

  function beginReveal(): void {
    timer = undefined;
    if (disposed) return;
    if (skip(mode)) {
      dispose();
      return;
    }
    phase = "reveal";
    started = performance.now();
    progress = 0;
    label.style.opacity = "0";
    frame = requestAnimationFrame(step);
  }

  function scheduleReveal(): void {
    const remaining = holdDuration - (performance.now() - heldAt);
    if (remaining > 0) timer = window.setTimeout(beginReveal, Math.ceil(remaining));
    else beginReveal();
  }

  function enterHold(now: number): void {
    phase = "hold";
    heldAt = now;
    if (label.textContent) label.style.opacity = "1";
    resolveCovered();
    if (revealed) scheduleReveal();
  }

  function step(now: number): void {
    frame = 0;
    if (disposed) return;
    if (skip(mode)) {
      dispose();
      return;
    }
    const p = Math.min(1, (now - started) / (phase === "cover" ? coverDuration : revealDuration));
    const eased = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
    draw(eased, phase === "reveal");
    if (p >= 1) {
      if (phase === "cover") enterHold(now);
      else dispose();
      return;
    }
    frame = requestAnimationFrame(step);
  }

  state = {
    generation: 0,
    covered,
    fastCover() {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      // A new navigation owns this hold; settle and cancel any obsolete reveal.
      resolveRevealed?.();
      resolveRevealed = undefined;
      revealed = undefined;
      draw(1, false);
      if (phase !== "hold") enterHold(performance.now());
      else if (label.textContent) label.style.opacity = "1";
    },
    reveal() {
      if (disposed) return Promise.resolve();
      if (skip(mode)) {
        dispose();
        return Promise.resolve();
      }
      if (revealed) return revealed;
      revealed = new Promise<void>((resolve) => {
        resolveRevealed = resolve;
      });
      if (phase === "hold") scheduleReveal();
      return revealed;
    },
    dispose,
  };
  resize();
  // Astro replaces <body>; these siblings must remain until the destination is ready.
  document.documentElement.append(canvas, label);
  window.addEventListener("resize", resize);
  started = performance.now();
  frame = requestAnimationFrame(step);
  return state;
}

/** Cover only: the caller may swap the page once this resolves, then call reveal(). */
export function cover(opts: WipeOptions = {}): Promise<void> {
  const mode = opts.mode ?? "radial";
  if (skip(mode)) {
    active?.dispose();
    return Promise.resolve();
  }
  if (active) {
    active.generation++;
    active.fastCover();
    return active.covered;
  }
  if (mode !== "off") active = createWipe(opts, mode);
  return active?.covered ?? Promise.resolve();
}

/** Reveal after the minimum hold; repeated calls share the same completion. */
export function reveal(): Promise<void> {
  return active?.reveal() ?? Promise.resolve();
}

function runAction(opts: WipeOptions): void | Promise<void> {
  if (opts.action) return opts.action();
  if (opts.mode === "up" && typeof window !== "undefined") {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
}

/** Run an action under the cover. Concurrent requests skip their own animation. */
export async function wipe(opts: WipeOptions = {}): Promise<void> {
  if (skip(opts.mode ?? "radial")) {
    active?.dispose();
    await runAction(opts);
    return;
  }
  if (active) {
    await runAction(opts);
    return;
  }
  const covered = cover(opts);
  // cover() creates active synchronously, beyond TypeScript's earlier undefined narrowing.
  const owner = active as ActiveWipe | undefined;
  const generation = owner?.generation;
  await covered;
  try {
    await runAction(opts);
  } finally {
    // An older asynchronous action must not uncover a newer navigation.
    if (owner && owner.generation === generation) await owner.reveal();
  }
}
