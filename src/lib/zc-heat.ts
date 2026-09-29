interface HeatDay {
  iso: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future?: boolean;
  sessionIds?: string[];
}

export interface Heatmap {
  refresh: () => void;
  pause: () => void;
  resume: () => void;
  dispose: () => void;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const INK_PIXELS = [0, 0, 1, 3, 6];
const PITCH = 15;
const KEY_STEP: Record<string, number> = {
  ArrowLeft: -7,
  ArrowRight: 7,
  ArrowUp: -1,
  ArrowDown: 1,
};

/** A contribution chart is event-driven 2D drawing, never an animation-loop participant. */
export function mountHeat(canvas: HTMLCanvasElement): Heatmap | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ctx = context;
  const events = new AbortController();
  let days: HeatDay[] = [];
  let serialized = "";
  let selected = -1;
  let width = 792;
  let height = 102;
  let legend = "";
  let ink = "";
  let tone = "";
  let rule = "";
  let paused = false;

  function drawCell(x: number, y: number, level: number, marked: boolean) {
    for (let i = 0; i < 16; i++) {
      const b = BAYER[i];
      if (!level) {
        if (b !== 0) continue;
        ctx.fillStyle = rule;
      } else {
        if (level === 1 && b >= 8) continue;
        ctx.fillStyle = b < INK_PIXELS[level] ? ink : tone;
      }
      ctx.fillRect(x + (i & 3) * 3, y + (i >> 2) * 3, 3, 3);
    }
    if (marked) {
      ctx.fillStyle = ink;
      ctx.fillRect(x + 3, y + 3, 6, 6);
    }
  }

  function draw() {
    if (paused) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const outputWidth = Math.round(bounds.width * ratio);
    const outputHeight = Math.round(bounds.height * ratio);
    if (canvas.width !== outputWidth) canvas.width = outputWidth;
    if (canvas.height !== outputHeight) canvas.height = outputHeight;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (legend === "mark") drawCell(0, 0, 0, true);
    else if (legend) for (let i = 0; i < 5; i++) drawCell(i * PITCH, 0, i, false);
    else {
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        if (!day.future)
          drawCell(
            Math.floor(i / 7) * PITCH,
            (i % 7) * PITCH,
            day.level,
            Boolean(day.sessionIds?.length),
          );
      }
      if (selected >= 0) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1;
        // The outline extends into the gutter without covering the 12px cell.
        ctx.strokeRect(
          Math.floor(selected / 7) * PITCH - 1.5,
          (selected % 7) * PITCH - 1.5,
          15,
          15,
        );
      }
    }
  }

  function select(index: number) {
    const next = index < 0 || index >= days.length || days[index].future ? -1 : index;
    if (selected === next) return;
    selected = next;
    const day = days[next] ?? null;
    if (day)
      canvas.setAttribute(
        "aria-label",
        `${day.iso}: ${day.count} contribution${day.count === 1 ? "" : "s"}${day.sessionIds?.length ? `; ${day.sessionIds.join(", ")} published` : ""}. Use arrow keys to explore days.`,
      );
    else
      canvas.setAttribute(
        "aria-label",
        "GitHub contributions. Use arrow keys to explore days; Home and End jump to the first and latest day.",
      );
    canvas.dispatchEvent(new CustomEvent("zc:heat-day", { bubbles: true, detail: { day } }));
    draw();
  }

  function point(event: PointerEvent) {
    if (legend) return;
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) * width) / bounds.width;
    const y = ((event.clientY - bounds.top) * height) / bounds.height;
    select(
      x < 0 || y < 0 || x >= width || y >= height || x % PITCH >= 12 || y % PITCH >= 12
        ? -1
        : Math.floor(x / PITCH) * 7 + Math.floor(y / PITCH),
    );
  }

  function refresh() {
    const data = canvas.dataset;
    legend = data.legend || "";
    const weeks = data.weeks === "22" ? 22 : 53;
    width = weeks * PITCH - 3;
    if (legend) width = legend === "mark" ? 12 : 72;
    height = legend ? 12 : 102;
    // Keep logical geometry independent of the DPR-scaled bitmap attributes.
    // Otherwise intrinsic canvas sizing feeds back through ResizeObserver.
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const next = `${weeks}:${data.days || "[]"}`;
    if (next !== serialized) {
      serialized = next;
      try {
        const parsed: unknown = JSON.parse(data.days || "[]");
        days = Array.isArray(parsed)
          ? parsed
              .filter(
                (day): day is HeatDay =>
                  typeof day === "object" &&
                  day !== null &&
                  typeof day.iso === "string" &&
                  /^\d{4}-\d{2}-\d{2}$/.test(day.iso) &&
                  Number.isInteger(day.count) &&
                  day.count >= 0 &&
                  Number.isInteger(day.level) &&
                  day.level >= 0 &&
                  day.level <= 4,
              )
              .slice(-weeks * 7)
          : [];
      } catch {
        days = [];
      }
      select(-1);
    }
    const style = getComputedStyle(canvas);
    const css = (value: string, fallback: string) =>
      (value.startsWith("--") ? style.getPropertyValue(value).trim() : value) ||
      style.getPropertyValue(fallback).trim();
    ink = css("--ink", "--ink");
    rule = css("--rule", "--ink");
    tone = css(data.fg || "--post-tone", "--pink");
    if (legend) {
      canvas.setAttribute("aria-hidden", "true");
      canvas.removeAttribute("tabindex");
    } else {
      if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;
      if (!canvas.hasAttribute("role")) canvas.setAttribute("role", "img");
      if (!canvas.hasAttribute("aria-label"))
        canvas.setAttribute(
          "aria-label",
          "GitHub contributions. Use arrow keys to explore days; Home and End jump to the first and latest day.",
        );
    }
    draw();
  }

  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "touch") point(event);
    },
    { signal: events.signal },
  );
  canvas.addEventListener("pointerdown", point, { signal: events.signal });
  canvas.addEventListener(
    "pointerleave",
    (event) => {
      if (event.pointerType !== "touch" && document.activeElement !== canvas) select(-1);
    },
    { signal: events.signal },
  );
  canvas.addEventListener("blur", () => select(-1), { signal: events.signal });
  canvas.addEventListener(
    "focus",
    () => {
      if (selected < 0) select(days.findLastIndex((day) => !day.future));
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "keydown",
    (event) => {
      if (legend || event.altKey || event.ctrlKey || event.metaKey) return;
      const delta = KEY_STEP[event.key];
      if (delta === undefined && !["Home", "End", "Escape"].includes(event.key)) return;
      event.preventDefault();
      const last = days.findLastIndex((day) => !day.future);
      if (event.key === "Escape") select(-1);
      else if (event.key === "Home") select(days.findIndex((day) => !day.future));
      else if (event.key === "End" || selected < 0) select(last);
      else select(Math.max(0, Math.min(last, selected + (delta ?? 0))));
    },
    { signal: events.signal },
  );
  const observer = new ResizeObserver(refresh);
  observer.observe(canvas);
  refresh();
  return {
    refresh,
    pause() {
      paused = true;
      observer.disconnect();
    },
    resume() {
      paused = false;
      observer.observe(canvas);
      refresh();
    },
    dispose() {
      observer.disconnect();
      events.abort();
    },
  };
}
