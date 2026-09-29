const current = new URL(window.location.href);
const toneNames: Record<string, true> = {
  pink: true,
  blue: true,
  sand: true,
  sage: true,
  lilac: true,
  apricot: true,
};
const persisted = new URLSearchParams();
const shift = current.searchParams.get("shift");
const tone = current.searchParams.get("tone");
if (shift !== null && /^[0-5]$/.test(shift)) persisted.set("shift", shift);
if (tone !== null && Object.hasOwn(toneNames, tone)) persisted.set("tone", tone);

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

export function navigateSite(href: string): void {
  document.documentElement.classList.add("is-leaving");
  window.location.assign(internalUrl(href));
}
function decorateLinks(root: ParentNode) {
  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (link.hasAttribute("download")) continue;
    const raw = link.getAttribute("href");
    if (!raw || raw.startsWith("#")) continue;
    const url = internalUrl(raw);
    if (url.origin !== current.origin || /^\/(api|studio)(\/|$)/.test(url.pathname)) continue;
    link.href = url.pathname + url.search + url.hash;
  }
}
decorateLinks(document);
const observer = new MutationObserver((records) => {
  for (const record of records)
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      decorateLinks(node.parentElement ?? node);
    }
});
observer.observe(document.body, { childList: true, subtree: true });

let leavingTimer: number;
document.addEventListener("click", (event) => {
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
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
  const destination = new URL(link.href);
  if (destination.origin !== current.origin) return;
  if (link.hasAttribute("data-sessions-back") && document.referrer) {
    const referrer = new URL(document.referrer);
    if (
      referrer.origin === current.origin &&
      referrer.pathname.replace(/\/$/, "") === "/sessions" &&
      window.history.length > 1
    ) {
      event.preventDefault();
      window.history.back();
      return;
    }
  }
  if (
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash
  )
    return;
  document.documentElement.classList.add("is-leaving");
  clearTimeout(leavingTimer);
  leavingTimer = window.setTimeout(
    () => document.documentElement.classList.remove("is-leaving"),
    450,
  );
});
window.addEventListener("pageshow", () => document.documentElement.classList.remove("is-leaving"));

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

window.addEventListener("pageshow", (event) => {
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  // A full document navigation starts at the top; hashes and browser traversal retain native behavior.
  if (!event.persisted && navigation?.type === "navigate" && !window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
});
