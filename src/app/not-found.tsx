import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 md:px-16 pt-32 pb-32 text-center">
      <h1
        className="text-[48px] tracking-[-2px] font-[family-name:var(--font-space-grotesk)]"
        style={{ fontWeight: 700 }}
      >
        404
      </h1>
      <p className="text-[#777777] mt-4 mb-8 font-[family-name:var(--font-inter)]">
        Page not found.
      </p>
      <Link
        href="/"
        className="text-[11px] tracking-[2px] uppercase text-[#000000] no-underline font-[family-name:var(--font-space-grotesk)]"
      >
        &larr; Back to Index
      </Link>
    </div>
  );
}
