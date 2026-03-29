import { Linkedin } from "lucide-react";

interface TypeBadgeProps {
  type: "thought" | "linkedin" | "reflection";
}

export function TypeBadge({ type }: TypeBadgeProps) {
  if (type === "thought") return null;

  if (type === "linkedin") {
    return (
      <span className="flex items-center gap-1 text-[8px] tracking-[1.5px] uppercase text-[#777777] border border-[rgba(0,0,0,0.06)] px-2 py-0.5 rounded-full font-[family-name:var(--font-space-grotesk)]">
        <Linkedin className="w-2 h-2" /> LinkedIn
      </span>
    );
  }

  return (
    <span className="text-[8px] tracking-[1.5px] uppercase text-[#777777] border border-[rgba(0,0,0,0.06)] px-2 py-0.5 rounded-full font-[family-name:var(--font-space-grotesk)]">
      Reflection
    </span>
  );
}
