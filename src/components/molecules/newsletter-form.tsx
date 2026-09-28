"use client";

import { useEffect, useState } from "react";

import { useStore } from "@nanostores/react";

import { useSession } from "@/lib/auth/client";
import { withNewsletterDefaults } from "@/lib/newsletter/defaults";
import { $newsletterStatus, $subscribedEmail } from "@/lib/newsletter/store";

import type { NewsletterCopy } from "@/lib/newsletter/defaults";

interface NewsletterFormProps {
  copy?: NewsletterCopy;
}

export const NewsletterForm = ({ copy }: NewsletterFormProps) => {
  const c = withNewsletterDefaults(copy);
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const status = useStore($newsletterStatus);

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail || $newsletterStatus.get() !== "idle") return;
    setEmail(userEmail);
    const controller = new AbortController();
    fetch(`/api/newsletter/status?email=${encodeURIComponent(userEmail)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data: { subscribed: boolean } = await res.json();
        return data;
      })
      .then((data) => {
        if (data?.subscribed) {
          $subscribedEmail.set(userEmail);
          $newsletterStatus.set("already");
        }
      })
      .catch(() => {
        /* Subscription entry remains usable if status lookup is unavailable. */
      });
    return () => controller.abort();
  }, [session?.user?.email]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || status === "loading") return;
    $newsletterStatus.set("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      if (!res.ok) throw new Error("Subscription failed");
      const data = await res.json();
      $subscribedEmail.set(email);
      $newsletterStatus.set(data.status === "already" ? "already" : "success");
      setEmail("");
    } catch {
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
          <label className="sr-only" htmlFor="updates-email">
            Email address
          </label>
          <input
            required
            autoComplete="email"
            id="updates-email"
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
      {status === "error" && <p role="alert">{c.errorMessage}</p>}
    </div>
  );
};
