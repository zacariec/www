import { useMemo, useState } from "react";
import { IntentLink } from "sanity/router";
import { resolveTone, sessionId } from "../lib/session";
import { StudioCanvas } from "./studio-components";
import { useStudioData } from "./studio-data";

export function CortexTool() {
  const { derivedSessions, config, loading, error, refresh } = useStudioData();
  const [highlight, setHighlight] = useState(-1);
  const sessions = useMemo(
    () => [...derivedSessions].sort((a, b) => a.number - b.number),
    [derivedSessions],
  );
  const nodes = useMemo(
    () => sessions.map(({ number, readTime, kind }) => ({ number, readTime, kind })),
    [sessions],
  );
  return (
    <section className="zc-cortex-tool">
      <div className="zc-cortex-main">
        <header className="zc-tool-heading">
          <h1>Cortex</h1>
          <span className="zc-studio-meta">
            One branch per session · {sessions.length} nodes ·{" "}
            {sessions.filter((session) => session.kind === "tape").length} tapes
          </span>
        </header>
        <StudioCanvas kind="cortex" sessions={nodes} highlight={highlight} />
        <p className="zc-cortex-caption zc-studio-meta">
          Fig 01 — Cortex · hover or focus a node to light its branch
        </p>
      </div>
      <aside className="zc-cortex-nodes">
        <h2>Nodes</h2>
        {loading && <p role="status">Loading sessions…</p>}
        {error && (
          <p role="alert">
            {error}{" "}
            <button type="button" onClick={() => void refresh()}>
              Retry
            </button>
          </p>
        )}
        <ol>
          {sessions.map((session, index) => {
            const tone = resolveTone(
              session.number,
              config?.toneShift ?? 1,
              new URLSearchParams(),
              session.toneOverride,
            );
            return (
              <li key={session._id}>
                <IntentLink
                  intent="edit"
                  params={{ id: session._id, type: "sessionTape" }}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseLeave={() => setHighlight(-1)}
                  onFocus={() => setHighlight(index)}
                  onBlur={() => setHighlight(-1)}
                >
                  <span className="zc-id-chip" style={{ background: `var(--${tone})` }}>
                    {sessionId(session.number)}
                  </span>
                  <span>{session.title}</span>
                  <span className="zc-studio-meta">
                    {session.kind} · ◷ {session.readTime} min
                  </span>
                </IntentLink>
              </li>
            );
          })}
        </ol>
      </aside>
    </section>
  );
}
