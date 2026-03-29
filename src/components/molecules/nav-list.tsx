"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BlobLink } from "@/components/atoms/blob-link";

interface NavListProps {
  navItems: readonly { label: string; href: string }[];
  linkedInUrl: string;
  variant: "header" | "footer";
  hoveredHref?: string | null;
  onHover?: (href: string | null) => void;
}

export const NavList = ({
  navItems,
  linkedInUrl,
  variant,
  hoveredHref = null,
  onHover,
}: NavListProps) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isHeader = variant === "header";
  const blobTarget = hoveredHref ?? navItems.find((item) => isActive(item.href))?.href ?? null;

  const gap = isHeader ? "gap-10" : "gap-6";
  const textSize = isHeader ? "text-[11px] tracking-[2px]" : "text-[9px] tracking-[2px]";
  const blobColor = isHeader ? "#000000" : "#777777";
  const blobSize = isHeader ? 6 : 5;
  const fontFamily = isHeader ? "" : "font-[family-name:var(--font-space-grotesk)]";

  return (
    <div className={`flex items-center ${gap}`}>
      {navItems.map((item) => {
        const active = isActive(item.href);
        const showBlob = blobTarget === item.href;

        return (
          <BlobLink
            key={item.href}
            color={blobColor}
            position="left"
            size={blobSize}
            visible={showBlob}
          >
            <Link
              href={item.href}
              onMouseEnter={onHover ? () => onHover(item.href) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
              className={`${textSize} uppercase no-underline transition-colors duration-300 flex items-center gap-2 py-2 px-3 -my-2 -mx-3 ${fontFamily} ${
                isHeader
                  ? active
                    ? "text-[#000000]"
                    : "text-[#777777] hover:text-black"
                  : active
                    ? "text-[#c6c6c6]"
                    : "text-[#777777] hover:text-[#c6c6c6]"
              }`}
            >
              {item.label}
            </Link>
          </BlobLink>
        );
      })}
      <BlobLink color="#777777" size={blobSize} visible={false}>
        <a
          href={linkedInUrl}
          rel="noopener noreferrer"
          target="_blank"
          className={`${textSize} uppercase text-[#777777] ${
            isHeader ? "hover:text-black" : "hover:text-[#c6c6c6]"
          } no-underline transition-colors duration-300 flex items-center gap-1 py-2 px-3 -my-2 -mx-3 ${fontFamily}`}
        >
          Li <ArrowUpRight className="w-2.5 h-2.5" />
        </a>
      </BlobLink>
    </div>
  );
};
