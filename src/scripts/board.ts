interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  z: number;
}
interface BoardState {
  version: 1;
  cards: Record<string, CardPosition>;
}

function initializeBoard(section: HTMLElement) {
  const boardElement = section.querySelector<HTMLElement>("[data-board-canvas]");
  const shuffle = section.querySelector<HTMLButtonElement>("[data-board-shuffle]");
  const tidy = section.querySelector<HTMLButtonElement>("[data-board-tidy]");
  const statusElement = section.querySelector<HTMLElement>("[data-board-status]");
  if (!shuffle || !tidy) return;
  if (!boardElement || !statusElement) {
    shuffle.disabled = true;
    tidy.disabled = true;
    return;
  }
  const board = boardElement;
  const status = statusElement;
  const cards = [...board.querySelectorAll<HTMLElement>("[data-thought-card]")];
  const mobile = matchMedia("(max-width: 720px)");
  const compact = matchMedia("(max-width: 1100px)");
  const key = "zc:thought-board:v1";
  const positions = new Map<HTMLElement, CardPosition>();
  let stored: BoardState | undefined;
  let topZ = 0;
  let drag:
    | {
        card: HTMLElement;
        pointerId: number;
        startX: number;
        startY: number;
        x: number;
        y: number;
        moved: boolean;
      }
    | undefined;
  let frame = 0;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      parsed.version === 1 &&
      "cards" in parsed &&
      parsed.cards &&
      typeof parsed.cards === "object"
    )
      stored = parsed as BoardState;
  } catch {
    /* Bad or unavailable storage falls back to the actual CMS layout. */
  }

  function clamp(card: HTMLElement, position: CardPosition) {
    const radians = (Math.abs(position.rotation) * Math.PI) / 180;
    const rotatedWidth =
      card.offsetWidth * Math.cos(radians) + card.offsetHeight * Math.sin(radians);
    const rotatedHeight =
      card.offsetHeight * Math.cos(radians) + card.offsetWidth * Math.sin(radians);
    // Keep rotated corners, the pin, and the hard shadow inside the board.
    const insetX = Math.max(0, (rotatedWidth - card.offsetWidth) / 2) + 14;
    const insetY = Math.max(0, (rotatedHeight - card.offsetHeight) / 2) + 16;
    const x = Math.max(insetX, Math.min(position.x, board.clientWidth - card.offsetWidth - insetX));
    const y = Math.max(
      insetY,
      Math.min(position.y, board.clientHeight - card.offsetHeight - insetY),
    );
    return { ...position, x, y };
  }

  function paint(card: HTMLElement, position: CardPosition) {
    const bounded = clamp(card, position);
    positions.set(card, bounded);
    card.style.setProperty("--board-x", `${bounded.x}px`);
    card.style.setProperty("--board-y", `${bounded.y}px`);
    card.style.setProperty("--rotation", `${bounded.rotation}deg`);
    card.style.zIndex = String(bounded.z);
  }

  function persist() {
    const state: BoardState = { version: 1, cards: {} };
    cards.forEach((card) => {
      const position = positions.get(card);
      const { thoughtId } = card.dataset;
      if (!position || !thoughtId) return;
      const range = Math.max(1, board.clientWidth - card.offsetWidth);
      state.cards[thoughtId] = { ...position, x: (position.x / range) * 100 };
    });
    stored = state;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      status.textContent = "Layout saved for this visit. Browser storage is unavailable.";
    }
  }

  function finishDrag() {
    if (!drag) return;
    const { card, pointerId, moved } = drag;
    drag = undefined;
    if (card.hasPointerCapture(pointerId)) card.releasePointerCapture(pointerId);
    card.classList.remove("is-dragging");
    const position = positions.get(card);
    if (moved && position) {
      paint(card, { ...position, rotation: Math.random() * 7 - 3.5 });
      persist();
    }
  }

  function layout() {
    frame = 0;
    if (drag) finishDrag();
    if (mobile.matches) {
      delete board.dataset.interactive;
      board.style.removeProperty("height");
      cards.forEach((card) => {
        card.style.removeProperty("width");
        card.removeAttribute("aria-keyshortcuts");
        card.setAttribute("aria-label", `Thought ${card.querySelector("time")?.textContent ?? ""}`);
      });
      return;
    }
    const columns = compact.matches ? 2 : 4;
    const gap = 24;
    const padding = 28;
    const width = (board.clientWidth - padding * 2 - gap * (columns - 1)) / columns;
    cards.forEach((card) => {
      card.style.width = `${width}px`;
    });
    const rowHeight = Math.max(...cards.map((card) => card.offsetHeight)) + 56;
    board.style.height = `${Math.ceil(cards.length / columns) * rowHeight + padding * 2}px`;
    board.dataset.interactive = "true";
    cards.forEach((card, index) => {
      const candidate = card.dataset.thoughtId ? stored?.cards[card.dataset.thoughtId] : undefined;
      const saved =
        candidate &&
        [candidate.x, candidate.y, candidate.rotation, candidate.z].every(Number.isFinite)
          ? candidate
          : undefined;
      const source = saved ?? {
        x: Number(card.dataset.boardX),
        y: Number(card.dataset.boardY),
        rotation: Number(card.dataset.boardRotation),
        z: Number(card.dataset.boardZ),
      };
      const position = {
        x: (Math.max(0, Math.min(100, source.x)) / 100) * (board.clientWidth - width),
        y: Math.max(0, source.y),
        rotation: Math.max(-3.5, Math.min(3.5, source.rotation)),
        z: source.z,
      };
      // At two columns use the responsive grid until the reader customises it.
      if (compact.matches && !saved) {
        position.x = padding + (index % columns) * (width + gap);
        position.y = padding + Math.floor(index / columns) * rowHeight;
      }
      topZ = Math.max(topZ, position.z);
      paint(card, position);
      card.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
      card.setAttribute(
        "aria-label",
        `Thought ${card.querySelector("time")?.textContent ?? ""}. Use arrow keys to move; Shift for larger steps.`,
      );
    });
  }

  cards.forEach((card) => {
    card.addEventListener("pointerdown", (event) => {
      if (
        mobile.matches ||
        event.button !== 0 ||
        (event.target as HTMLElement).closest("a,button,input,textarea,select")
      )
        return;
      const position = positions.get(card);
      if (!position) return;
      event.preventDefault();
      card.focus({ preventScroll: true });
      drag = {
        card,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: position.x,
        y: position.y,
        moved: false,
      };
      card.setPointerCapture(event.pointerId);
      card.classList.add("is-dragging");
      paint(card, { ...position, rotation: 0, z: ++topZ });
    });
    card.addEventListener("pointermove", (event) => {
      if (drag?.card !== card || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      drag.moved ||= Math.abs(dx) + Math.abs(dy) > 3;
      const position = positions.get(card);
      if (!position) return;
      paint(card, { ...position, x: drag.x + dx, y: drag.y + dy });
    });
    card.addEventListener("pointerup", finishDrag);
    card.addEventListener("pointercancel", finishDrag);
    card.addEventListener("lostpointercapture", finishDrag);
    card.addEventListener("keydown", (event) => {
      if (
        mobile.matches ||
        event.target !== card ||
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      const position = positions.get(card);
      if (!position) return;
      event.preventDefault();
      const delta = event.shiftKey ? 24 : 8;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -delta;
      if (event.key === "ArrowRight") dx = delta;
      if (event.key === "ArrowUp") dy = -delta;
      if (event.key === "ArrowDown") dy = delta;
      paint(card, {
        ...position,
        x: position.x + dx,
        y: position.y + dy,
        z: ++topZ,
      });
      persist();
    });
  });
  shuffle.addEventListener("click", () => {
    if (mobile.matches) return;
    cards.forEach((card) =>
      paint(card, {
        x: Math.random() * (board.clientWidth - card.offsetWidth),
        y: Math.random() * (board.clientHeight - card.offsetHeight),
        rotation: Math.random() * 7 - 3.5,
        z: ++topZ,
      }),
    );
    status.textContent = "Thoughts shuffled.";
    persist();
  });
  tidy.addEventListener("click", () => {
    if (mobile.matches) return;
    const columns = compact.matches ? 2 : 4;
    const rowHeight = Math.max(...cards.map((card) => card.offsetHeight)) + 56;
    cards.forEach((card, index) =>
      paint(card, {
        x: 28 + (index % columns) * (card.offsetWidth + 24),
        y: 28 + Math.floor(index / columns) * rowHeight,
        rotation: 0,
        z: index,
      }),
    );
    status.textContent = "Thoughts tidied.";
    persist();
  });
  let previousWidth = 0;
  new ResizeObserver(() => {
    if (board.clientWidth !== previousWidth) {
      previousWidth = board.clientWidth;
      if (!frame) frame = requestAnimationFrame(layout);
    }
  }).observe(board);
  mobile.addEventListener("change", layout);
  compact.addEventListener("change", layout);
  window.addEventListener("pageshow", layout);
  layout();
}

for (const section of document.querySelectorAll<HTMLElement>("[data-thought-board]"))
  initializeBoard(section);
