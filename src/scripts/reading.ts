import type { SanityComment } from "@/lib/sanity/types";

function initializeReading(root: HTMLElement) {
  const article = root.querySelector<HTMLElement>("[data-reading-article]");
  const bodyElement = root.querySelector<HTMLElement>("[data-reading-body]");
  const dialogElement = root.querySelector<HTMLDialogElement>("[data-paragraph-dialog]");
  if (!article || !bodyElement || !dialogElement) return;
  const body = bodyElement;
  const dialog = dialogElement;
  const highlightElement = dialog.querySelector<HTMLButtonElement>("[data-highlight-toggle]");
  const composerElement = dialog.querySelector<HTMLFormElement>("[data-paragraph-composer]");
  const statusElement = dialog.querySelector<HTMLElement>("[data-dialog-status]");
  const closeButton = dialog.querySelector<HTMLButtonElement>("[data-dialog-close]");
  const commentButton = dialog.querySelector<HTMLButtonElement>("[data-comment-open]");
  const copyButton = dialog.querySelector<HTMLButtonElement>("[data-copy-anchor]");
  if (
    !highlightElement ||
    !composerElement ||
    !statusElement ||
    !closeButton ||
    !commentButton ||
    !copyButton
  )
    return;
  const highlightButton = highlightElement;
  const composer = composerElement;
  const status = statusElement;
  const draftElement = composer.querySelector<HTMLTextAreaElement>("textarea");
  const postElement = composer.querySelector<HTMLButtonElement>('button[type="submit"]');
  const highlightLabel = highlightButton.firstChild;
  if (!draftElement || !postElement || !highlightLabel) return;
  const draft = draftElement;
  const post = postElement;
  const label = highlightLabel;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const paragraphs = [...body.querySelectorAll<HTMLElement>("[data-paragraph]")];
  const anchors = [...body.querySelectorAll<HTMLButtonElement>("[data-paragraph-anchor]")];
  const key = `zc:highlights:${root.dataset.slug}`;
  const mobile = matchMedia("(max-width: 720px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const drafts = new Map<number, string>();
  let highlights = new Set<number>();
  let selected = 0;
  let trigger: HTMLButtonElement | undefined;
  let frame = 0;
  let lastPercent = -1;
  let lastMinutesLeft = -1;
  let lastParagraph = -1;
  let jumpTimeout: number | undefined;
  const minutes = Number(root.dataset.readTime) || 0;
  const percentages = root.querySelectorAll<HTMLElement>("[data-reading-percent]");
  const bars = root.querySelectorAll<HTMLElement>("[data-reading-bar]");
  const progress = root.querySelectorAll<HTMLElement>("[data-reading-progress]");
  const remaining = root.querySelectorAll<HTMLElement>("[data-reading-left]");
  const ordinals = root.querySelectorAll<HTMLElement>("[data-reading-paragraph]");

  function parseHighlights(value: string | null): Set<number> {
    try {
      const data: unknown = JSON.parse(value ?? "[]");
      return new Set(
        Array.isArray(data)
          ? data.filter((n): n is number => Number.isInteger(n) && n > 0 && n <= paragraphs.length)
          : [],
      );
    } catch {
      return new Set();
    }
  }
  try {
    highlights = parseHighlights(localStorage.getItem(key));
  } catch {
    /* Private storage: keep this visit's state in memory. */
  }

  function paintHighlights() {
    paragraphs.forEach((paragraph, index) =>
      paragraph.classList.toggle("is-highlighted", highlights.has(index + 1)),
    );
    root.querySelectorAll("[data-highlight-count]").forEach((node) => {
      node.textContent = String(highlights.size);
    });
    highlightButton.setAttribute("aria-pressed", String(highlights.has(selected)));
    label.textContent = highlights.has(selected) ? "■ Remove highlight " : "□ Highlight ";
  }

  function positionDialog() {
    if (!dialog.open || !trigger) return;
    if (mobile.matches) {
      dialog.style.removeProperty("left");
      dialog.style.removeProperty("top");
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = dialog.offsetWidth;
    const height = dialog.offsetHeight;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const below = rect.bottom + 8;
    const top =
      below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8);
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  }

  function openDialog(button: HTMLButtonElement) {
    trigger?.setAttribute("aria-expanded", "false");
    trigger = button;
    selected = Number(button.dataset.paragraphAnchor);
    dialog.querySelectorAll("[data-dialog-paragraph]").forEach((node) => {
      node.textContent = `¶${String(selected).padStart(2, "0")}`;
    });
    composer.hidden = true;
    draft.value = drafts.get(selected) ?? "";
    post.disabled = !draft.value.trim();
    status.textContent = "";
    paintHighlights();
    if (!dialog.open) dialog.showModal();
    button.setAttribute("aria-expanded", "true");
    positionDialog();
    highlightButton.focus({ preventScroll: true });
  }

  function closeDialog(restoreFocus = true) {
    drafts.set(selected, draft.value);
    dialog.close();
    trigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  }

  function updateProgress() {
    frame = 0;
    const rect = body.getBoundingClientRect();
    // Measure the reading line, rather than total document height (which includes the thread/footer).
    const readingLine = Math.min(window.innerHeight * 0.28, 220);
    const distance = Math.max(1, body.offsetHeight);
    const ratio = Math.min(1, Math.max(0, (readingLine - rect.top) / distance));
    const percent = Math.round(ratio * 100);
    const minutesLeft = Math.ceil(minutes * (1 - ratio));
    // Finish geometry reads before changing any progress text or bar widths.
    let current = paragraphs.length ? 1 : 0;
    for (let index = 0; index < paragraphs.length; index++) {
      if (paragraphs[index].getBoundingClientRect().top <= readingLine) current = index + 1;
      else break;
    }
    if (percent !== lastPercent) {
      percentages.forEach((node) => {
        node.textContent = `${percent}%`;
      });
      bars.forEach((node) => {
        node.style.width = `${percent}%`;
      });
      progress.forEach((node) => node.setAttribute("aria-valuenow", String(percent)));
      lastPercent = percent;
    }
    if (minutesLeft !== lastMinutesLeft) {
      remaining.forEach((node) => {
        node.textContent = `~${minutesLeft} min left`;
      });
      lastMinutesLeft = minutesLeft;
    }
    if (current !== lastParagraph) {
      ordinals.forEach((node) => {
        node.textContent = `¶${String(current).padStart(2, "0")}`;
      });
      lastParagraph = current;
    }
    positionDialog();
  }
  function scheduleProgress() {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  }

  function jump(index: number, scroll = true) {
    const paragraph = paragraphs[index - 1];
    if (!paragraph) return;
    paragraphs.forEach((node) => node.classList.remove("zc-paragraph-jump"));
    paragraph.classList.add("zc-paragraph-jump");
    if (scroll)
      paragraph.scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
        block: "center",
      });
    paragraph.focus({ preventScroll: true });
    clearTimeout(jumpTimeout);
    jumpTimeout = window.setTimeout(() => paragraph.classList.remove("zc-paragraph-jump"), 2400);
  }

  function updateComments(comments: SanityComment[]) {
    const counts = new Map<number, number>();
    const approved = comments.filter((comment) => comment.status === "approved");
    approved.forEach((comment) => {
      if (comment.anchorIndex && comment.anchorIndex <= paragraphs.length)
        counts.set(comment.anchorIndex, (counts.get(comment.anchorIndex) ?? 0) + 1);
    });
    root.querySelectorAll("[data-reply-count]").forEach((node) => {
      node.textContent = String(approved.length);
    });
    const indices = [...counts.keys()].sort((a, b) => a - b);
    root.querySelectorAll("[data-reply-note]").forEach((node) => {
      node.textContent = indices.length
        ? `on ${indices.map((index) => `¶${String(index).padStart(2, "0")}`).join(", ")}`
        : "in the thread";
    });
    root.querySelectorAll<HTMLElement>("[data-paragraph-replies]").forEach((node) => {
      const index = Number(node.dataset.paragraphReplies);
      const count = counts.get(index) ?? 0;
      node.hidden = !count;
      node.textContent = `↳ ${count}`;
      node.setAttribute("aria-label", `${count} replies to paragraph ${index}`);
    });
  }

  anchors.forEach((button) => button.addEventListener("click", () => openDialog(button)));
  closeButton.addEventListener("click", () => closeDialog());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDialog();
  });
  highlightButton.addEventListener("click", () => {
    if (highlights.has(selected)) highlights.delete(selected);
    else highlights.add(selected);
    try {
      localStorage.setItem(key, JSON.stringify([...highlights]));
      status.textContent = "";
    } catch {
      status.textContent = "Highlight saved for this visit. Browser storage is unavailable.";
    }
    paintHighlights();
  });
  commentButton.addEventListener("click", () => {
    composer.hidden = false;
    positionDialog();
    draft.focus({ preventScroll: true });
  });
  draft.addEventListener("input", () => {
    post.disabled = !draft.value.trim();
    drafts.set(selected, draft.value);
  });
  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!draft.value.trim()) return;
    const detail = { anchorIndex: selected, body: draft.value.trim(), submit: true };
    document.documentElement.dataset.commentAnchor = String(selected);
    document.documentElement.dataset.commentDraft = detail.body;
    document.documentElement.dataset.commentSubmit = "true";
    closeDialog(false);
    document
      .getElementById("thread")
      ?.scrollIntoView({ behavior: reduced.matches ? "instant" : "smooth", block: "start" });
    window.dispatchEvent(new CustomEvent("zc:comment-anchor", { detail }));
  });
  copyButton.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.hash = `p${selected}`;
    try {
      await navigator.clipboard.writeText(url.href);
      if (controller.signal.aborted) return;
      status.textContent = "Link copied.";
    } catch {
      if (controller.signal.aborted) return;
      // Keep the real link available when clipboard permission is denied.
      status.replaceChildren();
      const link = document.createElement("a");
      link.href = url.href;
      link.textContent = url.href;
      status.append("Copy this link: ", link);
    }
    positionDialog();
  });
  window.addEventListener(
    "zc:comments-updated",
    ((event: CustomEvent<{ comments: SanityComment[] }>) => {
      if (Array.isArray(event.detail?.comments)) updateComments(event.detail.comments);
    }) as EventListener,
    options,
  );
  window.addEventListener(
    "zc:paragraph-jump",
    ((event: CustomEvent<{ anchorIndex: number }>) =>
      jump(event.detail.anchorIndex)) as EventListener,
    options,
  );
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key === key || event.key === null) {
        highlights = parseHighlights(event.newValue);
        paintHighlights();
      }
    },
    options,
  );
  window.addEventListener(
    "hashchange",
    () => {
      const match = /^#p(\d+)$/.exec(window.location.hash);
      if (match) jump(Number(match[1]));
    },
    options,
  );
  window.addEventListener("scroll", scheduleProgress, { ...options, passive: true });
  window.addEventListener("resize", scheduleProgress, { ...options, passive: true });
  window.addEventListener("pageshow", scheduleProgress, options);
  mobile.addEventListener("change", positionDialog, options);
  const resize = new ResizeObserver(scheduleProgress);
  resize.observe(body);
  paintHighlights();
  updateProgress();
  const initialAnchor = /^#p(\d+)$/.exec(window.location.hash);
  if (initialAnchor) jump(Number(initialAnchor[1]), false);
  return () => {
    controller.abort();
    resize.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(jumpTimeout);
    if (dialog.open) closeDialog(false);
    trigger = undefined;
  };
}

let disposeReading: (() => void) | undefined;
function mountReading() {
  if (disposeReading) return;
  const readingRoot = document.querySelector<HTMLElement>("[data-reading-root]");
  if (readingRoot) disposeReading = initializeReading(readingRoot);
}
document.addEventListener("astro:before-swap", () => {
  disposeReading?.();
  disposeReading = undefined;
});
document.addEventListener("astro:page-load", mountReading);
mountReading();
