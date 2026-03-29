"use client";

import { FadeIn, RevealText } from "@/components/molecules/reveal-text";
import { ScrollIndicator } from "@/components/molecules/scroll-indicator";

interface HeroSectionProps {
  subtitle?: string;
  heading?: string[];
  description?: string;
}

export const HeroSection = ({
  subtitle = "Journal \u2014 Est. 2024",
  heading = ["THOUGHTS,", "UNFILTERED."],
  description = "A personal archive of ideas, reflections, and long\u2011form writing on design, technology, and the quiet spaces in between.",
}: HeroSectionProps) => (
  <section className="min-h-[90vh] md:min-h-screen flex flex-col justify-end px-5 md:px-16 pb-12 md:pb-20 relative">
    <div
      className="absolute inset-0 opacity-[0.02] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    />

    <div className="relative">
      <FadeIn delay={0.2}>
        <p className="text-[10px] md:text-[11px] tracking-[3px] uppercase text-[#777777] mb-6 md:mb-8 font-[family-name:var(--font-space-grotesk)]">
          {subtitle}
        </p>
      </FadeIn>

      {heading.map((line, i) => (
        <RevealText
          key={i}
          as="h1"
          className="text-[clamp(44px,12vw,140px)] text-[#000000] tracking-[-0.05em] font-[family-name:var(--font-space-grotesk)]"
          delay={i * 0.1}
          style={{ fontWeight: 700, lineHeight: 0.88 }}
        >
          {i === heading.length - 1 ? (
            <>
              {line.replace(/\.$/, "")}
              <span className="text-[#c6c6c6]">.</span>
            </>
          ) : (
            line
          )}
        </RevealText>
      ))}

      <div className="mt-10 md:mt-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <FadeIn delay={0.4}>
          <p
            className="text-[15px] md:text-[18px] text-[#777777] max-w-[440px] font-[family-name:var(--font-inter)]"
            style={{ fontWeight: 300, lineHeight: 1.7 }}
          >
            {description}
          </p>
        </FadeIn>
      </div>
    </div>

    <ScrollIndicator />
  </section>
);
