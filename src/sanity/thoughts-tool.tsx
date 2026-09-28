import { useEffect, useRef, useState } from "react";
import { useClient } from "sanity";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { StudioCanvas } from "./studio-components";
import { useStudioData } from "./studio-data";
import type { BoardPosition } from "./studio-data";

type Layout = Record<string, BoardPosition>;
export function ThoughtsBoardTool() {
  const { thoughts, loading, error: dataError, refresh } = useStudioData();
  const client = useClient({ apiVersion: "2026-03-26" });
  const [layout, setLayout] = useState<Layout>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const revisions = useRef<Record<string, string>>({});
  const changed = useRef(new Set<string>());
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    pointer: number;
    left: number;
    top: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    if (dirty) return;
    const next: Layout = {};
    const revs: Record<string, string> = {};
    thoughts.forEach((thought, index) => {
      next[thought._id] = {
        visible: thought.board?.visible ?? false,
        x: thought.board?.x ?? (index % 3) * 29 + 3,
        y: thought.board?.y ?? Math.floor(index / 3) * 190 + 30,
        rotation: thought.board?.rotation ?? 0,
        z: thought.board?.z ?? index + 1,
      };
      revs[thought._id] = thought._rev;
    });
    setLayout(next);
    revisions.current = revs;
  }, [thoughts, dirty]);

  function update(id: string, value: Partial<BoardPosition>) {
    changed.current.add(id);
    setDirty(true);
    setNotice(null);
    setLayout((current) => ({ ...current, [id]: { ...current[id], ...value } }));
  }
  function bounded(id: string, x: number, y: number): { x: number; y: number } {
    const area = board.current;
    const card = area?.querySelector<HTMLElement>(`[data-thought-id="${CSS.escape(id)}"]`);
    if (!area || !card) return { x: Math.max(0, Math.min(100, x)), y: Math.max(16, y) };
    const inset = 16;
    return {
      x: Math.max(
        (inset / area.clientWidth) * 100,
        Math.min(((area.clientWidth - card.offsetWidth - inset) / area.clientWidth) * 100, x),
      ),
      y: Math.max(inset, Math.min(area.clientHeight - card.offsetHeight - inset, y)),
    };
  }
  function pointerDown(event: PointerEvent<HTMLElement>, id: string) {
    if (busy || event.button !== 0 || !board.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    drag.current = {
      id,
      pointer: event.pointerId,
      left: event.clientX,
      top: event.clientY,
      x: (event.currentTarget.offsetLeft / board.current.clientWidth) * 100,
      y: event.currentTarget.offsetTop,
      moved: false,
    };
    event.currentTarget.classList.add("is-dragging");
    update(id, { z: Math.max(0, ...Object.values(layout).map((item) => item.z)) + 1 });
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || !board.current || active.pointer !== event.pointerId) return;
    const dx = event.clientX - active.left;
    const dy = event.clientY - active.top;
    if (Math.abs(dx) + Math.abs(dy) > 2) active.moved = true;
    update(
      active.id,
      bounded(active.id, active.x + (dx / board.current.clientWidth) * 100, active.y + dy),
    );
  }
  function pointerEnd(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    if (active.moved) update(active.id, { rotation: Math.random() * 7 - 3.5 });
    drag.current = null;
    event.currentTarget.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyMove(event: KeyboardEvent<HTMLElement>, id: string) {
    if (
      busy ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) ||
      !board.current
    )
      return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 8;
    const x =
      layout[id].x +
      ((event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0) /
        board.current.clientWidth) *
        100;
    const y =
      layout[id].y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0);
    update(id, bounded(id, x, y));
  }
  function arrange(shuffle: boolean) {
    if (!board.current) return;
    const area = board.current;
    const columns = Math.max(1, Math.floor(area.clientWidth / 300));
    const visible = thoughts.filter((thought) => layout[thought._id]?.visible);
    visible.forEach((thought, index) => {
      const x = shuffle
        ? Math.random() * 75
        : (((index % columns) * 300 + 20) / area.clientWidth) * 100;
      const y = shuffle
        ? Math.random() * (area.clientHeight - 200) + 20
        : Math.floor(index / columns) * 220 + 24;
      update(thought._id, {
        ...bounded(thought._id, x, y),
        rotation: shuffle ? Math.random() * 7 - 3.5 : 0,
        z: index + 1,
      });
    });
  }
  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      let transaction = client.transaction();
      for (const id of changed.current)
        transaction = transaction.patch(id, (patch) =>
          patch.ifRevisionId(revisions.current[id]).set({ board: layout[id] }),
        );
      await transaction.commit();
      changed.current.clear();
      setDirty(false);
      setNotice("Board saved. Entries that are drafts still need publishing in Structure.");
      await refresh();
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : String(cause)} Your layout is still here; reload the saved layout if another editor changed these entries.`,
      );
    } finally {
      setBusy(false);
    }
  }
  const visibleCount = thoughts.filter((thought) => layout[thought._id]?.visible).length;
  return (
    <section className="zc-board-tool">
      <div className="zc-board-main">
        <header className="zc-tool-heading">
          <h1>Thoughts board</h1>
          <span className="zc-studio-meta">
            Drag to set the default layout · arrow keys move a focused card
          </span>
        </header>
        <div className="zc-studio-board" ref={board}>
          <StudioCanvas kind="lava" />
          {thoughts
            .filter((thought) => layout[thought._id]?.visible)
            .map((thought) => {
              const position = layout[thought._id];
              return (
                <article
                  key={thought._id}
                  data-thought-id={thought._id}
                  className="zc-board-card"
                  tabIndex={0}
                  aria-label={`${thought.text.slice(0, 80)}. Use arrow keys to move.`}
                  style={
                    {
                      left: `clamp(16px, ${position.x}%, calc(100% - 276px))`,
                      top: `clamp(16px, ${position.y}px, calc(100% - 190px))`,
                      transform: `rotate(${position.rotation}deg)`,
                      zIndex: position.z,
                    } as CSSProperties
                  }
                  onPointerDown={(event) => pointerDown(event, thought._id)}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerEnd}
                  onPointerCancel={pointerEnd}
                  onLostPointerCapture={pointerEnd}
                  onKeyDown={(event) => keyMove(event, thought._id)}
                >
                  <header>
                    <time>{thought.date?.slice(0, 10)}</time>
                    <span>
                      {Math.round(position.x)}% · {Math.round(position.y)}px ·{" "}
                      {position.rotation.toFixed(1)}°
                    </span>
                  </header>
                  <p>{thought.text}</p>
                </article>
              );
            })}
          {!loading && !visibleCount && (
            <p className="zc-board-empty">Select the thoughts to show on the board.</p>
          )}
        </div>
      </div>
      <aside className="zc-board-sidebar">
        <h2>
          On the board · {visibleCount} of {thoughts.length}
        </h2>
        {loading && <p role="status">Loading thoughts…</p>}
        <div className="zc-thought-options">
          {thoughts.map((thought) => (
            <label key={thought._id}>
              <input
                type="checkbox"
                checked={layout[thought._id]?.visible ?? false}
                disabled={busy}
                onChange={(event) => update(thought._id, { visible: event.currentTarget.checked })}
              />
              <span>{thought.text}</span>
              {thought._id.startsWith("drafts.") && <small>draft</small>}
            </label>
          ))}
        </div>
        <div className="zc-board-controls">
          <div className="zc-tool-actions">
            <button type="button" disabled={busy || !visibleCount} onClick={() => arrange(false)}>
              Tidy
            </button>
            <button type="button" disabled={busy || !visibleCount} onClick={() => arrange(true)}>
              Shuffle
            </button>
            <button
              type="button"
              className="zc-primary"
              disabled={!dirty || busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save layout"}
            </button>
          </div>
          {dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                changed.current.clear();
                setDirty(false);
                setError(null);
                void refresh();
              }}
            >
              Reload saved layout
            </button>
          )}
          {(error || dataError) && <p role="alert">{error || dataError}</p>}
          {notice && <p role="status">{notice}</p>}
        </div>
      </aside>
    </section>
  );
}
