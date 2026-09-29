import { TONES } from "./session";
import tokens from "../styles/tokens.css?raw";

import type { SanitySessionTape } from "./sanity/types";
import type { Tone } from "./session";

// Server-only: the stylesheet remains the single source of canonical tone colors.
const toneHex = Object.fromEntries(
  TONES.map((tone) => {
    const hex = new RegExp(`--${tone}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(tokens)?.[1];
    if (!hex) throw new Error(`Missing canonical color for ${tone}`);
    return [tone, hex];
  }),
) as Record<Tone, string>;

export function sessionLinkAttributes(
  session: Pick<SanitySessionTape, "number" | "toneOverride">,
  tone: string,
): {
  "data-tone": string;
  "data-session-number": number;
  "data-tone-override": Tone | undefined;
} {
  const color = TONES.includes(tone as Tone) ? (tone as Tone) : "pink";
  return {
    "data-tone": toneHex[color],
    "data-session-number": session.number,
    "data-tone-override": session.toneOverride,
  };
}
