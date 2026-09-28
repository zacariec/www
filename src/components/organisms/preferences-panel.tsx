"use client";

import { useEffect, useState } from "react";

import { signIn, signOut, useSession } from "@/lib/auth/client";
import "@/styles/preferences.css";

type SubscriptionState =
  | "checking"
  | "idle"
  | "confirming"
  | "loading"
  | "done"
  | "not-subscribed"
  | "resubscribing";
interface SubscriptionInfo {
  subscribed: boolean;
  subscribedAt?: number;
}

export const PreferencesPanel = () => {
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<SubscriptionState>("checking");
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    const controller = new AbortController();
    fetch(`/api/newsletter/status?email=${encodeURIComponent(email)}`, {
      signal: controller.signal,
    })
      .then(async (response): Promise<SubscriptionInfo> => {
        if (!response.ok) throw new Error("Subscription lookup failed");
        const data: SubscriptionInfo = await response.json();
        return data;
      })
      .then((data) => {
        setInfo(data);
        setState(data.subscribed ? "idle" : "not-subscribed");
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Something went wrong. Try again?");
      });
    return () => controller.abort();
  }, [session?.user?.email]);

  const updateSubscription = async (subscribe: boolean) => {
    const email = session?.user?.email;
    if (!email) return;
    setError("");
    setState(subscribe ? "resubscribing" : "loading");
    try {
      const response = await fetch(`/api/newsletter/${subscribe ? "subscribe" : "unsubscribe"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...(subscribe ? { body: JSON.stringify({ email }) } : {}),
      });
      if (!response.ok) throw new Error("Something went wrong. Try again?");
      setInfo({ subscribed: subscribe, ...(subscribe ? { subscribedAt: Date.now() } : {}) });
      setState(subscribe ? "idle" : "done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Try again?");
      setState(subscribe ? "not-subscribed" : "idle");
    }
  };

  return (
    <div className="preferences-panel">
      <a className="mono" href="/">
        ← Home
      </a>
      <h1>Preferences</h1>
      {isPending ? <p role="status">Loading…</p> : null}
      {!isPending && !session?.user && (
        <>
          <p>Sign in to manage your account and subscription settings.</p>
          <div className="preference-actions">
            <button
              type="button"
              onClick={async () =>
                signIn.social({ provider: "github", callbackURL: "/preferences" })
              }
            >
              GitHub
            </button>
            <button
              type="button"
              onClick={async () =>
                signIn.social({ provider: "google", callbackURL: "/preferences" })
              }
            >
              Google
            </button>
          </div>
        </>
      )}
      {!isPending && !!session?.user && (
        <>
          <p>Manage your account and subscription settings.</p>
          <section className="preference-window">
            <h2 className="mono">Account</h2>
            <dl>
              <dt>Name</dt>
              <dd>{session.user.name ?? "—"}</dd>
              <dt>Email</dt>
              <dd>{session.user.email || "—"}</dd>
              {info?.subscribedAt ? (
                <>
                  <dt>Subscribed since</dt>
                  <dd>
                    {new Date(info.subscribedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </dd>
                </>
              ) : null}
            </dl>
            <button
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
          </section>
          <section className="preference-window">
            <h2 className="mono">Newsletter</h2>
            {!session.user.email ? (
              <p>
                A verified email address is required to manage a newsletter subscription. Use the
                unsubscribe link in your email.
              </p>
            ) : (
              <>
                {state === "checking" && !error && <p role="status">Loading…</p>}
                {state === "not-subscribed" && (
                  <>
                    <p>Not subscribed</p>
                    <p>Get notified when new posts are published.</p>
                    <button onClick={async () => updateSubscription(true)} type="button">
                      Subscribe
                    </button>
                  </>
                )}
                {state === "idle" && (
                  <>
                    <p>You&apos;re currently subscribed</p>
                    <p>Receiving new post notifications at {session.user.email}</p>
                    <button onClick={() => setState("confirming")} type="button">
                      Unsubscribe
                    </button>
                  </>
                )}
                {state === "confirming" && (
                  <>
                    <p>Are you sure?</p>
                    <p>
                      You&apos;ll stop receiving notifications when new posts are published. You can
                      always re-subscribe later.
                    </p>
                    <div className="preference-actions">
                      <button onClick={async () => updateSubscription(false)} type="button">
                        Yes, unsubscribe
                      </button>
                      <button onClick={() => setState("idle")} type="button">
                        Cancel
                      </button>
                    </div>
                  </>
                )}
                {(state === "loading" || state === "resubscribing") && (
                  <p role="status">{state === "loading" ? "Unsubscribing..." : "Subscribing..."}</p>
                )}
                {state === "done" && (
                  <>
                    <p role="status">You&apos;ve been unsubscribed</p>
                    <p>You won&apos;t receive any more emails. Changed your mind?</p>
                    <button onClick={async () => updateSubscription(true)} type="button">
                      Re-subscribe
                    </button>
                  </>
                )}
              </>
            )}
            {error ? <p role="alert">{error}</p> : null}
          </section>
        </>
      )}
    </div>
  );
};
