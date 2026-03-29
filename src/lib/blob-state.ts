/**
 * Shared mutable state between BlobCursor and BlobLogo/BlobArrow instances.
 * Both read/write at animation-frame rate, so we use a plain object
 * (not React state) to avoid re-renders.
 */

export interface LogoRegistration {
  id: string;
  getRect: () => DOMRect | null;
  visualRadius: number;
  type: "logo" | "arrow" | "nav";
}

export const blobState = {
  cursorX: -100,
  cursorY: -100,
  mouseX: -100,
  mouseY: -100,
  velocityX: 0,
  velocityY: 0,
  attachedTo: null as string | null,
  mergeAmount: 0,
  targetRadius: 14,
  targetType: "logo" as "logo" | "arrow" | "nav",
  /** Pull offset — how far the attached blob leans toward the cursor */
  pullOffsetX: 0,
  pullOffsetY: 0,
  /** Whether the cursor is currently over the footer */
  inFooter: false,
  logos: [] as LogoRegistration[],
};

export function registerLogo(reg: LogoRegistration) {
  blobState.logos.push(reg);
  return () => {
    blobState.logos = blobState.logos.filter((l) => l.id !== reg.id);
    if (blobState.attachedTo === reg.id) {
      blobState.attachedTo = null;
      blobState.mergeAmount = 0;
      blobState.pullOffsetX = 0;
      blobState.pullOffsetY = 0;
    }
  };
}
