"use client";

import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";

export const AuthButton = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-32 bg-[rgba(0,0,0,0.03)] animate-pulse rounded" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image ? (
          <Image alt="" className="rounded-full" height={24} src={session.user.image} width={24} />
        ) : null}
        <span
          className="text-[12px] text-[#000000] font-[family-name:var(--font-space-grotesk)]"
          style={{ fontWeight: 500 }}
        >
          {session.user.name}
        </span>
        <button
          className="text-[10px] tracking-[1px] uppercase text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 bg-transparent border-none cursor-pointer p-0 font-[family-name:var(--font-space-grotesk)]"
          onClick={async () => signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-[12px] text-[#777777] font-[family-name:var(--font-inter)]">
        Sign in to comment
      </span>
      <button
        className="text-[10px] tracking-[2px] uppercase bg-[#000000] text-[#e2e2e2] px-5 py-2.5 border-none cursor-pointer font-[family-name:var(--font-space-grotesk)] hover:bg-[#333] transition-colors duration-300"
        onClick={async () => signIn("github")}
      >
        GitHub
      </button>
      <button
        className="text-[10px] tracking-[2px] uppercase bg-[#000000] text-[#e2e2e2] px-5 py-2.5 border-none cursor-pointer font-[family-name:var(--font-space-grotesk)] hover:bg-[#333] transition-colors duration-300"
        onClick={async () => signIn("google")}
      >
        Google
      </button>
    </div>
  );
};
