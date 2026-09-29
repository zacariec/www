import type { ContributionDay } from "@/lib/github";

type PublishedDay = ContributionDay & { sessionIds?: string[] };
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

for (const section of document.querySelectorAll<HTMLElement>("[data-commits]")) {
  const readout = section.querySelector<HTMLElement>("[data-heat-readout]");
  if (!readout) continue;
  section.addEventListener("zc:heat-day", (event) => {
    const { day } = (event as CustomEvent<{ day: PublishedDay | null }>).detail;
    if (!day) {
      readout.textContent = window.matchMedia("(max-width: 720px)").matches
        ? "Tap a day."
        : "Hover a day.";
      return;
    }
    const date = dateFormatter.format(new Date(`${day.iso}T00:00:00Z`));
    const activity = day.future
      ? "Future date"
      : `${day.count.toLocaleString("en-GB")} ${day.count === 1 ? "contribution" : "contributions"}`;
    const published = day.sessionIds?.length ? ` · ${day.sessionIds.join(", ")} published` : "";
    readout.textContent = `${date} · ${activity}${published}`;
  });
}
