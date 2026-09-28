"use client";

import { useEffect, useState } from "react";

import {
  PreferenceRow,
  PreferenceSegments,
  PreferenceToggle,
  PreferenceWindow,
} from "@/components/molecules/preference-controls";
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  resetPreferences,
  setPreferences,
  subscribePreferences,
} from "@/lib/preferences";
import { resolveTone, sessionId } from "@/lib/session";

import { PreferencesAccount } from "./preferences-account";

import type { CSSProperties } from "react";

import type { ReaderProvider } from "@/lib/auth/auth";
import type { ReaderPreferences } from "@/lib/preferences";
import type { Tone } from "@/lib/session";

interface PreferencesPanelProps {
  sessions: { number: number; toneOverride?: Tone }[];
  toneShift: number;
  sampleText: string;
  providers: ReaderProvider[];
}

interface DeviceData {
  highlights: number;
  customBoard: boolean;
  available: boolean;
}

function readDeviceData(): DeviceData {
  let highlights = 0;
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith("zc:highlights:")) continue;
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (Array.isArray(value))
          highlights += new Set(value.filter((item) => Number.isInteger(item) && item > 0)).size;
      } catch {
        // A malformed entry is still removable, but is not a saved highlight.
      }
    }
    return {
      highlights,
      customBoard: localStorage.getItem("zc:thought-board:v1") !== null,
      available: true,
    };
  } catch {
    return { highlights: 0, customBoard: false, available: false };
  }
}

const sizes = ["S", "M", "L"] as const;
const motions = ["System", "On", "Still"] as const;
const accents = ["pink", "blue", "sand", "sage"] as const;
const shifts = [0, 1, 2, 3, 4, 5] as const;
const cursorNames = ["default", "pointer", "text", "grab", "anchor", "not-allowed"] as const;

function commentCountText(signedIn: boolean, count: number | null): string {
  if (!signedIn) return "sign in";
  return count === null ? "unavailable" : `${count} posted`;
}

export function PreferencesPanel({
  sessions,
  toneShift,
  sampleText,
  providers,
}: PreferencesPanelProps) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState("defaults");
  const [notice, setNotice] = useState("");
  const [params, setParams] = useState(new URLSearchParams());
  const [device, setDevice] = useState<DeviceData>({
    highlights: 0,
    customBoard: false,
    available: true,
  });
  const [confirm, setConfirm] = useState<"highlights" | "board" | "all" | null>(null);

  useEffect(() => {
    const refresh = () => {
      setPrefs(getPreferences());
      setDevice(readDeviceData());
      try {
        setSaved(localStorage.getItem("zc.prefs") ? "saved" : "defaults");
      } catch {
        setSaved("this visit");
      }
    };
    refresh();
    setParams(new URLSearchParams(window.location.search));
    setReady(true);
    const unsubscribe = subscribePreferences(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function update(patch: Partial<ReaderPreferences>) {
    const persisted = setPreferences(patch);
    setPrefs(getPreferences());
    setSaved(persisted ? "saved" : "this visit");
    setNotice(
      persisted
        ? "Saved on this device."
        : "Storage is unavailable. Changes apply to this visit only.",
    );
  }

  function reset() {
    const persisted = resetPreferences();
    setPrefs(getPreferences());
    setSaved(persisted ? "defaults" : "this visit");
    setNotice(
      persisted
        ? "Device preferences reset. Account and email settings are unchanged."
        : "Defaults restored for this visit. Browser storage is unavailable.",
    );
  }

  function clearDeviceData() {
    const action = confirm;
    try {
      if (action === "highlights" || action === "all") {
        const keys: string[] = [];
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (key?.startsWith("zc:highlights:")) keys.push(key);
        }
        keys.forEach((key) => localStorage.removeItem(key));
      }
      if (action === "board" || action === "all") localStorage.removeItem("zc:thought-board:v1");
      if (action === "all") reset();
      setDevice(readDeviceData());
      const notices = {
        all: "Device preferences, highlights and board layout cleared. Your account, comments and email settings are unchanged.",
        board: "Thoughts board restored to the published layout.",
        highlights: "Saved highlights cleared from this device.",
      };
      if (action) setNotice(notices[action]);
    } catch {
      setNotice("Browser storage is unavailable. Could not clear saved data.");
    }
    setConfirm(null);
  }

  const queryShift = params.get("shift");
  const effectiveShift =
    queryShift !== null && /^[0-5]$/.test(queryShift)
      ? shifts[Number(queryShift)]
      : (prefs.shift ?? shifts[toneShift]);
  const boardLabel = device.customBoard ? "custom" : "default";

  return (
    <div className="preferences-panel">
      <div className="preferences-settings zc-container">
        <div className="preferences-controls">
          <PreferenceWindow note="sessions + tapes" title="[a] Reading">
            <PreferenceRow description="Session body text · 17 / 19 / 21px" title="Text size">
              <PreferenceSegments
                disabled={!ready}
                label="Text size"
                onChange={(size) => update({ size })}
                options={sizes.map((value) => ({ value, label: value }))}
                value={prefs.size}
              />
            </PreferenceRow>
            <div
              className="preference-reading-sample"
              style={
                { "--sample-size": `${{ S: 17, M: 19, L: 21 }[prefs.size]}px` } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                className="mono"
                style={{ visibility: prefs.nums ? "visible" : "hidden" }}
              >
                ¶01
              </span>
              <p>{sampleText}</p>
            </div>
            <PreferenceRow
              description="¶ anchors in the margin. You can still focus or tap an anchor to highlight or comment."
              title="Paragraph numbers"
            >
              <PreferenceToggle
                checked={prefs.nums}
                disabled={!ready}
                label="Paragraph numbers"
                onChange={(nums) => update({ nums })}
              />
            </PreferenceRow>
            <PreferenceRow
              description="The % read window beside the article, desktop only."
              title="Reading panel"
            >
              <PreferenceToggle
                checked={prefs.panel}
                disabled={!ready}
                label="Reading panel"
                onChange={(panel) => update({ panel })}
              />
            </PreferenceRow>
          </PreferenceWindow>

          <PreferenceWindow note="WebGL · 30fps cap" title="[b] Motion">
            <PreferenceRow
              description="Cortex drift, moving blots, animated covers. System follows your OS reduce-motion setting."
              title="Pixel animations"
            >
              <PreferenceSegments
                disabled={!ready}
                label="Pixel animations"
                onChange={(motion) => update({ motion })}
                options={motions.map((value) => ({ value, label: value }))}
                value={prefs.motion}
              />
            </PreferenceRow>
            <PreferenceRow
              description="Cycles the social links in the header and footer."
              title="Elsewhere flipper"
            >
              <PreferenceToggle
                checked={prefs.flip}
                disabled={!ready}
                label="Elsewhere flipper"
                onChange={(flip) => update({ flip })}
              />
            </PreferenceRow>
          </PreferenceWindow>

          <PreferenceWindow note="16px · 2× bitmaps" title="[c] Cursors">
            <PreferenceRow
              description="Off falls back to your system cursors."
              title="Pixel cursors"
            >
              <PreferenceToggle
                checked={prefs.cursors}
                disabled={!ready}
                label="Pixel cursors"
                onChange={(cursors) => update({ cursors })}
              />
            </PreferenceRow>
            <PreferenceRow description="The coloured square in each cursor." title="Accent">
              <div aria-label="Cursor accent" className="preference-swatches" role="group">
                {accents.map((accent) => (
                  <button
                    key={accent}
                    aria-label={accent}
                    aria-pressed={prefs.accent === accent}
                    disabled={!ready}
                    onClick={() => update({ accent })}
                    type="button"
                  >
                    <span aria-hidden="true" style={{ background: `var(--${accent})` }} />
                  </button>
                ))}
              </div>
            </PreferenceRow>
            <div className="preference-cursor-samples mono">
              {cursorNames.map((cursor) => (
                <span
                  key={cursor}
                  style={{
                    cursor: `var(--cur-${cursor},${cursor === "anchor" ? "crosshair" : cursor})`,
                  }}
                >
                  {cursor}
                </span>
              ))}
            </div>
            <p className="preference-footnote mono">
              Hover a cell to try it. Touchscreens keep their native pointer behavior.
            </p>
          </PreferenceWindow>

          <PreferenceWindow note="mirrors ?shift=" title="[d] Post colour">
            <PreferenceRow
              description="Moves every post along the palette. Same as ?shift= in the URL; the URL wins if both are set."
              title="Palette shift"
            >
              <PreferenceSegments
                disabled={!ready}
                label="Palette shift"
                onChange={(shift) => update({ shift })}
                options={shifts.map((value) => ({ value, label: String(value) }))}
                value={effectiveShift}
              />
            </PreferenceRow>
            {queryShift !== null && /^[0-5]$/.test(queryShift) && (
              <p className="preference-footnote mono">
                This URL is using shift {queryShift}. Your saved choice is{" "}
                {prefs.shift ?? "the site default"}.
              </p>
            )}
            <div aria-label="Published session colours" className="preference-palette">
              {sessions.map((session) => {
                const tone = resolveTone(
                  session.number,
                  prefs.shift ?? toneShift,
                  params,
                  session.toneOverride,
                );
                return (
                  <div key={session.number}>
                    <span
                      className="preference-palette__colour"
                      style={{ background: `var(--${tone})` }}
                      title={`${sessionId(session.number)} · ${tone}`}
                    />
                    <span className="mono">{sessionId(session.number)}</span>
                  </div>
                );
              })}
            </div>
          </PreferenceWindow>
        </div>

        <aside aria-label="Saved device preferences" className="preferences-snapshot">
          <PreferenceWindow note={saved} title="prefs.json">
            <pre>{JSON.stringify(prefs, null, 2)}</pre>
            <div className="preferences-snapshot__footer mono">
              <span>localStorage · zc.prefs</span>
              <button
                aria-label="Reset device preferences"
                className="preference-button"
                disabled={!ready}
                onClick={reset}
                type="button"
              >
                Reset
              </button>
            </div>
          </PreferenceWindow>
          <p className="preference-status mono" role="status">
            {notice}
          </p>
        </aside>
      </div>

      <section className="preferences-account-section">
        <canvas
          aria-hidden="true"
          className="preferences-account-blot"
          data-anim="true"
          data-bg="transparent"
          data-fg="--pink"
          data-seed="131"
          data-zc="blot"
        />
        <div className="zc-container preferences-account-content">
          <header className="preferences-section-heading">
            <span className="mono">[06]</span>
            <h2>Account &amp; data.</h2>
          </header>
          <PreferencesAccount providers={providers}>
            {({ signedIn, commentCount, exporting, exportComments }) => (
              <PreferenceWindow
                className="preference-data-window"
                note="this device"
                title="Your data"
              >
                <dl className="preference-data-list mono">
                  <div>
                    <dt>Highlights</dt>
                    <dd>{device.available ? `${device.highlights} marked` : "unavailable"}</dd>
                    <dd>
                      <button
                        aria-label="Clear saved highlights"
                        className="preference-button"
                        disabled={!ready || !device.available}
                        onClick={() => setConfirm("highlights")}
                        type="button"
                      >
                        Clear
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Thoughts board layout</dt>
                    <dd>{device.available ? boardLabel : "unavailable"}</dd>
                    <dd>
                      <button
                        aria-label="Reset thoughts board layout"
                        className="preference-button"
                        disabled={!ready || !device.available}
                        onClick={() => setConfirm("board")}
                        type="button"
                      >
                        Reset
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Your comments</dt>
                    <dd>{commentCountText(signedIn, commentCount)}</dd>
                    <dd>
                      <button
                        className="preference-button"
                        disabled={!signedIn || exporting || commentCount === null}
                        onClick={exportComments}
                        type="button"
                      >
                        {exporting ? "Exporting…" : "Export .json"}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Everything on this device</dt>
                    <dd>prefs, marks, board</dd>
                    <dd>
                      <button
                        className="preference-button preference-button--pink"
                        disabled={!ready || !device.available}
                        onClick={() => setConfirm("all")}
                        type="button"
                      >
                        Clear all
                      </button>
                    </dd>
                  </div>
                </dl>
                {confirm ? (
                  <div className="preference-confirmation">
                    <p>
                      {
                        {
                          all: "Clear device preferences, highlights and your board layout? Your account, posted comments and newsletter subscription will stay unchanged.",
                          board: "Reset your saved thoughts board layout?",
                          highlights: "Clear all highlights saved on this device?",
                        }[confirm]
                      }
                    </p>
                    <div className="preference-actions">
                      <button
                        className="preference-button preference-button--pink"
                        onClick={clearDeviceData}
                        type="button"
                      >
                        Yes, clear
                      </button>
                      <button
                        className="preference-button"
                        onClick={() => setConfirm(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </PreferenceWindow>
            )}
          </PreferencesAccount>
        </div>
      </section>
    </div>
  );
}
