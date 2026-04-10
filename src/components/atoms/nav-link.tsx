"use client";

import { motion } from "motion/react";

interface NavLinkProps {
  href: string;
  label: string;
  layoutId?: string;
  className?: string;
  pathname?: string;
}

export const NavLink = ({
  href,
  label,
  layoutId = "nav-indicator",
  className,
  pathname: pathnameProp,
}: NavLinkProps) => {
  const pathname = pathnameProp || (typeof window !== "undefined" ? window.location.pathname : "/");

  const isActive = () => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const active = isActive();

  return (
    <a
      href={href}
      className={`relative text-[11px] tracking-[2px] uppercase no-underline transition-colors duration-300 ${
        active ? "text-[#000000]" : "text-[#777777] hover:text-black"
      } ${className ?? ""}`}
    >
      {label}
      {active ? (
        <motion.div
          className="absolute -bottom-1.5 left-0 right-0 h-px bg-[#000000]"
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      ) : null}
    </a>
  );
};
