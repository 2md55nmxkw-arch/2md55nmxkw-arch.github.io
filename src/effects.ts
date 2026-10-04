import { REDUCED_MOTION } from "./config";

/** Fade-and-rise reveal. Elements stay visible until the observer is installed. */
export function initReveal(): void {
  const nodes = document.querySelectorAll<HTMLElement>("[data-r]");
  if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("in"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  nodes.forEach((node) => {
    node.classList.add("reveal-ready");
    observer.observe(node);
  });
}

/** Header gains a soft backdrop once the page scrolls. */
export function initHeader(): void {
  const bar = document.querySelector<HTMLElement>(".bar");
  if (!bar) return;
  let pending = false;
  const update = () => { pending = false; bar.classList.toggle("sc", scrollY > 60); };
  addEventListener("scroll", () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}
