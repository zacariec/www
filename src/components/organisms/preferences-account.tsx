import { useEffect, useState } from "react";

import { NewsletterForm } from "@/components/molecules/newsletter-form";
import {
  PreferenceRow,
  PreferenceSegments,
  PreferenceToggle,
  PreferenceWindow,
} from "@/components/molecules/preference-controls";
import { signIn, signOut, useSession } from "@/lib/auth/client";
import { $newsletterStatus, $subscribedEmail } from "@/lib/newsletter/store";

import type { ReactNode } from "react";

import type { ReaderProvider } from "@/lib/auth/auth";

interface AccountPreferences {
  replyNotifications: boolean;
  showAnchors: boolean;
  commentCount: number;
}
interface NewsletterPreferences {
  preference: "all" | "tapes" | "none";
  email: string;
  subscribedAt?: number;
}
interface ReaderUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}
interface CommentExportState {
  signedIn: boolean;
  commentCount: number | null;
  exporting: boolean;
  exportComments?: () => void;
}
interface PreferencesAccountProps {
  providers: ReaderProvider[];
  children: (state: CommentExportState) => ReactNode;
}
interface SignedInPreferencesProps {
  user: ReaderUser;
  children: PreferencesAccountProps["children"];
}

const providerNames: Record<ReaderProvider, string> = {
  github: "GitHub",
  google: "Google",
  twitter: "X",
  linkedin: "LinkedIn",
};
const deliveries = [
  { value: "all", label: "Every session" },
  { value: "tapes", label: "Tapes only" },
  { value: "none", label: "Nothing" },
] as const;

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not save. Please try again.",
    );
  return data as T;
}

function SignedInPreferences({ user, children }: SignedInPreferencesProps) {
  const [account, setAccount] = useState<AccountPreferences | null>(null);
  const [newsletter, setNewsletter] = useState<NewsletterPreferences | null>(null);
  const [delivery, setDelivery] = useState<NewsletterPreferences["preference"]>("none");
  const [accountBusy, setAccountBusy] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [newsletterError, setNewsletterError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [newsletterNotice, setNewsletterNotice] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setAccountError("");
    setNewsletterError("");
    fetch("/api/preferences", { signal: controller.signal })
      .then(async (response) => readResponse<AccountPreferences>(response))
      .then((data) => {
        if (!controller.signal.aborted) setAccount(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setAccountError(
            error instanceof Error ? error.message : "Account preferences are unavailable.",
          );
      });
    if (user.email && user.emailVerified) {
      fetch("/api/newsletter/preferences", { signal: controller.signal })
        .then(async (response) => readResponse<NewsletterPreferences>(response))
        .then((data) => {
          if (controller.signal.aborted) return;
          setNewsletter(data);
          setDelivery(data.preference);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setNewsletterError(
              error instanceof Error ? error.message : "Newsletter preferences are unavailable.",
            );
        });
    }
    return () => controller.abort();
  }, [user.email, user.emailVerified, refresh]);

  async function updateAccount(
    patch: Partial<Pick<AccountPreferences, "replyNotifications" | "showAnchors">>,
  ) {
    setAccountBusy(true);
    setAccountError("");
    setAccountNotice("");
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setAccount(await readResponse<AccountPreferences>(response));
      setAccountNotice("Account preferences saved.");
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Could not save account preferences.",
      );
    } finally {
      setAccountBusy(false);
    }
  }

  async function saveNewsletter(preference: NewsletterPreferences["preference"]) {
    setNewsletterBusy(true);
    setNewsletterError("");
    setNewsletterNotice("");
    try {
      const response = await fetch("/api/newsletter/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference }),
      });
      const data = await readResponse<NewsletterPreferences>(response);
      setNewsletter(data);
      setDelivery(data.preference);
      setConfirmUnsubscribe(false);
      $subscribedEmail.set(data.email);
      $newsletterStatus.set(data.preference === "none" ? "unsubscribed" : "already");
      const notices = {
        none: "You've been unsubscribed from new-post emails.",
        tapes: "Saved. Only new tapes will land in your inbox.",
        all: "Saved. New sessions and tapes will land in your inbox.",
      };
      setNewsletterNotice(notices[data.preference]);
    } catch (error) {
      setNewsletter(null);
      setConfirmUnsubscribe(false);
      setNewsletterError(
        `${error instanceof Error ? error.message : "Could not save email preferences."} Reload subscription status before changing delivery.`,
      );
    } finally {
      setNewsletterBusy(false);
    }
  }

  async function exportComments() {
    setExporting(true);
    setAccountError("");
    try {
      const response = await fetch("/api/comments/export");
      if (!response.ok) await readResponse<never>(response);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "zcarr-comments.json";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not export your comments.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="preferences-account-grid">
      <PreferenceWindow
        className="preference-account-window"
        note="replies + email"
        title="Account 1.0"
      >
        <div className="preference-account-identity">
          <div>
            <strong>{user.name}</strong>
            <span className="mono">{user.email || "No verified email"}</span>
          </div>
          <button
            className="preference-button"
            disabled={accountBusy}
            type="button"
            onClick={async () => {
              setAccountBusy(true);
              setAccountError("");
              try {
                const result = await signOut();
                if (result.error) throw new Error(result.error.message ?? "Could not sign out.");
              } catch (error) {
                setAccountError(error instanceof Error ? error.message : "Could not sign out.");
              } finally {
                setAccountBusy(false);
              }
            }}
          >
            Sign out
          </button>
        </div>
        <PreferenceRow
          description="Email me when someone replies to me. Off until you opt in."
          title="Reply notifications"
        >
          <PreferenceToggle
            checked={account?.replyNotifications ?? false}
            disabled={!account || accountBusy || !user.emailVerified}
            label="Reply notifications"
            onChange={async (replyNotifications) => {
              await updateAccount({ replyNotifications });
            }}
          />
        </PreferenceRow>
        <PreferenceRow
          description="Your comments show which paragraph they point at."
          title="Show my ¶ anchors"
        >
          <PreferenceToggle
            checked={account?.showAnchors ?? true}
            disabled={!account || accountBusy}
            label="Show my paragraph anchors"
            onChange={async (showAnchors) => {
              await updateAccount({ showAnchors });
            }}
          />
        </PreferenceRow>
        {!account && !accountError && (
          <p className="preference-status mono" role="status">
            Loading account preferences…
          </p>
        )}
        {!user.emailVerified && (
          <p className="preference-footnote mono">
            A verified email address is required for reply emails.
          </p>
        )}
        {accountError ? (
          <div className="preference-feedback">
            <p role="alert">{accountError}</p>
            <button
              className="preference-button"
              onClick={() => setRefresh((value) => value + 1)}
              type="button"
            >
              Retry account lookup
            </button>
          </div>
        ) : null}
        <p className="preference-status mono" role="status">
          {accountBusy ? "Saving…" : accountNotice}
        </p>
      </PreferenceWindow>

      <PreferenceWindow className="preference-updates-window" note="newsletter" title="Updates 1.0">
        {!user.email || !user.emailVerified ? (
          <p className="preference-copy">
            Sign in with a verified email to manage delivery here, or use the unsubscribe link in
            any email. You don’t need to sign in to unsubscribe from that link.
          </p>
        ) : (
          <>
            <form
              className="preference-email-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (delivery === "none" && newsletter?.preference !== "none")
                  setConfirmUnsubscribe(true);
                else await saveNewsletter(delivery);
              }}
            >
              <label className="sr-only" htmlFor="preferences-email">
                Newsletter email
              </label>
              <input readOnly id="preferences-email" type="email" value={user.email} />
              <button
                className="preference-button preference-button--ink"
                disabled={!newsletter || newsletterBusy || delivery === newsletter.preference}
                type="submit"
              >
                {newsletterBusy ? "Saving…" : "Save"}
              </button>
            </form>
            <PreferenceRow
              description="Every session includes tapes. Nothing unsubscribes from new-post emails."
              title="What lands in your inbox"
            >
              <PreferenceSegments
                disabled={!newsletter || newsletterBusy}
                label="Newsletter delivery"
                options={deliveries}
                value={delivery}
                onChange={(value) => {
                  setDelivery(value);
                  setConfirmUnsubscribe(false);
                  setNewsletterNotice("");
                }}
              />
            </PreferenceRow>
            {!newsletter && !newsletterError && (
              <p className="preference-status mono" role="status">
                Checking your subscription…
              </p>
            )}
            {newsletter ? (
              <div className="preference-subscription-status">
                <p className="mono">
                  {
                    {
                      none: "Not subscribed",
                      tapes: "Subscribed · tapes only",
                      all: "Subscribed · every session",
                    }[newsletter.preference]
                  }
                  {newsletter.subscribedAt && newsletter.preference !== "none"
                    ? ` · since ${new Date(newsletter.subscribedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                    : ""}
                </p>
                {newsletter.preference !== "none" ? (
                  <button
                    className="preference-button"
                    disabled={newsletterBusy}
                    onClick={() => setConfirmUnsubscribe(true)}
                    type="button"
                  >
                    Unsubscribe
                  </button>
                ) : (
                  <button
                    className="preference-button"
                    disabled={newsletterBusy}
                    type="button"
                    onClick={async () => {
                      await saveNewsletter("all");
                    }}
                  >
                    Re-subscribe
                  </button>
                )}
              </div>
            ) : null}
            {confirmUnsubscribe ? (
              <div className="preference-confirmation">
                <p>
                  Stop all new-post emails to {user.email}? Your reply-notification setting will
                  stay unchanged.
                </p>
                <div className="preference-actions">
                  <button
                    className="preference-button preference-button--pink"
                    disabled={newsletterBusy}
                    type="button"
                    onClick={async () => {
                      await saveNewsletter("none");
                    }}
                  >
                    Yes, unsubscribe
                  </button>
                  <button
                    className="preference-button"
                    disabled={newsletterBusy}
                    type="button"
                    onClick={() => {
                      setConfirmUnsubscribe(false);
                      setDelivery(newsletter?.preference ?? "none");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
        {newsletterError ? (
          <div className="preference-feedback">
            <p role="alert">{newsletterError}</p>
            <button
              className="preference-button"
              onClick={() => setRefresh((value) => value + 1)}
              type="button"
            >
              Retry subscription lookup
            </button>
          </div>
        ) : null}
        <p className="preference-status mono" role="status">
          {newsletterNotice}
        </p>
        <p className="preference-footnote mono">
          Prefer a feed? <a href="/rss.xml">rss →</a>
        </p>
      </PreferenceWindow>
      {children({
        signedIn: true,
        commentCount: account?.commentCount ?? null,
        exporting,
        exportComments,
      })}
    </div>
  );
}

export function PreferencesAccount({ providers, children }: PreferencesAccountProps) {
  const { data: session, isPending } = useSession();
  const [signInError, setSignInError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  if (session?.user)
    return (
      <SignedInPreferences key={session.user.id} user={session.user}>
        {children}
      </SignedInPreferences>
    );
  return (
    <div className="preferences-account-grid">
      <PreferenceWindow
        className="preference-account-window"
        note="replies + email"
        title="Account 1.0"
      >
        <div className="preference-copy">
          <p>
            {isPending
              ? "Checking sign-in…"
              : "Sign in to reply and manage account or email preferences. Device settings work without an account."}
          </p>
          <div className="preference-actions">
            {providers.map((provider) => (
              <button
                key={provider}
                className="preference-button"
                disabled={isPending || signingIn}
                type="button"
                onClick={async () => {
                  setSigningIn(true);
                  setSignInError("");
                  try {
                    const result = await signIn.social({
                      provider,
                      callbackURL: window.location.href,
                    });
                    if (result.error) throw new Error(result.error.message ?? "Could not sign in.");
                  } catch (error) {
                    setSignInError(error instanceof Error ? error.message : "Could not sign in.");
                    setSigningIn(false);
                  }
                }}
              >
                {providerNames[provider]}
              </button>
            ))}
          </div>
        </div>
        {!isPending && providers.length === 0 && (
          <p className="preference-footnote mono">Reader sign-in is not configured.</p>
        )}
        <PreferenceRow
          description="Sign in to opt in to emails when someone replies to you."
          title="Reply notifications"
        >
          <PreferenceToggle disabled checked={false} label="Reply notifications" />
        </PreferenceRow>
        <PreferenceRow
          description="Sign in to change the paragraph labels on your comments."
          title="Show my ¶ anchors"
        >
          <PreferenceToggle checked disabled label="Show my paragraph anchors" />
        </PreferenceRow>
        {signInError ? (
          <p className="preference-feedback" role="alert">
            {signInError}
          </p>
        ) : null}
      </PreferenceWindow>
      <PreferenceWindow className="preference-updates-window" note="newsletter" title="Updates 1.0">
        <div className="preference-copy">
          <NewsletterForm />
        </div>
        <p className="preference-copy mono">
          Sign in above to choose every session, tapes only, or nothing. You can also unsubscribe
          directly from any email—no sign-in required.
        </p>
        <p className="preference-footnote mono">
          Prefer a feed? <a href="/rss.xml">rss →</a>
        </p>
      </PreferenceWindow>
      {children({ signedIn: false, commentCount: null, exporting: false })}
    </div>
  );
}
