"use client";

import { useEffect, useState } from "react";

import { useStore } from "@nanostores/react";
import { motion } from "motion/react";

import { useSession } from "@/lib/auth/client";
import { withNewsletterDefaults } from "@/lib/newsletter/defaults";
import { $newsletterStatus, $subscribedEmail } from "@/lib/newsletter/store";

import type { NewsletterCopy } from "@/lib/newsletter/defaults";
import type { NewsletterStatus } from "@/lib/newsletter/store";

export type { NewsletterCopy };

interface NewsletterFormProps {
  variant?: "footer" | "inline";
  copy?: NewsletterCopy;
}

export const NewsletterForm = ({ variant = "footer", copy }: NewsletterFormProps) => {
  const c = withNewsletterDefaults(copy);
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot

  // Shared state across all NewsletterForm islands
  const status = useStore($newsletterStatus);
  const setStatus = (s: NewsletterStatus) => $newsletterStatus.set(s);

  // If the user is logged in, pre-fill their email and check subscription status
  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail || $newsletterStatus.get() !== "idle") return;
    setEmail(userEmail);
    fetch(`/api/newsletter/status?email=${encodeURIComponent(userEmail)}`)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.subscribed) {
          $subscribedEmail.set(userEmail);
          $newsletterStatus.set("already");
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [session?.user?.email]);

  const isInline = variant === "inline";

  const headingClass = isInline
    ? "text-[10px] tracking-[3px] uppercase text-[#777777] mb-3 font-[family-name:var(--font-space-grotesk)]"
    : "text-[10px] tracking-[3px] uppercase text-[#777777] mb-4 font-[family-name:var(--font-space-grotesk)]";

  const descriptionClass = isInline
    ? "text-[14px] text-[#1a1c1b] mb-5 font-[family-name:var(--font-inter)] leading-[1.6]"
    : "text-[13px] text-[#c6c6c6] mb-5 font-[family-name:var(--font-inter)] leading-[1.6]";

  const inputClass = isInline
    ? "w-full bg-transparent border-b border-[rgba(0,0,0,0.12)] py-2 text-[14px] text-[#1a1c1b] placeholder-[#c6c6c6] focus:outline-none focus:border-[#000000] transition-colors duration-500 font-[family-name:var(--font-inter)]"
    : "w-full bg-transparent border-b border-[rgba(249,249,247,0.2)] py-2 text-[13px] text-[#f9f9f7] placeholder-[#777777] focus:outline-none focus:border-[#f9f9f7] transition-colors duration-500 font-[family-name:var(--font-inter)]";

  const buttonClass = isInline
    ? "text-[10px] tracking-[2px] uppercase bg-[#000000] text-[#f9f9f7] px-5 py-2.5 border-none cursor-pointer font-[family-name:var(--font-space-grotesk)] disabled:opacity-50"
    : "text-[10px] tracking-[2px] uppercase bg-[#f9f9f7] text-[#1a1c1b] px-5 py-2.5 border-none cursor-pointer font-[family-name:var(--font-space-grotesk)] disabled:opacity-50";

  const messageClass = isInline
    ? "text-[13px] text-[#1a1c1b] font-[family-name:var(--font-space-grotesk)] tracking-[1px]"
    : "text-[12px] text-[#f9f9f7] font-[family-name:var(--font-space-grotesk)] tracking-[1px]";

  const errorClass = isInline
    ? "mt-3 text-[12px] text-[#777777] font-[family-name:var(--font-inter)]"
    : "mt-3 text-[11px] text-[#c6c6c6] font-[family-name:var(--font-inter)]";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      $subscribedEmail.set(email);
      setStatus(data.status === "already" ? "already" : "success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  const isResolved = status === "success" || status === "already";

  return (
    <div className="max-w-[420px]">
      <p className={headingClass}>{c.heading}</p>
      <p className={descriptionClass}>{c.description}</p>
      {isResolved ? (
        <div>
          {status === "already" && (
            <p className={messageClass}>
              {c.alreadySubscribedMessage}{" "}
              <a
                className={`${isInline ? "text-[#c6c6c6] hover:text-[#777777]" : "text-[#777777] hover:text-[#c6c6c6]"} font-[family-name:var(--font-inter)] text-[inherit] underline underline-offset-4 transition-colors duration-300`}
                href="/preferences"
              >
                Manage preferences
              </a>
            </p>
          )}
          {status === "success" && <p className={messageClass}>{c.successMessage}</p>}
        </div>
      ) : (
        <form className="flex items-end gap-3" onSubmit={handleSubmit}>
          <input
            aria-hidden="true"
            autoComplete="off"
            className="hidden"
            name="company"
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            type="text"
            value={company}
          />
          <div className="flex-1">
            <input
              required
              aria-label="Email address"
              className={inputClass}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={c.placeholder}
              type="email"
              value={email}
            />
          </div>
          <motion.button
            className={buttonClass}
            disabled={status === "loading"}
            transition={{ duration: 0.2 }}
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {status === "loading" ? "..." : c.buttonLabel}
          </motion.button>
        </form>
      )}
      {status === "error" && <p className={errorClass}>{c.errorMessage}</p>}
    </div>
  );
};
