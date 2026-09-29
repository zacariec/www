import { bindOverlayScroll } from "@/lib/overlay-scroll";
import { setPreferences, subscribePreferences } from "@/lib/preferences";

import { hasBlockingOverlay, isEditingTarget, navigateSite } from "./site";

function initializeFindPalette(dialog: HTMLDialogElement): void {
  const input = dialog.querySelector<HTMLInputElement>("[data-find-input]");
  const count = dialog.querySelector<HTMLElement>("[data-find-count]");
  const empty = dialog.querySelector<HTMLElement>("[data-find-empty]");
  if (!input || !count || !empty) return;
  const field = input;
  const resultCount = count;
  const emptyState = empty;
  const rows = [...dialog.querySelectorAll<HTMLElement>("[data-find-row]")];
  const groups = [...dialog.querySelectorAll<HTMLElement>("[data-find-group]")];
  const desktop = matchMedia("(min-width: 721px)");
  let visible = rows;
  let active: HTMLElement | undefined;
  let previousFocus: HTMLElement | null = null;

  function select(row?: HTMLElement, scroll = false): void {
    active?.setAttribute("aria-selected", "false");
    active = row;
    if (row) {
      row.setAttribute("aria-selected", "true");
      field.setAttribute("aria-activedescendant", row.id);
      if (scroll) row.scrollIntoView({ block: "nearest", behavior: "instant" });
    } else {
      field.removeAttribute("aria-activedescendant");
    }
  }

  function filter(): void {
    const query = field.value.trim().toLowerCase();
    visible = rows.filter((row) => {
      row.hidden = !row.dataset.findSearch?.includes(query);
      return !row.hidden;
    });
    for (const group of groups) {
      group.hidden = !group.querySelector("[data-find-row]:not([hidden])");
    }
    emptyState.hidden = visible.length > 0;
    resultCount.textContent = `${visible.length} ${visible.length === 1 ? "result" : "results"}`;
    select(visible[0]);
    dialog.querySelector(".find-results")?.scrollTo({ top: 0, behavior: "instant" });
  }

  function updateMotion(): void {
    const row = rows.find((item) => item.dataset.findCommand === "motion");
    const title = row?.querySelector(".find-row-title");
    if (!row || !title) return;
    const label =
      document.documentElement.dataset.prefMotion === "still"
        ? "Turn motion back on"
        : "Stop all motion";
    title.textContent = label;
    row.dataset.findSearch = `> ${label} preferences commands`.toLowerCase();
    if (dialog.open) filter();
  }

  function close(): void {
    dialog.close();
  }

  function open(): void {
    if (!desktop.matches || hasBlockingOverlay(dialog)) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    field.value = "";
    updateMotion();
    filter();
    dialog.showModal();
    bindOverlayScroll(dialog);
    field.setAttribute("aria-expanded", "true");
    field.focus({ preventScroll: true });
  }

  dialog.addEventListener("close", () => {
    field.setAttribute("aria-expanded", "false");
    field.removeAttribute("aria-activedescendant");
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  let scrimPointer = false;
  function outside(event: MouseEvent): boolean {
    if (event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }
  dialog.addEventListener("pointerdown", (event) => {
    scrimPointer = outside(event);
  });
  dialog.addEventListener("click", (event) => {
    if (scrimPointer && outside(event)) close();
    scrimPointer = false;
  });
  field.addEventListener("input", filter);
  dialog.addEventListener("keydown", (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Tab") {
      // Rows use aria-activedescendant, so the combobox is the dialog's only tab stop.
      event.preventDefault();
      field.focus({ preventScroll: true });
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = active ? visible.indexOf(active) : -1;
      const next = Math.max(
        0,
        Math.min(visible.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)),
      );
      select(visible[next], true);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      active.click();
    }
  });
  rows.forEach((row) => {
    row.addEventListener("pointermove", () => {
      if (!row.hidden) select(row);
    });
    row.addEventListener("mousedown", (event) => event.preventDefault());
    row.addEventListener("click", () => {
      const command = row.dataset.findCommand;
      close();
      if (command === "motion") {
        setPreferences({
          motion: document.documentElement.dataset.prefMotion === "still" ? "On" : "Still",
        });
      } else if (command === "pushes") {
        navigateSite("/timeline?filter=pushes");
      } else if (command === "terminal") {
        navigateSite("/untitled-draft");
      } else if (command === "shuffle") {
        const board = document.querySelector<HTMLElement>("[data-thought-board]");
        const shuffle = board?.querySelector<HTMLButtonElement>("[data-board-shuffle]");
        if (board && shuffle) {
          shuffle.click();
          board.scrollIntoView({
            block: "start",
            behavior:
              document.documentElement.dataset.prefMotion === "still" ? "instant" : "smooth",
          });
        } else {
          navigateSite("/?board=shuffle#thoughts");
        }
      }
    });
  });
  document.addEventListener("keydown", (event) => {
    if (
      !desktop.matches ||
      event.defaultPrevented ||
      event.isComposing ||
      event.repeat ||
      isEditingTarget(event.target) ||
      hasBlockingOverlay(dialog)
    )
      return;
    const toggle =
      event.key.toLowerCase() === "k" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey;
    const slash =
      event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    if (!toggle && !slash) return;
    event.preventDefault();
    if (dialog.open) {
      if (toggle) close();
    } else open();
  });
  desktop.addEventListener("change", () => {
    if (!desktop.matches && dialog.open) close();
  });
  subscribePreferences(updateMotion);
  updateMotion();
  filter();
  bindOverlayScroll(dialog);
}

const palette = document.querySelector<HTMLDialogElement>("[data-find-palette]");
if (palette) initializeFindPalette(palette);
