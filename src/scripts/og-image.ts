import { refresh } from "@/lib/zc-gl";

const nextFrame = async () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

function fitText(element: HTMLElement, maxHeight = Number.POSITIVE_INFINITY): void {
  const maxLines = Number(element.dataset.maxLines ?? 3);
  const minSize = Number(element.dataset.minSize ?? 24);
  const declaredHeight = Number(element.dataset.maxHeight ?? Number.POSITIVE_INFINITY);
  const limit = Math.min(maxHeight, declaredHeight);
  let size = Number.parseFloat(getComputedStyle(element).fontSize);
  const fits = () => {
    const style = getComputedStyle(element);
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const contentHeight = element.clientHeight - padding;
    return (
      contentHeight <= Math.min(Number.parseFloat(style.lineHeight) * maxLines, limit) + 1 &&
      element.scrollWidth <= element.clientWidth + 1
    );
  };
  while (size > minSize && !fits()) {
    size -= 1;
    element.style.fontSize = `${size}px`;
  }
  // Preserve complete titles at every usable size; only pathological copy needs a clamp.
  if (!fits()) {
    element.dataset.ogOverflow = "true";
    element.style.setProperty("--og-max-lines", String(maxLines));
  }
}

function hasPaint(canvas: HTMLCanvasElement): boolean {
  if (!canvas.width || !canvas.height) return false;
  // An empty collection correctly produces a cortex with no branches or painted pixels.
  if (canvas.dataset.zc === "cortex" && canvas.dataset.sessions === "[]") return true;
  const context = canvas.getContext("2d");
  if (!context) return false;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 0) return true;
  }
  return false;
}

async function prepareImage(): Promise<void> {
  const frame = document.querySelector<HTMLElement>("[data-og-frame]");
  if (!frame) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (!reducedMotion.matches) {
    await new Promise<void>((resolve) => {
      const onChange = () => {
        if (!reducedMotion.matches) return;
        reducedMotion.removeEventListener("change", onChange);
        resolve();
      };
      reducedMotion.addEventListener("change", onChange);
    });
  }
  await Promise.all([
    document.fonts.load('500 100px "Host Grotesk"'),
    document.fonts.load('400 20px "IBM Plex Mono"'),
    document.fonts.ready,
  ]);
  if (
    !document.fonts.check('500 100px "Host Grotesk"') ||
    !document.fonts.check('400 20px "IBM Plex Mono"')
  ) {
    throw new Error("Local OG fonts did not load");
  }
  for (const element of frame.querySelectorAll<HTMLElement>("[data-og-fit]")) fitText(element);
  const copy = frame.querySelector<HTMLElement>(".og-session-copy");
  const title = copy?.querySelector<HTMLElement>(".og-session-title");
  const chips = frame.querySelector<HTMLElement>(".og-chips");
  if (copy && title && chips) {
    const overflow = copy.getBoundingClientRect().bottom - (chips.getBoundingClientRect().top - 22);
    if (overflow > 0) fitText(title, title.getBoundingClientRect().height - overflow);
  }
  refresh(frame);
  // ResizeObserver and the shared scanner both schedule painting. Observe the resulting
  // pixels, not a sleep: capture must never race fonts, layout, or a blank canvas.
  const canvases = [...frame.querySelectorAll<HTMLCanvasElement>("canvas[data-zc]")];
  await nextFrame();
  await nextFrame();
  await new Promise<void>((resolve) => {
    const onPaint = () => {
      if (canvases.every(hasPaint)) resolve();
      else requestAnimationFrame(onPaint);
    };
    onPaint();
  });
  document.documentElement.dataset.ogReady = "true";
}

prepareImage().catch((error: unknown) => {
  document.documentElement.dataset.ogError = error instanceof Error ? error.message : String(error);
});
