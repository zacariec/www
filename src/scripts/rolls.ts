interface ViewerFrame {
  number: string;
  src: string;
  srcset: string;
  alt: string;
  caption: string;
}

function initializeRoll(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>("[data-roll-viewer]");
  const image = dialog?.querySelector<HTMLImageElement>("[data-roll-image]");
  const count = dialog?.querySelector<HTMLElement>("[data-roll-count]");
  const caption = dialog?.querySelector<HTMLElement>("[data-roll-caption]");
  const closeButton = dialog?.querySelector<HTMLButtonElement>("[data-roll-close]");
  const previousButton = dialog?.querySelector<HTMLButtonElement>("[data-roll-previous]");
  const nextButton = dialog?.querySelector<HTMLButtonElement>("[data-roll-next]");
  const stage = dialog?.querySelector<HTMLElement>("[data-roll-stage]");
  if (
    !dialog ||
    !image ||
    !count ||
    !caption ||
    !closeButton ||
    !previousButton ||
    !nextButton ||
    !stage
  )
    return;
  const frames: ViewerFrame[] = JSON.parse(dialog.dataset.rollFrames ?? "[]");
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const mobile = matchMedia("(max-width: 720px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const preloaders = [new Image(), new Image()];
  let current = 0;
  let trigger: HTMLButtonElement | undefined;
  let oldOverflow = "";
  let locked = false;
  let disposing = false;
  let pointer: { id: number; x: number; y: number } | undefined;

  const showFrame = (index: number) => {
    if (!frames.length) return;
    current = (index + frames.length) % frames.length;
    const frame = frames[current];
    image.alt = frame.alt;
    image.srcset = frame.srcset;
    image.src = frame.src;
    count.textContent = `${frame.number} / ${frames.length}`;
    caption.textContent = frame.caption;
    const adjacent = [(current + 1) % frames.length, (current + frames.length - 1) % frames.length];
    adjacent.forEach((next, neighborIndex) => {
      if (next === current || (neighborIndex === 1 && next === adjacent[0])) return;
      const preload = preloaders[neighborIndex];
      preload.sizes = image.sizes;
      preload.srcset = frames[next].srcset;
      preload.src = frames[next].src;
    });
  };

  function restorePage() {
    if (locked) {
      document.body.style.overflow = oldOverflow;
      locked = false;
    }
    if (!disposing && trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = undefined;
    pointer = undefined;
  }

  root.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>("[data-roll-open]");
      if (!button) return;
      const index = Number(button.dataset.rollOpen);
      if (!Number.isInteger(index) || !frames[index]) return;
      trigger = button;
      showFrame(index);
      if (!dialog.open) {
        oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        locked = true;
        dialog.showModal();
      }
      closeButton.focus({ preventScroll: true });
    },
    options,
  );
  closeButton.addEventListener("click", () => dialog.close(), options);
  previousButton.addEventListener("click", () => showFrame(current - 1), options);
  nextButton.addEventListener("click", () => showFrame(current + 1), options);
  dialog.addEventListener("close", restorePage, options);
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      dialog.close();
    },
    options,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (!dialog.open) return;
      if (["[", "]", "ArrowLeft", "ArrowRight", "Escape"].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") dialog.close();
        else if (event.key === "ArrowLeft") showFrame(current - 1);
        else if (event.key === "ArrowRight") showFrame(current + 1);
      } else if (event.key === "Tab") {
        // Keep keyboard focus in the modal even where native dialog tab wrapping differs.
        const buttons = [closeButton, previousButton, nextButton];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    { ...options, capture: true },
  );

  stage.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !dialog.open ||
        !event.isPrimary ||
        event.pointerType === "mouse" ||
        (event.target instanceof Element && event.target.closest("button"))
      )
        return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      stage.setPointerCapture(event.pointerId);
    },
    options,
  );
  stage.addEventListener(
    "pointerup",
    (event) => {
      if (pointer?.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer = undefined;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) showFrame(current + (dx < 0 ? 1 : -1));
    },
    options,
  );
  stage.addEventListener(
    "pointercancel",
    () => {
      pointer = undefined;
    },
    options,
  );

  const strip = root.querySelector<HTMLElement>("[data-roll-strip]");
  strip?.addEventListener(
    "wheel",
    (event) => {
      if (mobile.matches || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
        return;
      const max = strip.scrollWidth - strip.clientWidth;
      if (
        max <= 0 ||
        (event.deltaY < 0 && strip.scrollLeft <= 0) ||
        (event.deltaY > 0 && strip.scrollLeft >= max - 1)
      )
        return;
      event.preventDefault();
      let multiplier = 1;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) multiplier = 16;
      else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) multiplier = strip.clientWidth;
      strip.scrollLeft += event.deltaY * multiplier;
    },
    { ...options, passive: false },
  );

  const indexBar = root.querySelector<HTMLElement>("[data-roll-index]");
  const sections = [...root.querySelectorAll<HTMLElement>("[data-roll-section]")];
  const stops = [...root.querySelectorAll<HTMLAnchorElement>("[data-roll-stop]")];
  const currentLabel = root.querySelector<HTMLElement>("[data-roll-current]");
  let pending = 0;
  let active = "";
  let resizeObserver: ResizeObserver | undefined;

  function updateActive() {
    pending = 0;
    let section = sections[0];
    for (const candidate of sections) {
      if (candidate.getBoundingClientRect().top <= window.innerHeight * 0.45) section = candidate;
    }
    const number = section?.dataset.rollSection;
    if (!number || active === number) return;
    active = number;
    sections.forEach((candidate) => {
      if (candidate === section) candidate.dataset.active = "true";
      else delete candidate.dataset.active;
    });
    stops.forEach((stop) => {
      if (stop.dataset.rollStop === number) {
        stop.setAttribute("aria-current", "location");
        if (currentLabel) currentLabel.textContent = stop.dataset.rollStopLabel ?? "";
      } else stop.removeAttribute("aria-current");
    });
  }
  function scheduleActive() {
    if (!pending) pending = requestAnimationFrame(updateActive);
  }
  if (indexBar) {
    const updateOffset = () => {
      const top = parseFloat(getComputedStyle(indexBar).top) || 0;
      root.style.setProperty("--roll-route-offset", `${indexBar.offsetHeight + top + 20}px`);
      scheduleActive();
    };
    resizeObserver = new ResizeObserver(updateOffset);
    resizeObserver.observe(indexBar);
    window.addEventListener("scroll", scheduleActive, { ...options, passive: true });
    window.addEventListener("resize", updateOffset, options);
    indexBar.addEventListener(
      "click",
      (event) => {
        if (
          !(event instanceof MouseEvent) ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          !(event.target instanceof Element)
        )
          return;
        const stop = event.target.closest<HTMLAnchorElement>("[data-roll-stop]");
        const section = sections.find(
          (candidate) => candidate.dataset.rollSection === stop?.dataset.rollStop,
        );
        if (!stop || !section) return;
        event.preventDefault();
        const still = reduced.matches || document.documentElement.dataset.prefMotion === "still";
        section.scrollIntoView({ behavior: still ? "instant" : "smooth", block: "start" });
        window.history.replaceState(window.history.state, "", stop.hash);
      },
      options,
    );
    updateOffset();
  }

  return () => {
    disposing = true;
    if (dialog.open) dialog.close();
    restorePage();
    controller.abort();
    resizeObserver?.disconnect();
    if (pending) cancelAnimationFrame(pending);
    preloaders.forEach((preload) => {
      preload.removeAttribute("srcset");
      preload.removeAttribute("src");
    });
  };
}

let disposeRoll: (() => void) | undefined;
function mountRoll() {
  disposeRoll?.();
  const root = document.querySelector<HTMLElement>("[data-roll-root]");
  disposeRoll = root ? initializeRoll(root) : undefined;
}
document.addEventListener("astro:before-swap", () => {
  disposeRoll?.();
  disposeRoll = undefined;
});
document.addEventListener("astro:page-load", mountRoll);
mountRoll();
