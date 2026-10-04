export function initScrollScenes(): void {
  const link = document.querySelector<HTMLAnchorElement>('.menu a[href="#work"]');
  const work = document.getElementById("work");
  if (!work || !link || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }, { rootMargin: "-15% 0px -15% 0px" }).observe(work);
}
