"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, Check, Loader2, Mail, MailX, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { signIn, signOut, useSession } from "@/lib/auth/client";

type UnsubState = "idle" | "confirming" | "loading" | "done" | "not-subscribed" | "resubscribing";

interface SubInfo {
  subscribed: boolean;
  subscribedAt?: number;
}

export const PreferencesPanel = () => {
  const { data: session, isPending } = useSession();
  const [unsubState, setUnsubState] = useState<UnsubState>("idle");
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);

  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    fetch(`/api/newsletter/status?email=${encodeURIComponent(email)}`)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data: SubInfo | null) => {
        if (data) {
          setSubInfo(data);
          setUnsubState(data.subscribed ? "idle" : "not-subscribed");
        }
      })
      .catch(() => {});
  }, [session?.user?.email]);

  const handleUnsubscribe = async () => {
    setUnsubState("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      setUnsubState("done");
      setSubInfo({ subscribed: false });
    } catch {
      setUnsubState("idle");
    }
  };

  const handleResubscribe = async () => {
    const email = session?.user?.email;
    if (!email) return;
    setUnsubState("resubscribing");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      setSubInfo({ subscribed: true, subscribedAt: Date.now() });
      setUnsubState("idle");
    } catch {
      setUnsubState("not-subscribed");
    }
  };

  const handleSocial = async (provider: "github" | "google") =>
    signIn.social({ provider, callbackURL: "/preferences" });

  const subscribedSince = subInfo?.subscribedAt
    ? new Date(subInfo.subscribedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;

  // Loading
  if (isPending) {
    return (
      <div className="min-h-[70vh] px-6 md:px-12 py-20 md:py-32 max-w-[640px] mx-auto">
        <div className="mb-16">
          <div className="h-4 w-24 bg-[rgba(0,0,0,0.04)] animate-pulse mb-3" />
          <div className="h-3 w-64 bg-[rgba(0,0,0,0.04)] animate-pulse" />
        </div>
        <div className="space-y-5">
          <div className="h-12 bg-[rgba(0,0,0,0.02)] animate-pulse" />
          <div className="h-12 bg-[rgba(0,0,0,0.02)] animate-pulse" />
          <div className="h-12 bg-[rgba(0,0,0,0.02)] animate-pulse" />
        </div>
      </div>
    );
  }

  // Unauthenticated
  if (!session?.user) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className="min-h-[70vh] px-6 md:px-12 py-20 md:py-32 max-w-[640px] mx-auto"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <a
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[2px] uppercase text-[#777777] hover:text-[#000000] transition-colors duration-500 mb-16 font-[family-name:var(--font-space-grotesk)] font-semibold"
          href="/"
        >
          <ArrowLeft className="w-3 h-3" />
          Home
        </a>
        <div className="mb-10">
          <h1 className="text-[12px] tracking-[2px] uppercase text-[#000000] mb-3 font-[family-name:var(--font-space-grotesk)] font-semibold">
            Preferences
          </h1>
          <p className="text-[13px] text-[#777777] font-[family-name:var(--font-inter)] leading-[1.7]">
            Sign in to manage your account and subscription settings.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="text-[10px] tracking-[2px] uppercase bg-[#000000] text-[#e2e2e2] px-5 py-2.5 border-none cursor-pointer font-[family-name:var(--font-space-grotesk)] hover:bg-[#333] transition-colors duration-300"
            onClick={async () => handleSocial("github")}
            type="button"
          >
            GitHub
          </button>
          <button
            className="text-[10px] tracking-[2px] uppercase bg-[#000000] text-[#e2e2e2] px-5 py-2.5 border-none cursor-pointer font-[family-name:var(--font-space-grotesk)] hover:bg-[#333] transition-colors duration-300"
            onClick={async () => handleSocial("google")}
            type="button"
          >
            Google
          </button>
        </div>
      </motion.div>
    );
  }

  // Authenticated
  const { user } = session;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="min-h-[70vh] px-6 md:px-12 py-20 md:py-32 max-w-[640px] mx-auto"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Back link */}
      <a
        className="inline-flex items-center gap-1.5 text-[10px] tracking-[2px] uppercase text-[#777777] hover:text-[#000000] transition-colors duration-500 mb-16 font-[family-name:var(--font-space-grotesk)] font-semibold"
        href="/"
      >
        <ArrowLeft className="w-3 h-3" />
        Home
      </a>

      {/* Header */}
      <div className="mb-16">
        <h1 className="text-[12px] tracking-[2px] uppercase text-[#000000] mb-3 font-[family-name:var(--font-space-grotesk)] font-semibold">
          Preferences
        </h1>
        <p className="text-[13px] text-[#777777] font-[family-name:var(--font-inter)] leading-[1.7]">
          Manage your account and subscription settings.
        </p>
      </div>

      {/* Account section */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <User className="w-4 h-4 text-[#c6c6c6]" />
          <span className="text-[10px] tracking-[2px] uppercase text-[#777777] font-[family-name:var(--font-space-grotesk)] font-semibold">
            Account
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.06)] py-5 flex justify-between items-baseline">
          <span className="text-[11px] tracking-[1px] uppercase text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
            Name
          </span>
          <span className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)]">
            {user.name ?? "—"}
          </span>
        </div>
        <div className="border-t border-[rgba(0,0,0,0.06)] py-5 flex justify-between items-baseline">
          <span className="text-[11px] tracking-[1px] uppercase text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
            Email
          </span>
          <span className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)]">
            {user.email}
          </span>
        </div>
        {subscribedSince ? (
          <div className="border-t border-[rgba(0,0,0,0.06)] py-5 flex justify-between items-baseline">
            <span className="text-[11px] tracking-[1px] uppercase text-[#c6c6c6] font-[family-name:var(--font-space-grotesk)]">
              Subscribed since
            </span>
            <span className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)]">
              {subscribedSince}
            </span>
          </div>
        ) : null}
        <div className="border-t border-b border-[rgba(0,0,0,0.06)] py-5 flex justify-end">
          <button
            className="text-[10px] tracking-[1px] uppercase text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 bg-transparent border-none cursor-pointer p-0 font-[family-name:var(--font-space-grotesk)]"
            type="button"
            onClick={async () =>
              signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = "/";
                  },
                },
              })
            }
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Newsletter section */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <Mail className="w-4 h-4 text-[#c6c6c6]" />
          <span className="text-[10px] tracking-[2px] uppercase text-[#777777] font-[family-name:var(--font-space-grotesk)] font-semibold">
            Newsletter
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* Not subscribed */}
          {unsubState === "not-subscribed" && (
            <motion.div
              key="not-subscribed"
              animate={{ opacity: 1 }}
              className="border-t border-[rgba(0,0,0,0.06)] py-5"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)] mb-1">
                    Not subscribed
                  </p>
                  <p className="text-[12px] text-[#c6c6c6] font-[family-name:var(--font-inter)] leading-[1.6]">
                    Get notified when new posts are published.
                  </p>
                </div>
                <motion.button
                  className="text-[10px] tracking-[2px] uppercase text-[#000000] hover:text-[#777777] transition-colors duration-500 cursor-pointer bg-transparent border-none font-[family-name:var(--font-space-grotesk)] shrink-0 mt-0.5 font-semibold"
                  onClick={handleResubscribe}
                  type="button"
                  whileHover={{ x: 2 }}
                >
                  Subscribe
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Resubscribing */}
          {unsubState === "resubscribing" && (
            <motion.div
              key="resubscribing"
              animate={{ opacity: 1 }}
              className="border-t border-[rgba(0,0,0,0.06)] py-10 flex items-center gap-3 justify-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <Loader2 className="w-4 h-4 text-[#777777] animate-spin" />
              <p className="text-[12px] text-[#777777] font-[family-name:var(--font-inter)]">
                Subscribing...
              </p>
            </motion.div>
          )}

          {/* Subscribed — idle */}
          {unsubState === "idle" && (
            <motion.div
              key="idle"
              animate={{ opacity: 1 }}
              className="border-t border-[rgba(0,0,0,0.06)] py-5"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)] mb-1">
                    You&apos;re currently subscribed
                  </p>
                  <p className="text-[12px] text-[#c6c6c6] font-[family-name:var(--font-inter)] leading-[1.6]">
                    Receiving new post notifications at {user.email}
                  </p>
                </div>
                <motion.button
                  className="text-[10px] tracking-[2px] uppercase text-[#777777] hover:text-[#d4183d] transition-colors duration-500 cursor-pointer bg-transparent border-none font-[family-name:var(--font-space-grotesk)] shrink-0 mt-0.5 font-semibold"
                  onClick={() => setUnsubState("confirming")}
                  type="button"
                  whileHover={{ x: 2 }}
                >
                  Unsubscribe
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Confirming */}
          {unsubState === "confirming" && (
            <motion.div
              key="confirming"
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[rgba(0,0,0,0.06)] py-8"
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-3 mb-6">
                <MailX className="w-4 h-4 text-[#d4183d] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)] mb-1">
                    Are you sure?
                  </p>
                  <p className="text-[12px] text-[#777777] font-[family-name:var(--font-inter)] leading-[1.6]">
                    You&apos;ll stop receiving notifications when new posts are published. You can
                    always re-subscribe later.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 ml-7">
                <motion.button
                  className="text-[10px] tracking-[2px] uppercase text-[#d4183d] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none font-[family-name:var(--font-space-grotesk)] font-semibold"
                  onClick={handleUnsubscribe}
                  type="button"
                  whileHover={{ x: 2 }}
                >
                  Yes, unsubscribe
                </motion.button>
                <motion.button
                  className="text-[10px] tracking-[2px] uppercase text-[#c6c6c6] hover:text-[#000000] transition-colors duration-300 cursor-pointer bg-transparent border-none font-[family-name:var(--font-space-grotesk)] font-semibold"
                  onClick={() => setUnsubState("idle")}
                  type="button"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {unsubState === "loading" && (
            <motion.div
              key="loading"
              animate={{ opacity: 1 }}
              className="border-t border-[rgba(0,0,0,0.06)] py-10 flex items-center gap-3 justify-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <Loader2 className="w-4 h-4 text-[#777777] animate-spin" />
              <p className="text-[12px] text-[#777777] font-[family-name:var(--font-inter)]">
                Unsubscribing...
              </p>
            </motion.div>
          )}

          {/* Done */}
          {unsubState === "done" && (
            <motion.div
              key="done"
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[rgba(0,0,0,0.06)] py-8"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-6 h-6 rounded-full bg-[#000000] flex items-center justify-center shrink-0 mt-0.5"
                  initial={{ scale: 0, rotate: -180 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  <Check className="w-3 h-3 text-[#e2e2e2]" />
                </motion.div>
                <div>
                  <p className="text-[14px] text-[#000000] font-[family-name:var(--font-inter)] mb-1">
                    You&apos;ve been unsubscribed
                  </p>
                  <p className="text-[12px] text-[#777777] font-[family-name:var(--font-inter)] leading-[1.6]">
                    You won&apos;t receive any more emails. Changed your mind?{" "}
                    <button
                      className="text-[#000000] hover:text-[#777777] transition-colors duration-300 cursor-pointer bg-transparent border-none p-0 font-[family-name:var(--font-inter)] text-[12px] underline underline-offset-2 decoration-[rgba(0,0,0,0.15)]"
                      onClick={handleResubscribe}
                      type="button"
                    >
                      Re-subscribe
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
};
