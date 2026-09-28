"use client";

import { useEffect, useId, useState } from "react";

import { useStore } from "@nanostores/react";

import { useSession } from "@/lib/auth/client";
import { withNewsletterDefaults } from "@/lib/newsletter/defaults";
import { $newsletterStatus, $subscribedEmail } from "@/lib/newsletter/store";
import "@/styles/newsletter.css";

import type { NewsletterCopy } from "@/lib/newsletter/defaults";

interface NewsletterFormProps {
  copy?: NewsletterCopy;
}

export const NewsletterForm = ({ copy }: NewsletterFormProps) => {
  const c = withNewsletterDefaults(copy);
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const emailId = useId();
  const status = useStore($newsletterStatus);

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail || !session.user.emailVerified || $newsletterStatus.get() !== "idle") return;
    setEmail(userEmail);
    const controller = new AbortController();
    fetch("/api/newsletter/preferences", {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data: { preference: "all" | "tapes" | "none" } = await res.json();
        return data;
      })
      .then((data) => {
        if (data && data.preference !== "none") {
          $subscribedEmail.set(userEmail);
          $newsletterStatus.set("already");
        }
      })
      .catch(() => {
        /* Subscription entry remains usable if status lookup is unavailable. */
      });
    return () => controller.abort();
  }, [session?.user?.email, session?.user?.emailVerified]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || status === "loading") return;
    setErrorMessage("");
    $newsletterStatus.set("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : c.errorMessage);
      $subscribedEmail.set(email);
      $newsletterStatus.set(data.status === "already" ? "already" : "success");
      setEmail("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : c.errorMessage);
      $newsletterStatus.set("error");
    }
  };

  return (
    <div className="newsletter-form">
      <p>{c.description}</p>
      {status === "success" || status === "already" ? (
        <p role="status">
          {status === "success" ? c.successMessage : c.alreadySubscribedMessage}{" "}
          <a href="/preferences">Manage preferences</a>
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            hidden
            aria-hidden="true"
            autoComplete="off"
            name="company"
            onChange={(event) => setCompany(event.target.value)}
            tabIndex={-1}
            value={company}
          />
          <label className="sr-only" htmlFor={emailId}>
            Email address
          </label>
          <input
            required
            autoComplete="email"
            id={emailId}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={c.placeholder}
            type="email"
            value={email}
          />
          <button disabled={status === "loading"} type="submit">
            {status === "loading" ? "…" : c.buttonLabel}
          </button>
        </form>
      )}
      {status === "error" && <p role="alert">{errorMessage || c.errorMessage}</p>}
    </div>
  );
};
