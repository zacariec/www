"use client";

import { RevealText, FadeIn } from "@/components/molecules/reveal-text";

export function TimelineHeader() {
  return (
    <>
      <FadeIn>
        <p className="text-[10px] tracking-[3px] uppercase text-[#777777] mb-6 md:mb-8 font-[family-name:var(--font-space-grotesk)]">
          Stream of Consciousness
        </p>
      </FadeIn>
      <RevealText
        as="h1"
        className="text-[clamp(48px,10vw,100px)] text-[#000000] tracking-[-0.05em] font-[family-name:var(--font-space-grotesk)]"
        style={{ fontWeight: 700, lineHeight: 0.9 }}
      >
        TIMELINE<span className="text-[#c6c6c6]">.</span>
      </RevealText>
    </>
  );
}
