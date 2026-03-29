import Link from "next/link";

import { navItems } from "@/lib/constants";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-layout min-h-screen flex flex-col">
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center justify-between px-8 lg:px-16 py-4 border-b border-[rgba(0,0,0,0.06)]">
        <Link
          className="text-[11px] tracking-[2px] uppercase font-bold no-underline text-[#000000] font-[family-name:var(--font-space-grotesk)]"
          href="/"
        >
          ZC
        </Link>
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="text-[11px] tracking-[2px] uppercase text-[#777777] hover:text-black no-underline transition-colors duration-300 font-[family-name:var(--font-space-grotesk)]"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Studio content */}
      <div className="flex-1">{children}</div>

      {/* Mobile nav — bottom, pushes studio up */}
      <nav className="md:hidden flex items-center justify-between px-5 py-3 border-t border-[rgba(0,0,0,0.06)] bg-[#f9f9f7] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Link
          className="text-[10px] tracking-[2px] uppercase font-bold no-underline text-[#000000] font-[family-name:var(--font-space-grotesk)]"
          href="/"
        >
          ZC
        </Link>
        <div className="flex items-center gap-5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="text-[10px] tracking-[2px] uppercase text-[#777777] hover:text-black no-underline transition-colors duration-300 font-[family-name:var(--font-space-grotesk)]"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
