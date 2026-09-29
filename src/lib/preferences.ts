export interface ReaderPreferences {
  size: "S" | "M" | "L";
  nums: boolean;
  panel: boolean;
  motion: "System" | "On" | "Still";
  flip: boolean;
  cursors: boolean;
  accent: "pink" | "blue" | "sand" | "sage";
  shift: 0 | 1 | 2 | 3 | 4 | 5 | null;
}

export const DEFAULT_PREFERENCES: ReaderPreferences = Object.freeze({
  size: "M",
  nums: true,
  panel: true,
  motion: "System",
  flip: true,
  cursors: true,
  accent: "pink",
  shift: null,
});

interface PreferenceStore {
  get: () => ReaderPreferences;
  set: (patch: Partial<ReaderPreferences>) => boolean;
  reset: () => boolean;
}

type PreferenceWindow = Window & { zcPreferences?: PreferenceStore };

/** Self-contained so BaseLayout can execute this exact implementation before first paint. */
export function bootstrapPreferences(defaults: ReaderPreferences): PreferenceStore | null {
  if (typeof window === "undefined") return null;
  const host = window as PreferenceWindow;
  if (host.zcPreferences) return host.zcPreferences;

  const key = "zc.prefs";
  const root = document.documentElement;
  const tones = ["pink", "blue", "sand", "sage", "lilac", "apricot"];
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let explicitSize = false;

  function validate(value: unknown, fallback: ReaderPreferences): ReaderPreferences {
    const input =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return Object.freeze({
      size:
        input.size === "S" || input.size === "M" || input.size === "L" ? input.size : fallback.size,
      nums: typeof input.nums === "boolean" ? input.nums : fallback.nums,
      panel: typeof input.panel === "boolean" ? input.panel : fallback.panel,
      motion:
        input.motion === "System" || input.motion === "On" || input.motion === "Still"
          ? input.motion
          : fallback.motion,
      flip: typeof input.flip === "boolean" ? input.flip : fallback.flip,
      cursors: typeof input.cursors === "boolean" ? input.cursors : fallback.cursors,
      accent:
        input.accent === "pink" ||
        input.accent === "blue" ||
        input.accent === "sand" ||
        input.accent === "sage"
          ? input.accent
          : fallback.accent,
      shift:
        input.shift === null ||
        input.shift === 0 ||
        input.shift === 1 ||
        input.shift === 2 ||
        input.shift === 3 ||
        input.shift === 4 ||
        input.shift === 5
          ? input.shift
          : fallback.shift,
    });
  }

  function parse(raw: string | null): ReaderPreferences {
    explicitSize = false;
    try {
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (value && typeof value === "object" && !Array.isArray(value) && "size" in value) {
        explicitSize = value.size === "S" || value.size === "M" || value.size === "L";
      }
      return validate(value, defaults);
    } catch {
      return validate(null, defaults);
    }
  }

  function load(): ReaderPreferences {
    try {
      return parse(window.localStorage.getItem(key));
    } catch {
      return validate(null, defaults);
    }
  }

  let current = load();

  function apply(notify = true): void {
    const queryShift = new URLSearchParams(window.location.search).get("shift");
    const configuredShift = Number(root.dataset.toneShift);
    const baseShift =
      Number.isInteger(configuredShift) && configuredShift >= 0 && configuredShift <= 5
        ? configuredShift
        : 1;
    root.dataset.prefSize = current.size;
    root.dataset.prefNums = String(current.nums);
    root.dataset.prefPanel = String(current.panel);
    root.dataset.prefFlip = String(current.flip);
    root.dataset.prefCursors = String(current.cursors);
    root.dataset.cursorAccent = current.accent;
    root.dataset.prefMotion =
      current.motion === "Still" || (current.motion === "System" && media.matches) ? "still" : "on";
    let readSize = "19px";
    if (current.size === "S") readSize = "17px";
    else if (current.size === "L") readSize = "21px";
    root.style.setProperty("--read-size", readSize);
    // Untouched mobile typography stays 17px; choosing S/M/L uses the exact requested size.
    root.style.setProperty("--read-size-mobile", explicitSize ? readSize : "17px");
    root.style.setProperty("--pnum", current.nums ? "visible" : "hidden");
    const shift =
      queryShift !== null && /^[0-5]$/.test(queryShift)
        ? Number(queryShift)
        : (current.shift ?? baseShift);
    root.dataset.paletteShift = String(shift);
    for (let slot = 0; slot < tones.length; slot++) {
      root.style.setProperty(`--post-palette-${slot}`, `var(--${tones[(slot + shift) % 6]})`);
    }
    for (const label of document.querySelectorAll<HTMLElement>("[data-post-tone-label]")) {
      const number = Number(label.dataset.postNumber);
      label.textContent = label.dataset.fixedTone || tones[(((number * 5 + shift) % 6) + 6) % 6];
    }
    if (notify) window.dispatchEvent(new CustomEvent("zc:preferences"));
  }

  const store: PreferenceStore = {
    get: () => current,
    set(patch) {
      if (patch && (patch.size === "S" || patch.size === "M" || patch.size === "L"))
        explicitSize = true;
      current = validate(patch, current);
      let saved = true;
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ ...current, size: explicitSize ? current.size : undefined }),
        );
      } catch {
        saved = false;
      }
      apply();
      return saved;
    },
    reset() {
      explicitSize = false;
      current = validate(null, defaults);
      let saved = true;
      try {
        window.localStorage.removeItem(key);
      } catch {
        saved = false;
      }
      apply();
      return saved;
    },
  };
  host.zcPreferences = store;
  apply(false);
  media.addEventListener("change", () => apply());
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    current = parse(event.key === null ? null : event.newValue);
    apply();
  });
  // Restore incoming cross-tab changes even when this document was in the back/forward cache.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    try {
      current = parse(window.localStorage.getItem(key));
    } catch {
      // A blocked store must not erase choices made for this visit.
    }
    apply();
  });
  document.addEventListener("astro:after-swap", () => apply());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => apply(), { once: true });
  }
  return store;
}

export function getPreferences(): ReaderPreferences {
  return bootstrapPreferences(DEFAULT_PREFERENCES)?.get() ?? DEFAULT_PREFERENCES;
}

export function setPreferences(patch: Partial<ReaderPreferences>): boolean {
  return bootstrapPreferences(DEFAULT_PREFERENCES)?.set(patch) ?? false;
}

export function resetPreferences(): boolean {
  return bootstrapPreferences(DEFAULT_PREFERENCES)?.reset() ?? false;
}

export function subscribePreferences(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  bootstrapPreferences(DEFAULT_PREFERENCES);
  window.addEventListener("zc:preferences", listener);
  return () => window.removeEventListener("zc:preferences", listener);
}
