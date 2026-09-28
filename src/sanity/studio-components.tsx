import { useEffect, useState } from "react";
import { useDocumentOperation, useFormValue } from "sanity";
import { usePaneRouter } from "sanity/structure";
import type {
  ArrayOfObjectsInputProps,
  BlockProps,
  LayoutProps,
  PreviewProps,
  SanityDocument,
} from "sanity";
import {
  deriveSession,
  formatWritten,
  resolveTone,
  sessionId,
  TONES,
  WORDS_PER_MINUTE,
} from "../lib/session";
import { StudioDataProvider, canonicalId, paragraphs, useStudioData } from "./studio-data";
import type { StudioBlock, StudioSession } from "./studio-data";
import type { SanitySessionTape } from "../lib/sanity/types";
import { scan } from "../lib/zc-gl";
import "../styles/fonts.css";
import "./studio.css";

export function StudioLayout(props: LayoutProps) {
  return <StudioDataProvider>{props.renderDefault(props)}</StudioDataProvider>;
}

export function StudioLogo() {
  return (
    <span className="zc-studio-logo" aria-label="zcarr.dev">
      zc
      <span aria-hidden="true" />
    </span>
  );
}

export function StudioCanvas({
  kind,
  seed = 1,
  tone = "pink",
  sessions,
  highlight,
  animated = false,
  className = "",
}: {
  kind: "cover" | "cortex" | "lava";
  seed?: number;
  tone?: string;
  animated?: boolean;
  sessions?: Array<{ number: number; readTime: number; kind: "session" | "tape" }>;
  highlight?: number;
  className?: string;
}) {
  useEffect(() => {
    scan();
  }, [kind, seed, tone, sessions, highlight]);
  return (
    <canvas
      aria-hidden="true"
      className={`zc-studio-canvas ${className}`}
      data-zc={kind}
      data-seed={seed}
      data-fg="--ink"
      data-bg={kind === "cover" ? `--${tone}` : "transparent"}
      data-anim={String(animated)}
      data-sessions={sessions ? JSON.stringify(sessions) : undefined}
      data-highlight={highlight}
      data-colors="--pink,--sand,--lilac,--sage,--paper,--blue"
      data-drift="true"
    />
  );
}

export function SessionListPane() {
  const { derivedSessions, sessions, config, loading, error, refresh } = useStudioData();
  const { ChildLink } = usePaneRouter();
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const visible = derivedSessions
    .filter((session) =>
      `${session.title} ${sessionId(session.number)}`.toLocaleLowerCase().includes(query),
    )
    .sort((a, b) => b.number - a.number);
  return (
    <section className="zc-studio-pane zc-session-list" aria-label="Sessions">
      <h2>Sessions</h2>
      <label className="zc-studio-field" htmlFor="studio-session-search">
        Search sessions
      </label>
      <input
        id="studio-session-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {loading && <p role="status">Loading sessions…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}
      {!loading && !error && visible.length === 0 && <p>No matching sessions.</p>}
      <ul>
        {visible.map((session) => (
          <li key={session._id}>
            <ChildLink childId={session._id}>
              <SessionListPreview
                session={session}
                shift={config?.toneShift ?? 1}
                draft={Boolean(
                  sessions
                    .find((item) => canonicalId(item._id) === session._id)
                    ?._id.startsWith("drafts."),
                )}
              />
            </ChildLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionListPreview({
  session,
  draft,
  shift,
}: {
  session: SanitySessionTape;
  draft: boolean;
  shift: number;
}) {
  const tone = resolveTone(session.number, shift, new URLSearchParams(), session.toneOverride);
  return (
    <div className="zc-session-preview">
      <StudioCanvas
        kind="cover"
        seed={session.coverSeed}
        tone={tone}
        animated={session.kind === "tape"}
      />
      <div className="zc-preview-copy">
        <strong>{session.title}</strong>
        <div className="zc-studio-meta">
          <span className="zc-id-chip" style={{ background: `var(--${tone})` }}>
            {sessionId(session.number)}
          </span>
          <span>{session.kind}</span>
          <span>◷ {session.readTime} min</span>
          <span>{session.date ? formatWritten(session.date) : "Undated"}</span>
        </div>
      </div>
      <span
        className={`zc-publish-dot ${draft ? "is-draft" : ""}`}
        aria-label={draft ? "Draft" : "Published"}
        title={draft ? "Draft" : "Published"}
      />
    </div>
  );
}

export function StudioTimelinePreview(props: PreviewProps) {
  return props.renderDefault({
    ...props,
    media: <span className="zc-swatch" style={{ background: "var(--blue)" }} />,
  });
}

export function StudioSitePreview(props: PreviewProps) {
  return props.renderDefault({ ...props, media: <StudioLogo /> });
}

export function NumberedBodyInput(props: ArrayOfObjectsInputProps) {
  const id = canonicalId(String(useFormValue(["_id"]) ?? ""));
  const { comments } = useStudioData();
  const blocks = props.value as StudioBlock[] | undefined;
  const anchored = comments.filter(
    (comment) =>
      comment.session === id && comment.anchorIndex !== null && comment.status === "approved",
  ).length;
  return (
    <div className="zc-body-editor">
      <div className="zc-studio-meta">
        {paragraphs(blocks).length} ¶ · {anchored} anchored replies
      </div>
      {props.renderDefault(props)}
    </div>
  );
}

export function SessionBlock(props: BlockProps) {
  const id = canonicalId(String(useFormValue(["_id"]) ?? ""));
  const content = useFormValue(["content"]) as StudioBlock[] | undefined;
  const { comments } = useStudioData();
  const index = paragraphs(content).findIndex((block) => block._key === props.value._key) + 1;
  if (!index) return props.renderDefault(props);
  const count = comments.filter(
    (comment) =>
      comment.session === id && comment.anchorIndex === index && comment.status === "approved",
  ).length;
  return (
    <div className="zc-numbered-block">
      <span contentEditable={false} className="zc-paragraph-number">
        ¶{String(index).padStart(2, "0")}
        {count > 0 && <span className="zc-reply-count">↳ {count}</span>}
      </span>
      {props.renderDefault(props)}
    </div>
  );
}

export type SessionViewProps = { document: { displayed: Partial<SanityDocument> } };
export function ColourCoverPane({ document }: SessionViewProps) {
  const raw = document.displayed as StudioSession;
  const { derivedSessions, config } = useStudioData();
  const current = derivedSessions.find((session) => session._id === canonicalId(raw._id));
  const session = deriveSession(raw, current?.number ?? 1);
  const { patch } = useDocumentOperation(canonicalId(raw._id), "sessionTape");
  const shift = config?.toneShift ?? 1;
  const formula = resolveTone(session.number, shift, new URLSearchParams());
  const tone = raw.toneOverride ?? formula;
  return (
    <section className="zc-studio-pane">
      <div className="zc-colour-cover">
        <StudioCanvas
          kind="cover"
          seed={session.coverSeed}
          tone={tone}
          animated={session.kind === "tape"}
        />
      </div>
      <h2>Colour &amp; cover</h2>
      <div className="zc-studio-window">
        <header>Colour · formula</header>
        <div className="zc-window-body">
          <p className="zc-studio-meta">
            ({session.number} × 5 + {shift}) mod 6 = {TONES.indexOf(formula)}
          </p>
          <p>
            <span className="zc-swatch" style={{ background: `var(--${formula})` }} /> {formula}
          </p>
          <fieldset disabled={Boolean(patch.disabled)}>
            <legend>Override</legend>
            <div className="zc-swatch-picker">
              <button
                type="button"
                aria-pressed={!raw.toneOverride}
                onClick={() => patch.execute([{ unset: ["toneOverride"] }])}
              >
                auto
              </button>
              {TONES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  title={name}
                  aria-pressed={raw.toneOverride === name}
                  style={{ background: `var(--${name})` }}
                  onClick={() => patch.execute([{ set: { toneOverride: name } }])}
                >
                  {raw.toneOverride === name ? "✓" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="zc-studio-meta">Applies to: cover square · hero blot · STATE cell</p>
        </div>
      </div>
      <label className="zc-studio-field">
        Cover seed
        <input
          key={`${raw._id}:seed:${raw.coverSeed}`}
          type="number"
          disabled={Boolean(patch.disabled)}
          defaultValue={raw.coverSeed ?? session.number}
          onBlur={(event) => {
            const value = event.currentTarget.valueAsNumber;
            if (Number.isFinite(value)) patch.execute([{ set: { coverSeed: value } }]);
          }}
        />
      </label>
      <label className="zc-studio-field">
        Read time override · computed {Math.max(1, Math.ceil(session.wordCount / WORDS_PER_MINUTE))}{" "}
        min
        <input
          key={`${raw._id}:read:${raw.readTimeOverride}`}
          type="number"
          min={1}
          step={1}
          disabled={Boolean(patch.disabled)}
          defaultValue={raw.readTimeOverride ?? ""}
          onBlur={(event) => {
            const value = event.currentTarget.valueAsNumber;
            if (!event.currentTarget.value) patch.execute([{ unset: ["readTimeOverride"] }]);
            else if (Number.isInteger(value) && value > 0)
              patch.execute([{ set: { readTimeOverride: value } }]);
          }}
        />
      </label>
      <p className="zc-studio-meta">
        Changes are saved to the draft. Publish from Content to update the site.
      </p>
    </section>
  );
}

export function SessionSeoPane({ document }: SessionViewProps) {
  const raw = document.displayed as StudioSession & { dateModified?: string };
  const { patch } = useDocumentOperation(canonicalId(raw._id), "sessionTape");
  const fields = [
    { name: "title", label: "Title", value: raw.title },
    { name: "subtitle", label: "Dek · search description", value: raw.subtitle },
    { name: "excerpt", label: "Excerpt · description when no dek", value: raw.excerpt },
    { name: "dateModified", label: "Modified · ISO date and time", value: raw.dateModified },
  ];
  return (
    <section className="zc-studio-pane">
      <h2>SEO</h2>
      <div className="zc-studio-window">
        <header>Search preview</header>
        <div className="zc-window-body">
          <p className="zc-studio-meta">zcarr.dev/sessions/{raw.slug?.current}</p>
          <h3>{raw.title}</h3>
          <p>{raw.subtitle || raw.excerpt}</p>
        </div>
      </div>
      {fields.map((field) => (
        <label key={field.name} className="zc-studio-field">
          {field.label}
          <textarea
            key={`${raw._id}:${field.value}`}
            defaultValue={field.value ?? ""}
            disabled={Boolean(patch.disabled)}
            rows={field.name === "excerpt" ? 4 : 2}
            onBlur={(event) =>
              patch.execute(
                event.currentTarget.value
                  ? [{ set: { [field.name]: event.currentTarget.value } }]
                  : [{ unset: [field.name] }],
              )
            }
          />
        </label>
      ))}
      <p className="zc-studio-meta">
        Featured image and slug are edited in Content. Metadata is derived from these fields; no
        duplicate SEO copy.
      </p>
    </section>
  );
}
