import Link from "next/link";

import { BlobArrow } from "@/components/atoms/blob-arrow";

interface PostCardProps {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readingTime: string;
  commentCount?: number;
  variant?: "compact" | "full";
}

export const PostCard = ({
  slug,
  title,
  subtitle,
  date,
  readingTime,
  commentCount,
  variant = "compact",
}: PostCardProps) => {
  const formattedDate =
    variant === "full"
      ? new Date(date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <Link className="group block no-underline" href={`/blog/${slug}`}>
      <div
        className={`${variant === "full" ? "py-8 md:py-14" : "py-8 md:py-12"} flex flex-col md:flex-row md:items-start gap-3 md:gap-16`}
      >
        <div
          className={`flex items-center gap-3 ${variant === "full" ? "md:min-w-[200px]" : "md:min-w-[180px]"} shrink-0`}
        >
          <span className="text-[10px] tracking-[1.5px] uppercase text-[#777777] font-[family-name:var(--font-space-grotesk)]">
            {formattedDate}
          </span>
          {variant === "compact" && (
            <>
              <span className="text-[10px] text-[#c6c6c6]">/</span>
              <span className="text-[10px] tracking-[1.5px] uppercase text-[#777777] font-[family-name:var(--font-space-grotesk)]">
                {readingTime}
              </span>
            </>
          )}
        </div>
        <div className="flex-1">
          <h3
            className={`${variant === "full" ? "text-[24px] md:text-[36px] tracking-[-2px]" : "text-[22px] md:text-[30px] tracking-[-1.5px]"} text-[#000000] group-hover:text-[#777777] transition-colors duration-500 mb-2 md:mb-3 font-[family-name:var(--font-space-grotesk)]`}
            style={{ fontWeight: 700, lineHeight: 1.05 }}
          >
            {title}
          </h3>
          <p
            className={`text-[13px] md:text-[14px] text-[#777777] max-w-[500px] font-[family-name:var(--font-inter)] ${variant === "compact" ? "hidden md:block" : ""}`}
            style={{ lineHeight: 1.6 }}
          >
            {subtitle}
          </p>
          {variant === "full" && (
            <div className="flex items-center gap-3 mt-4">
              <span className="text-[10px] tracking-[1px] uppercase text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
                {readingTime}
              </span>
              {commentCount !== undefined && (
                <>
                  <span className="text-[10px] text-[#e2e3e1]">&middot;</span>
                  <span className="text-[10px] tracking-[1px] uppercase text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
                    {commentCount} comments
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center self-center">
          <BlobArrow arrowColor="#f9f9f7" color="#c6c6c6" size={24} />
        </div>
      </div>
    </Link>
  );
};
