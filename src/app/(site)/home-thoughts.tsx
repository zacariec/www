"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BlobLink } from "@/components/atoms/blob-link";
import { FadeIn, RevealText } from "@/components/molecules/reveal-text";
import { StaggerChildren, StaggerItem } from "@/components/molecules/stagger-group";

import type { SanityTimelineEntry } from "@/lib/sanity/types";

interface HomeThoughtsProps {
  entries: SanityTimelineEntry[];
}

export const HomeThoughts = ({ entries }: HomeThoughtsProps) => (
  <section className="flex-1 min-w-0">
    <div className="flex items-baseline justify-between mb-12 md:mb-16">
      <RevealText>
        <h2
          className="text-[24px] md:text-[28px] tracking-[-1.5px] uppercase text-[#000000] font-[family-name:var(--font-space-grotesk)]"
          style={{ fontWeight: 700 }}
        >
          Recent Thoughts
        </h2>
      </RevealText>
      <FadeIn>
        <Link
          className="text-[10px] tracking-[2px] uppercase text-[#777777] hover:text-[#000000] no-underline transition-colors duration-300 flex items-center gap-2 font-[family-name:var(--font-space-grotesk)]"
          href="/timeline"
        >
          All
          <BlobLink color="#c6c6c6" size={16}>
            <ArrowRight className="w-3 h-3" />
          </BlobLink>
        </Link>
      </FadeIn>
    </div>

    <div className="max-w-[720px]">
      <StaggerChildren>
        {entries.map((entry, i) => (
          <StaggerItem key={entry._id || i}>
            <div
              className={`py-8 md:py-10 ${i < entries.length - 1 ? "border-b border-[rgba(0,0,0,0.04)]" : ""}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] tracking-[1.5px] uppercase text-[#ccc]">
                  {new Date(entry.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {entry.type === "linkedin" && (
                  <span className="text-[8px] tracking-[1.5px] uppercase text-[#777777] border border-[rgba(0,0,0,0.06)] px-2 py-0.5 rounded-full font-[family-name:var(--font-space-grotesk)]">
                    LinkedIn
                  </span>
                )}
              </div>
              <p
                className="text-[15px] md:text-[16px] text-[#1a1c1b] font-[family-name:var(--font-inter)]"
                style={{ lineHeight: 1.8 }}
              >
                {(entry.text.length > 280 ? `${entry.text.slice(0, 280)}...` : entry.text)
                  .split("\n")
                  .map((line, j) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={j}>
                      {line}
                      {j < entry.text.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                {entry.text.length > 280 && (
                  <BlobLink className="ml-1 inline-flex" color="#c6c6c6" size={10} visible={false}>
                    <Link
                      className="text-[#777777] hover:text-[#000000] transition-colors duration-300 no-underline text-[13px] font-[family-name:var(--font-space-grotesk)]"
                      href={`/timeline#${entry._id}`}
                    >
                      Read more
                    </Link>
                  </BlobLink>
                )}
              </p>
              <div className="flex gap-5 mt-4">
                <span className="text-[10px] text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
                  {entry.likes}
                </span>
                <span className="text-[10px] text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
                  {entry.comments} replies
                </span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </div>
  </section>
);
