import { playedAgo, trackProgress, trackTime } from "@/lib/now-playing-display";
import { getPreferences, subscribePreferences } from "@/lib/preferences";
import { nowPlayingResponseSchema } from "@/lib/schemas/spotify";
import { refresh } from "@/lib/zc-gl";

import type { NowPlayingData } from "@/lib/schemas/spotify";

const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-now-playing]"));

if (roots.length) {
  let state: NowPlayingData | null = null;
  try {
    const parsed = nowPlayingResponseSchema
      .nullable()
      .safeParse(JSON.parse(roots[0]?.dataset.state ?? "null"));
    if (parsed.success) state = parsed.data;
  } catch {
    // Invalid SSR state is unavailable until the first real response.
  }
  const positions = document.querySelectorAll<HTMLElement>("[data-np-position]");
  const meters = document.querySelectorAll<HTMLElement>("[data-np-meter]");
  const fills = document.querySelectorAll<HTMLElement>("[data-np-fill]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-np-toggle]");
  const strip = document.querySelector<HTMLElement>("[data-np-strip]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 720px)");
  let pollTimer: number | undefined;
  let progressTimer: number | undefined;
  let requestTimer: number | undefined;
  let request: AbortController | null = null;
  let suspended = false;

  function closeStrip(restoreFocus = false): void {
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (strip) strip.hidden = true;
    if (restoreFocus) toggle?.focus();
  }

  function updateProgress(): void {
    if (!state) return;
    const progress = trackProgress(state);
    const position = trackTime(progress);
    const duration = trackTime(state.durationMs);
    for (const node of positions) node.textContent = position;
    for (const node of meters) {
      node.setAttribute("aria-valuemax", String(state.durationMs));
      node.setAttribute("aria-valuenow", String(Math.floor(progress)));
      node.setAttribute("aria-valuetext", `${position} of ${duration}`);
    }
    const width = state.durationMs ? `${(progress / state.durationMs) * 100}%` : "0%";
    for (const node of fills) node.style.width = width;
  }

  function updateMotion(): void {
    const preference = getPreferences().motion;
    const animated =
      Boolean(state?.playing) &&
      !document.hidden &&
      !suspended &&
      preference !== "Still" &&
      (preference !== "System" || !reducedMotion.matches);
    for (const root of roots) {
      root.dataset.animate = String(animated);
      let changed = false;
      for (const canvas of root.querySelectorAll<HTMLCanvasElement>("canvas[data-zc='cover']")) {
        if (canvas.dataset.anim !== String(animated)) {
          canvas.dataset.anim = String(animated);
          changed = true;
        }
      }
      if (changed) refresh(root);
    }
  }

  function render(): void {
    const status = state?.playing ? "Now playing" : "Last played";
    const ago = playedAgo(state?.playedAt ?? null);
    const detail = state
      ? `${state.track} — ${state.artist}${state.playing ? "" : ` · ${ago}`}`
      : "";
    for (const root of roots) {
      root.hidden = !state;
      root.dataset.playing = String(state?.playing ?? false);
      const fields: Record<string, string> = {
        status,
        detail,
        track: state?.track ?? "",
        credit: state ? `${state.artist}${state.album ? ` · ${state.album}` : ""}` : "",
        ago,
        duration: trackTime(state?.durationMs ?? 0),
      };
      for (const [field, value] of Object.entries(fields)) {
        for (const node of root.querySelectorAll<HTMLElement>(`[data-np-${field}]`))
          node.textContent = value;
      }
      for (const node of root.querySelectorAll<HTMLElement>("[data-np-playing]"))
        node.hidden = !state?.playing;
      for (const node of root.querySelectorAll<HTMLElement>("[data-np-idle]"))
        node.hidden = !state || state.playing;
      for (const link of root.querySelectorAll<HTMLAnchorElement>("[data-np-link]")) {
        if (state) link.href = state.url;
        else link.removeAttribute("href");
      }
      if (root instanceof HTMLAnchorElement) {
        if (state) {
          root.href = state.url;
          root.setAttribute(
            "aria-label",
            `${status}: ${state.track} by ${state.artist} on Spotify`,
          );
        } else {
          root.removeAttribute("href");
          root.removeAttribute("aria-label");
        }
      }
      for (const control of root.querySelectorAll<HTMLElement>(
        "[data-np-anchor], [data-np-toggle]",
      )) {
        control.setAttribute("aria-label", `${status} · ${detail}`);
      }
      let artChanged = false;
      for (const canvas of root.querySelectorAll<HTMLCanvasElement>("canvas[data-zc='cover']")) {
        const src = state?.artUrl ?? "";
        if (canvas.dataset.src !== src) {
          delete canvas.dataset.imageReady;
          canvas.dataset.src = src;
          const image = canvas.closest("[data-image-cover]")?.querySelector("img");
          if (image) {
            if (src) image.src = src;
            else image.removeAttribute("src");
          }
          artChanged = true;
        }
      }
      if (artChanged) refresh(root);
    }
    if (!state) closeStrip();
    updateMotion();
    updateProgress();
    window.clearInterval(progressTimer);
    progressTimer =
      state?.playing && !document.hidden && !suspended
        ? window.setInterval(updateProgress, 1_000)
        : undefined;
  }

  async function poll(): Promise<void> {
    if (document.hidden || suspended || request) return;
    const controller = new AbortController();
    request = controller;
    requestTimer = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch("/api/now-playing", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Spotify is unavailable");
      const parsed = nowPlayingResponseSchema.nullable().safeParse(await response.json());
      if (!parsed.success) throw new Error("Invalid playback state");
      if (request !== controller || document.hidden || suspended) return;
      state = parsed.data;
      render();
    } catch {
      if (request !== controller || document.hidden || suspended) return;
      // Never leave the previous track looking live after a failed request.
      state = null;
      render();
    } finally {
      if (request === controller) {
        window.clearTimeout(requestTimer);
        requestTimer = undefined;
        request = null;
      }
    }
  }

  function stop(): void {
    window.clearInterval(pollTimer);
    window.clearInterval(progressTimer);
    window.clearTimeout(requestTimer);
    pollTimer = undefined;
    progressTimer = undefined;
    requestTimer = undefined;
    request?.abort();
    request = null;
    updateMotion();
  }

  function resume(): void {
    if (document.hidden || suspended || pollTimer !== undefined) return;
    render();
    pollTimer = window.setInterval(() => {
      poll();
    }, 30_000);
    poll();
  }

  toggle?.addEventListener("click", () => {
    if (!state || !strip) return;
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    strip.hidden = !open;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && strip && !strip.hidden) {
      closeStrip(strip.contains(document.activeElement));
    }
  });
  mobile.addEventListener("change", () => {
    if (!mobile.matches) closeStrip();
  });
  reducedMotion.addEventListener("change", updateMotion);
  subscribePreferences(updateMotion);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else resume();
  });
  window.addEventListener("pagehide", () => {
    suspended = true;
    stop();
  });
  window.addEventListener("pageshow", () => {
    suspended = false;
    resume();
  });
  if (document.hidden) render();
  else resume();
}
