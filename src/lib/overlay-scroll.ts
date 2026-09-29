const bound = new WeakSet<Element>();
const bindings = new Map<HTMLElement, { sync: () => void; dispose: () => void }>();
let removalObserver: MutationObserver | undefined;

function mount(wrapper: HTMLElement): void {
  if (bound.has(wrapper)) return;
  const scroller = wrapper.querySelector<HTMLElement>(":scope > [data-ov-sc]");
  const x = wrapper.querySelector<HTMLElement>(':scope > [data-ov-thumb="x"]');
  const y = wrapper.querySelector<HTMLElement>(':scope > [data-ov-thumb="y"]');
  if (!scroller || !x || !y) return;
  const sc = scroller;
  const thumbs = [x, y];
  const ranges = [0, 0];
  const travels = [0, 0];
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let hovered = false;
  let drag:
    | { axis: number; pointer: number; origin: number; scroll: number; ratio: number }
    | undefined;
  let child: Element | null = null;

  function update(): void {
    const width = sc.clientWidth;
    const height = sc.clientHeight;
    const sizes = [width, height];
    const extents = [sc.scrollWidth, sc.scrollHeight];
    const positions = [sc.scrollLeft, sc.scrollTop];
    const overflows = [
      wrapper.dataset.axis !== "y" && width > 0 && extents[0] > width + 1,
      wrapper.dataset.axis !== "x" && height > 0 && extents[1] > height + 1,
    ];
    const corner = overflows[0] && overflows[1] ? 11 : 0;
    const left = sc.offsetLeft + sc.clientLeft;
    const top = sc.offsetTop + sc.clientTop;
    for (let axis = 0; axis < 2; axis++) {
      const thumb = thumbs[axis];
      thumb.hidden = !overflows[axis];
      const track = Math.max(0, sizes[axis] - 6 - corner);
      // Tiny boxes cannot fit a 28px thumb; never let it escape its track.
      const length = Math.min(track, Math.max(28, (track * sizes[axis]) / (extents[axis] || 1)));
      ranges[axis] = Math.max(0, extents[axis] - sizes[axis]);
      travels[axis] = track - length;
      const fraction = Math.max(0, Math.min(1, positions[axis] / (ranges[axis] || 1)));
      const position = 3 + travels[axis] * fraction;
      thumb.style.left = `${left + (axis ? width - 12 : 0)}px`;
      thumb.style.top = `${top + (axis ? 0 : height - 12)}px`;
      thumb.style[axis ? "height" : "width"] = `${length}px`;
      thumb.style.transform = `translate${axis ? "Y" : "X"}(${position}px)`;
    }
    if (!overflows[0] && !overflows[1]) wrapper.removeAttribute("data-ov-visible");
  }

  function show(): void {
    wrapper.setAttribute("data-ov-visible", "");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!hovered && !drag) wrapper.removeAttribute("data-ov-visible");
    }, 900);
  }

  function stop(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  function finish(event: PointerEvent): void {
    if (event.pointerId !== drag?.pointer) return;
    stop(event);
    const thumb = thumbs[drag.axis];
    drag = undefined;
    wrapper.removeAttribute("data-ov-dragging");
    if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
    hovered = event.pointerType !== "touch" && wrapper.matches(":hover");
    update();
    show();
  }

  sc.addEventListener(
    "scroll",
    () => {
      update();
      show();
    },
    { ...options, passive: true },
  );
  wrapper.addEventListener(
    "pointerenter",
    (event) => {
      hovered = event.pointerType !== "touch";
      update();
      show();
    },
    options,
  );
  wrapper.addEventListener(
    "pointerleave",
    () => {
      hovered = false;
      show();
    },
    options,
  );

  thumbs.forEach((thumb, axis) => {
    thumb.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0 || drag) return;
        stop(event);
        update();
        if (thumb.hidden || travels[axis] <= 0) return;
        drag = {
          axis,
          pointer: event.pointerId,
          origin: axis ? event.clientY : event.clientX,
          scroll: axis ? sc.scrollTop : sc.scrollLeft,
          ratio: ranges[axis] / travels[axis],
        };
        wrapper.setAttribute("data-ov-dragging", "");
        thumb.setPointerCapture(event.pointerId);
        show();
      },
      options,
    );
    thumb.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerId !== drag?.pointer) return;
        stop(event);
        const delta = (drag.axis ? event.clientY : event.clientX) - drag.origin;
        sc[drag.axis ? "scrollTop" : "scrollLeft"] = drag.scroll + delta * drag.ratio;
      },
      options,
    );
    thumb.addEventListener("pointerup", finish, options);
    thumb.addEventListener("pointercancel", finish, options);
    thumb.addEventListener("lostpointercapture", finish, options);
    thumb.addEventListener("click", stop, options);
  });

  const resize = new ResizeObserver(update);
  resize.observe(sc);
  function sync(): void {
    if (child === sc.firstElementChild) return;
    if (child) resize.unobserve(child);
    child = sc.firstElementChild;
    if (child) resize.observe(child);
    update();
  }
  bound.add(wrapper);
  bindings.set(wrapper, {
    sync,
    dispose() {
      controller.abort();
      resize.disconnect();
      clearTimeout(hideTimer);
      if (drag) {
        const thumb = thumbs[drag.axis];
        if (thumb.hasPointerCapture(drag.pointer)) thumb.releasePointerCapture(drag.pointer);
      }
      wrapper.removeAttribute("data-ov-dragging");
      wrapper.removeAttribute("data-ov-visible");
      bindings.delete(wrapper);
      bound.delete(wrapper);
    },
  });
  sync();
  update();
}

export function bindOverlayScroll(root: ParentNode = document): void {
  if (!removalObserver) {
    removalObserver = new MutationObserver((records) => {
      for (const [wrapper, binding] of bindings) {
        if (!wrapper.isConnected) binding.dispose();
        else binding.sync();
      }
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && node.isConnected) bindOverlayScroll(node);
        }
      }
    });
    removalObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (root instanceof HTMLElement && root.matches("[data-ov]")) mount(root);
  for (const wrapper of root.querySelectorAll<HTMLElement>("[data-ov]")) mount(wrapper);
}
