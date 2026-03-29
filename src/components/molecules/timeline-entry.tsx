"use client";

import { Heart, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { TypeBadge } from "@/components/atoms/type-badge";
import { BlobArrow } from "@/components/atoms/blob-arrow";

interface TimelineEntryProps {
  date: string;
  text: string;
  type: "thought" | "linkedin" | "reflection";
  likes: number;
  comments: number;
  url?: string;
}

export function TimelineEntryCard({
  date,
  text,
  type,
  likes,
  comments,
  url,
}: TimelineEntryProps) {
  return (
    <motion.div
      className="py-7 md:py-8 border-b border-[rgba(0,0,0,0.03)] group"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.3 }}
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
        <button className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]">
          <Heart className="w-3 h-3" /> {likes}
        </button>
        <button className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]">
          <MessageCircle className="w-3 h-3" /> {comments}
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 no-underline font-[family-name:var(--font-space-grotesk)]"
          >
            View post <BlobArrow size={16} color="#c6c6c6" arrowColor="#f9f9f7" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
