import { atom } from "nanostores";

export type NewsletterStatus =
  | "idle"
  | "loading"
  | "success"
  | "already"
  | "unsubscribing"
  | "unsubscribed"
  | "error";

/** Shared across all NewsletterForm islands */
export const $newsletterStatus = atom<NewsletterStatus>("idle");
export const $subscribedEmail = atom<string>("");
