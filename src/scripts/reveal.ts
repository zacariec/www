/**
 * Global reveal-on-scroll helper.
 *
 * Any element with `data-reveal` starts hidden (via CSS in globals.css), then
 * gets `is-visible` added when it scrolls into the viewport. CSS handles the
 * transition. Stagger via inline `style="--reveal-delay: 80ms"` per element.
 *
 * For React islands that mount dynamic content (e.g. comment-section appending
 * a new comment), call `observeReveal(el)` from a useEffect after mount.
 */

let io: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io!.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
  );
  return io;
}

export function observeReveal(el: Element): void {
  getObserver().observe(el);
}

function init(): void {
  document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => {
    getObserver().observe(el);
  });
}

// Run on initial page load AND after every Astro view transition.
document.addEventListener("astro:page-load", init);
