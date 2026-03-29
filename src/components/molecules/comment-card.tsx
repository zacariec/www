import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";

interface CommentCardProps {
  author: string;
  authorImage?: string;
  date: string;
  text: string;
  likes: number;
  isLast?: boolean;
}

export const CommentCard = ({
  author,
  authorImage,
  date,
  text,
  likes,
  isLast = false,
}: CommentCardProps) => (
  <div className={`py-7 ${!isLast ? "border-b border-[rgba(0,0,0,0.03)]" : ""}`}>
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
      <button className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]">
        <Heart className="w-3 h-3" /> {likes}
      </button>
      <button className="flex items-center gap-1.5 text-[10px] text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-space-grotesk)]">
        <MessageCircle className="w-3 h-3" /> Reply
      </button>
    </div>
  </div>
);
