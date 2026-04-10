import type { PortableTextBlock } from '@portabletext/react';

interface SpanLike {
  text?: string;
}

interface BlockLike {
  _type?: string;
  children?: SpanLike[];
}

/** Count words in a PortableText body. Skips images and other non-block types. */
export function countWords(content: unknown): number {
  if (!Array.isArray(content)) return 0;
  let total = 0;
  for (const block of content as PortableTextBlock[]) {
    const b = block as BlockLike;
    if (b?._type !== 'block') continue;
    const children = b.children ?? [];
    for (const span of children) {
      if (typeof span.text === 'string') {
        total += span.text.trim().split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return total;
}
