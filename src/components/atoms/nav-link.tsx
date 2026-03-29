"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

interface NavLinkProps {
  href: string;
  label: string;
  layoutId?: string;
  className?: string;
}

export function NavLink({ href, label, layoutId = "nav-indicator", className }: NavLinkProps) {
  const pathname = usePathname();

  const isActive = () => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const active = isActive();

  return (
    <Link
      href={href}
      className={`relative text-[11px] tracking-[2px] uppercase no-underline transition-colors duration-300 ${
        active ? "text-[#000000]" : "text-[#777777] hover:text-black"
      } ${className ?? ""}`}
    >
      {label}
      {active && (
        <motion.div
          layoutId={layoutId}
          className="absolute -bottom-1.5 left-0 right-0 h-px bg-[#000000]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </Link>
  );
}
