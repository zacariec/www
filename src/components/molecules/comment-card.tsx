"use client";

import { useState } from "react";

import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";

interface CommentCardProps {
  id: string;
  author: string;
  authorImage?: string;
  date: string;
  text: string;
  likes: number;
  isLast?: boolean;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
}

export const CommentCard = ({
  id,
  author,
  authorImage,
  date,
  text,
  likes: initialLikes,
  isLast = false,
  isReply = false,
  onReply,
}: CommentCardProps) => {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikes((prev) => prev + 1);

    try {
      await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });
    } catch {
      setLiked(false);
      setLikes((prev) => prev - 1);
    }
  };

  return (
    <div
      className={`py-7 ${isReply ? "ml-8 border-l-2 border-[rgba(0,0,0,0.04)] pl-6" : ""} ${!isLast ? "border-b border-[rgba(0,0,0,0.03)]" : ""}`}
    >
      <div className="flex items-center gap-3 mb-2">
        {authorImage ? (
          <Image alt="" className="rounded-full" height={20} src={authorImage} width={20} />
        ) : null}
        <span
          className="text-[12px] text-[#000000] font-[family-name:var(--font-space-grotesk)]"
          style={{ fontWeight: 500 }}
        >
          {author}
        </span>
        <span className="text-[10px] text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
          {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p
        className="text-[13px] text-[#777777] font-[family-name:var(--font-inter)]"
        style={{ lineHeight: 1.7 }}
      >
        {text}
      </p>
      <div className="flex items-center gap-4 mt-3">
        <button
          onClick={handleLike}
          type="button"
          className={`flex items-center gap-1.5 text-[10px] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)] ${
            liked ? "text-[#000000]" : "text-[#c6c6c6] hover:text-[#000000]"
          }`}
        >
          <Heart className={`w-3 h-3 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        {onReply && !isReply ? (
          <button
            className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]"
            onClick={() => onReply(id)}
            type="button"
          >
            <MessageCircle className="w-3 h-3" /> Reply
          </button>
        ) : null}
      </div>
    </div>
  );
};
