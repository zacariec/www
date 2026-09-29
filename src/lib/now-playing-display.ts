import type { NowPlayingData } from "@/lib/schemas/spotify";

export function trackProgress(state: NowPlayingData, now = Date.now()): number {
  const elapsed = state.playing ? Math.max(0, now - state.fetchedAt) : 0;
  return Math.min(state.durationMs, Math.max(0, state.progressMs + elapsed));
}

export function trackTime(milliseconds: number): string {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function playedAgo(playedAt: string | null, now = Date.now()): string {
  if (!playedAt) return "";
  const seconds = Math.max(0, Math.floor((now - Date.parse(playedAt)) / 1_000));
  if (seconds < 60) return "just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
