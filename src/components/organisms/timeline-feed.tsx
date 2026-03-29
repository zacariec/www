"use client";

import { useState } from "react";

import { FadeIn } from "@/components/molecules/reveal-text";
import { StaggerChildren, StaggerItem } from "@/components/molecules/stagger-group";
import { TimelineEntryCard } from "@/components/molecules/timeline-entry";

type FilterType = "all" | "thought" | "linkedin" | "reflection";

interface TimelineEntry {
  id: string;
  date: string;
  text: string;
  type: "thought" | "linkedin" | "reflection";
  likes: number;
  comments: number;
  url?: string;
}

interface TimelineFeedProps {
  entries: TimelineEntry[];
}

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Thoughts", value: "thought" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Reflections", value: "reflection" },
];

export const TimelineFeed = ({ entries }: TimelineFeedProps) => {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  return (
    <>
      {/* Filters */}
      <FadeIn delay={0.2}>
        <div className="flex gap-4 md:gap-6 mt-12 md:mt-16 mb-12 md:mb-16 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              type="button"
              className={`text-[10px] tracking-[2px] uppercase transition-all duration-300 cursor-pointer bg-transparent border px-4 py-2 rounded-full whitespace-nowrap font-[family-name:var(--font-space-grotesk)] ${
                filter === f.value
                  ? "text-[#e2e2e2] bg-[#000000] border-[#000000]"
                  : "text-[#777777] border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.15)] hover:text-[#1a1c1b]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Timeline */}
      <div className="max-w-[720px]">
        <StaggerChildren>
          {filtered.map((entry, i) => {
            const date = new Date(entry.date);
            const prevDate = i > 0 ? new Date(filtered[i - 1].date) : null;
            const showMonth =
              date.getMonth() !== prevDate?.getMonth() ||
              date.getFullYear() !== prevDate.getFullYear();

            return (
              <StaggerItem key={entry.id}>
                {showMonth ? (
                  <div className="mt-10 mb-4 first:mt-0">
                    <span
                      className="text-[11px] tracking-[2.5px] uppercase text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]"
                      style={{ fontWeight: 500 }}
                    >
                      {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  </div>
                ) : null}
                <div id={entry.id}>
                  <TimelineEntryCard
                    comments={entry.comments}
                    date={entry.date}
                    likes={entry.likes}
                    text={entry.text}
                    type={entry.type}
                    url={entry.url}
                  />
                </div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </div>
    </>
  );
};
