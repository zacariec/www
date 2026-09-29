import { navigate } from "astro:transitions/client";

import { cover, reveal, wipe } from "@/lib/dither-wipe";
import { getPreferences, subscribePreferences } from "@/lib/preferences";
import { resolveTone, TONES } from "@/lib/session";

import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from "astro:transitions/client";

import type { WipeMode } from "@/lib/dither-wipe";
import type { Tone } from "@/lib/session";

interface Origin {
  x: number;
  y: number;
}
let current = new URL(window.location.href);
const persisted = new URLSearchParams();
const sessions = new Map<string, HTMLAnchorElement>();
let pointer: (Origin & { target: EventTarget | null; at: number }) | undefined;
let historyOrigin: Origin | undefined;
let previousPage = document.referrer ? new URL(document.referrer) : undefined;
let navigationVersion = 0;
let navigating = false;

export function isEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    (Boolean(target.closest("input, textarea, select, [role='textbox'], [role='combobox']")) ||
      (target instanceof HTMLElement && target.isContentEditable))
  );
}

export function hasBlockingOverlay(except?: HTMLElement): boolean {
  return [
    ...document.querySelectorAll<HTMLElement>(
      "dialog[open], [aria-modal='true'], [data-nav-pill][data-open]",
    ),
  ].some((element) => element !== except && !element.hidden && element.getClientRects().length > 0);
}

function internalUrl(href: string): URL {
  const url = new URL(href, window.location.href);
  if (url.origin === current.origin && !/^\/(api|studio)(\/|$)/.test(url.pathname)) {
    persisted.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
  }
  return url;
}

function takeOrigin(source?: Element): Origin | undefined {
  const point = pointer;
  pointer = undefined;
  if (!point || performance.now() - point.at > 1500) return undefined;
  if (source && (!(point.target instanceof Node) || !source.contains(point.target)))
    return undefined;
  return { x: point.x, y: point.y };
}

export function navigateSite(href: string): void {
  navigate(internalUrl(href).href, { info: { wipeOrigin: takeOrigin() } });
}

function mode(): WipeMode {
  const value = document.documentElement.dataset.pageTransition;
  if (value === "sweep") return "down";
  return value === "dissolve" || value === "off" ? value : "radial";
}

function decorateLinks(root: ParentNode): void {
  const links = root.querySelectorAll<HTMLAnchorElement>("a[href]");
  if (!links.length && !(root instanceof HTMLAnchorElement)) return;
  const styles = getComputedStyle(document.documentElement);
  const shift = getPreferences().shift ?? Number(document.documentElement.dataset.toneShift);
  function decorate(link: HTMLAnchorElement): void {
    if (link.hasAttribute("download")) return;
    const raw = link.getAttribute("href");
    if (!raw || raw.startsWith("#")) return;
    const url = internalUrl(raw);
    if (url.origin !== current.origin) return;
    if (/^\/(api|studio)(\/|$)/.test(url.pathname)) {
      link.setAttribute("data-astro-reload", "");
      return;
    }
    link.href = url.pathname + url.search + url.hash;
    const entry = sessions.get(url.pathname.replace(/\/$/, ""));
    if (entry && !link.dataset.sessionNumber) {
      link.dataset.sessionNumber = entry.dataset.sessionNumber;
      if (entry.dataset.toneOverride) link.dataset.toneOverride = entry.dataset.toneOverride;
    }
    if (link.dataset.sessionNumber) {
      const tone = resolveTone(
        Number(link.dataset.sessionNumber),
        shift,
        url.searchParams,
        link.dataset.toneOverride as Tone | undefined,
      );
      link.dataset.tone = styles.getPropertyValue(`--${tone}`).trim();
    }
  }
  if (root instanceof HTMLAnchorElement) decorate(root);
  for (const link of links) decorate(link);
}

function refreshLinks(): void {
  current = new URL(window.location.href);
  persisted.delete("shift");
  persisted.delete("tone");
  const shift = current.searchParams.get("shift");
  const tone = current.searchParams.get("tone");
  if (shift !== null && /^[0-5]$/.test(shift)) persisted.set("shift", shift);
  if (tone !== null && TONES.includes(tone as Tone)) persisted.set("tone", tone);
  sessions.clear();
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    "[data-find-row][data-session-number]",
  )) {
    sessions.set(new URL(link.href).pathname.replace(/\/$/, ""), link);
  }
  decorateLinks(document);
}

function edgeFor(url: URL, source?: Element): string | undefined {
  const anchor =
    source?.closest<HTMLAnchorElement>("a[data-session-number]") ??
    sessions.get(url.pathname.replace(/\/$/, ""));
  if (!anchor?.dataset.sessionNumber) return undefined;
  const shift = getPreferences().shift ?? Number(document.documentElement.dataset.toneShift);
  const tone = resolveTone(
    Number(anchor.dataset.sessionNumber),
    shift,
    url.searchParams,
    anchor.dataset.toneOverride as Tone | undefined,
  );
  return getComputedStyle(document.documentElement).getPropertyValue(`--${tone}`).trim();
}

window.addEventListener(
  "pointerdown",
  (event) => {
    pointer =
      event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
        ? { x: event.clientX, y: event.clientY, target: event.target, at: performance.now() }
        : undefined;
  },
  { capture: true, passive: true },
);
window.addEventListener(
  "keydown",
  () => {
    pointer = undefined;
  },
  { capture: true },
);

window.addEventListener(
  "click",
  (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    const link =
      event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const destination = new URL(link.href);
    if (destination.origin !== current.origin) return;
    if (
      link.hasAttribute("data-back-top") ||
      (link.classList.contains("back-top") && destination.hash === "#top")
    ) {
      event.preventDefault();
      wipe({
        mode: mode() === "off" ? "off" : "up",
        label: "cd ↑",
        action: () => window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
      });
    } else if (
      link.hasAttribute("data-sessions-back") &&
      previousPage?.origin === current.origin &&
      previousPage.pathname.replace(/\/$/, "") === "/sessions" &&
      window.history.length > 1
    ) {
      event.preventDefault();
      historyOrigin = takeOrigin(link);
      window.history.back();
    }
  },
  { capture: true },
);

document.addEventListener("astro:before-preparation", (event: TransitionBeforePreparationEvent) => {
  if (event.to.origin !== event.from.origin || /^\/(api|studio)(\/|$)/.test(event.to.pathname))
    return;
  if (
    event.to.pathname === event.from.pathname &&
    event.to.search === event.from.search &&
    event.to.hash
  )
    return;
  const version = ++navigationVersion;
  navigating = true;
  const origin: Origin | undefined =
    event.info?.wipeOrigin ??
    historyOrigin ??
    (event.sourceElement ? takeOrigin(event.sourceElement) : undefined);
  historyOrigin = undefined;
  const covered = cover({
    mode: mode(),
    ...origin,
    edge: edgeFor(event.to, event.sourceElement),
    label: event.to.pathname === "/" ? "cd ~" : `cd ${event.to.pathname}`,
  });
  const load = event.loader;
  event.loader = async () => {
    try {
      await covered;
      if (!event.signal.aborted) await load();
    } catch (error) {
      if (version === navigationVersion) {
        navigating = false;
        reveal();
      }
      throw error;
    } finally {
      if (version === navigationVersion && (event.signal.aborted || event.defaultPrevented)) {
        navigating = false;
        reveal();
      }
    }
  };
  event.signal.addEventListener(
    "abort",
    () => {
      queueMicrotask(() => {
        if (version === navigationVersion) {
          navigating = false;
          reveal();
        }
      });
    },
    { once: true },
  );
});
document.addEventListener("astro:before-swap", (event: TransitionBeforeSwapEvent) => {
  previousPage = event.from;
});
document.addEventListener("astro:after-swap", refreshLinks);
document.addEventListener("astro:page-load", () => {
  refreshLinks();
  if (!navigating) return;
  navigating = false;
  document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  reveal();
});

refreshLinks();
subscribePreferences(() => decorateLinks(document));
const observer = new MutationObserver((records) => {
  for (const record of records)
    for (const node of record.addedNodes) {
      if (node instanceof Element && node.isConnected) decorateLinks(node);
    }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", refreshLinks);

document.addEventListener("keydown", (event) => {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    isEditingTarget(event.target) ||
    hasBlockingOverlay() ||
    (event.key !== "[" && event.key !== "]")
  )
    return;
  const article = document.querySelector<HTMLElement>(".article-template");
  const href = event.key === "[" ? article?.dataset.sessionPrev : article?.dataset.sessionNext;
  if (!href) return;
  event.preventDefault();
  navigateSite(href);
});
