for (const timeline of document.querySelectorAll<HTMLElement>("[data-timeline]")) {
  const navigation = timeline.querySelector<HTMLElement>("[data-timeline-filters]");
  if (!navigation) continue;
  const links = [...navigation.querySelectorAll<HTMLAnchorElement>("[data-timeline-filter]")];
  const entries = [...timeline.querySelectorAll<HTMLElement>("[data-timeline-kind]")];
  const empty = timeline.querySelector<HTMLElement>("[data-timeline-empty]");
  const status = timeline.querySelector<HTMLElement>("[data-timeline-status]");

  function synchronize() {
    const current = new URL(window.location.href);
    const requested = current.searchParams.get("filter");
    const selected =
      links.find((link) => link.dataset.timelineFilter === requested)?.dataset.timelineFilter ??
      "all";
    let count = 0;
    for (const entry of entries) {
      entry.hidden = selected !== "all" && entry.dataset.timelineKind !== selected;
      if (!entry.hidden) count++;
    }
    for (const link of links) {
      if (link.dataset.timelineFilter === selected) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
      const url = new URL(current);
      if (link.dataset.timelineFilter === "all") url.searchParams.delete("filter");
      else if (link.dataset.timelineFilter)
        url.searchParams.set("filter", link.dataset.timelineFilter);
      link.href = `${url.pathname}${url.search}${url.hash}`;
    }
    if (empty) {
      empty.hidden = count > 0;
      empty.textContent =
        selected === "pushes" && timeline.dataset.githubAvailable === "false"
          ? "Pushes will appear when GitHub activity is available."
          : "No entries in this view yet.";
    }
    if (status) status.textContent = `${count} ${count === 1 ? "entry" : "entries"} shown.`;
  }

  navigation.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("[data-timeline-filter]")
        : null;
    if (!link) return;
    event.preventDefault();
    const url = new URL(window.location.href);
    if (link.dataset.timelineFilter === "all") url.searchParams.delete("filter");
    else if (link.dataset.timelineFilter)
      url.searchParams.set("filter", link.dataset.timelineFilter);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    synchronize();
  });

  navigation.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const index = links.findIndex((link) => link === document.activeElement);
    if (index < 0) return;
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % links.length;
    else if (event.key === "ArrowLeft") next = (index + links.length - 1) % links.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = links.length - 1;
    else return;
    event.preventDefault();
    links[next].focus();
  });

  window.addEventListener("popstate", synchronize);
  window.addEventListener("pageshow", synchronize);
  synchronize();
}
