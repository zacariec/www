/**
 * Post-fetch normaliser for PortableText content.
 *
 * Why this file exists
 * --------------------
 * Sanity's Portable Text editor doesn't auto-convert markdown shortcuts —
 * if a writer types `foo` they get the literal five characters back. We
 * want that to read as inline code on the page without forcing the writer
 * to highlight and press ⌘E for every backticked token.
 *
 * Scope
 * -----
 * Runs server-side before handing blocks to the PortableText serializer:
 *   - `` `...` ``  → add the `code` decorator
 *   - `**...**`    → add the `strong` decorator
 *
 * Only text spans with no existing marks are touched. If the author has
 * already applied a decorator, we respect it and leave the span alone.
 *
 * Single-asterisk italic is intentionally skipped — the false-positive
 * rate in prose ("*not* a test" vs "multiply 2 * 3") isn't worth the
 * save.
 */

// Minimal Portable Text types we need — avoids pulling in the full
// @portabletext/types just for this helper.
interface PortableTextSpan {
  _type: "span";
  _key?: string;
  text: string;
  marks?: string[];
}

interface PortableTextBlock {
  _type: "block";
  _key?: string;
  style?: string;
  children?: PortableTextSpan[];
  markDefs?: unknown[];
  [key: string]: unknown;
}

type PortableTextNode = PortableTextBlock | { _type: string; [key: string]: unknown };

const BACKTICK_PATTERN = /`([^`\n]+?)`/g;
const STRONG_PATTERN = /\*\*([^*\n]+?)\*\*/g;

function isBlock(node: PortableTextNode): node is PortableTextBlock {
  return node._type === "block";
}

function isSpan(child: unknown): child is PortableTextSpan {
  return (
    typeof child === "object" &&
    child !== null &&
    (child as { _type?: string })._type === "span" &&
    typeof (child as { text?: unknown }).text === "string"
  );
}

function makeKey(parentKey: string | undefined, index: number): string {
  return `${parentKey ?? "span"}-${index}`;
}

/**
 * Split a single text string by a regex, producing alternating plain and
 * matched segments. Each matched segment carries the capture group as its
 * text value so we can wrap it in a mark.
 */
function splitByPattern(text: string, pattern: RegExp): { text: string; matched: boolean }[] {
  const segments: { text: string; matched: boolean }[] = [];
  let lastIndex = 0;
  // Fresh regex to avoid lastIndex state leaking between calls.
  const regex = new RegExp(pattern.source, pattern.flags);
  let match = regex.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), matched: false });
    }
    segments.push({ text: match[1], matched: true });
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), matched: false });
  }
  return segments;
}

/**
 * Apply a pattern to a list of spans, wrapping matches in the given mark.
 * Spans that already carry decorators are passed through untouched so we
 * don't second-guess the author.
 */
function applyMarkPattern(
  spans: PortableTextSpan[],
  pattern: RegExp,
  mark: string,
): PortableTextSpan[] {
  const result: PortableTextSpan[] = [];
  spans.forEach((span, spanIndex) => {
    if (span.marks && span.marks.length > 0) {
      // Author already marked this span — leave it exactly as-is.
      result.push(span);
      return;
    }
    const segments = splitByPattern(span.text, pattern);
    if (segments.length <= 1) {
      result.push(span);
      return;
    }
    segments.forEach((segment, segIndex) => {
      if (segment.text.length === 0) return;
      result.push({
        _type: "span",
        _key: makeKey(span._key, spanIndex * 1000 + segIndex),
        text: segment.text,
        marks: segment.matched ? [mark] : [],
      });
    });
  });
  return result;
}

export function normalizeMarkdownShortcuts<T extends PortableTextNode>(
  content: T[] | undefined | null,
): T[] {
  if (!content || content.length === 0) return [];

  return content.map((node) => {
    if (!isBlock(node)) return node;
    const { children } = node;
    if (!children || children.length === 0) return node;

    const spans: PortableTextSpan[] = [];
    const passthrough: { index: number; child: unknown }[] = [];
    children.forEach((child, childIndex) => {
      if (isSpan(child)) {
        spans.push(child);
      } else {
        passthrough.push({ index: childIndex, child });
      }
    });

    let transformed = applyMarkPattern(spans, BACKTICK_PATTERN, "code");
    transformed = applyMarkPattern(transformed, STRONG_PATTERN, "strong");

    if (passthrough.length === 0) {
      return { ...node, children: transformed };
    }

    // Reinsert non-span children (hardBreak, etc.) at roughly their original
    // positions. Exact ordering for mixed content is ambiguous after a
    // split; this is close enough and in practice spans dominate.
    const rebuilt: unknown[] = [...transformed];
    passthrough.forEach((entry) => {
      rebuilt.splice(Math.min(entry.index, rebuilt.length), 0, entry.child);
    });
    return { ...node, children: rebuilt };
  });
}
