"use client";

import { Heart, MessageCircle } from "lucide-react";
import { motion } from "motion/react";

import { BlobArrow } from "@/components/atoms/blob-arrow";
import { TypeBadge } from "@/components/atoms/type-badge";

interface TimelineEntryProps {
  date: string;
  text: string;
  type: "thought" | "linkedin" | "reflection";
  likes: number;
  comments: number;
  url?: string;
}

export const TimelineEntryCard = ({
  date,
  text,
  type,
  likes,
  comments,
  url,
}: TimelineEntryProps) => (
  <motion.div
    className="py-7 md:py-8 border-b border-[rgba(0,0,0,0.03)] group"
    transition={{ duration: 0.3 }}
    whileHover={{ x: 4 }}
  >
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] tracking-[1px] text-[#c6c6c6] tabular-nums font-[family-name:var(--font-space-grotesk)]">
        {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
      <TypeBadge type={type} />
    </div>
    <p
      className="text-[14px] md:text-[16px] text-[#1a1c1b] font-[family-name:var(--font-inter)]"
      style={{ lineHeight: 1.8 }}
    >
      {text}
    </p>
    <div className="flex items-center gap-5 mt-4">
      <button
        className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]"
        type="button"
      >
        <Heart className="w-3 h-3" /> {likes}
      </button>
      <button
        className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]"
        type="button"
      >
        <MessageCircle className="w-3 h-3" /> {comments}
      </button>
      {url ? (
        <a
          className="flex items-center gap-2 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 no-underline font-[family-name:var(--font-space-grotesk)]"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          View post <BlobArrow arrowColor="#f9f9f7" color="#c6c6c6" size={16} />
        </a>
      ) : null}
    </div>
  </motion.div>
);
