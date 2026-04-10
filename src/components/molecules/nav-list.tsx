"use client";


import { BlobLink } from "@/components/atoms/blob-link";
import { SocialFlipper } from "@/components/molecules/social-flipper";

interface NavListProps {
  navItems: readonly { label: string; href: string }[];
  variant: "header" | "footer";
  hoveredHref?: string | null;
  onHover?: (href: string | null) => void;
  onNavigate?: (href: string) => void;
  pathname?: string;
}

function getNavLinkColor(isHeader: boolean, active: boolean): string {
  if (isHeader) {
    return active ? "text-[#000000]" : "text-[#777777] hover:text-black";
  }
  return active ? "text-[#c6c6c6]" : "text-[#777777] hover:text-[#c6c6c6]";
}

export const NavList = ({ navItems, variant, hoveredHref = null, onHover, onNavigate, pathname: pathnameProp }: NavListProps) => {
  const pathname = pathnameProp || (typeof window !== 'undefined' ? window.location.pathname : '/');

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
            onMouseEnter={onHover ? () => onHover(item.href) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}
            position="left"
            size={blobSize}
            visible={showBlob}
          >
            <a
              href={item.href}
              onClick={onNavigate ? () => onNavigate(item.href) : undefined}
              className={`${textSize} uppercase no-underline transition-colors duration-300 flex items-center gap-2 py-5 px-3 -mx-3 ${fontFamily} ${getNavLinkColor(
                isHeader,
                active || showBlob,
              )}`}
            >
              {item.label}
            </a>
          </BlobLink>
        );
      })}
      <BlobLink
        color="#777777"
        onMouseEnter={onHover ? () => onHover("social") : undefined}
        onMouseLeave={onHover ? () => onHover(null) : undefined}
        position="left"
        size={blobSize}
        visible={blobTarget === "social"}
      >
        <SocialFlipper variant={variant} />
      </BlobLink>
    </div>
  );
};
