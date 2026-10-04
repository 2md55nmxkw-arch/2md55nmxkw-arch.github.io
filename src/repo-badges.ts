type RepoStats = Record<string, { stars?: number; language?: string }>;

/** Build-time repository stats (from #repo-stats JSON) render as badges on the project cards. */

function starIcon(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2l2.9 6.26 6.6.56-5 4.36 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.36 6.6-.56L12 2z");
  svg.appendChild(path);
  return svg;
}

export function initRepoBadges(): void {
  const source = document.getElementById("repo-stats")?.textContent;
  if (!source) return;
  let stats: RepoStats;
  try {
    stats = JSON.parse(source) as RepoStats;
  } catch {
    return;
  }
  for (const panel of document.querySelectorAll<HTMLElement>(".project-panel")) {
    const repo = panel.dataset.project;
    if (!repo) continue;
    const entry = stats[`2md55nmxkw-arch/${repo}`];
    if (!entry) continue;
    const stars = entry.stars ?? 0;
    const language = entry.language ?? "";
    if (stars <= 0 && !language) continue;
    const copy = panel.querySelector<HTMLElement>(".project-copy");
    if (!copy) continue;
    const badges = document.createElement("p");
    badges.className = "repo-badges";
    badges.setAttribute("aria-hidden", "true");
    if (stars > 0) {
      const star = document.createElement("span");
      star.className = "repo-badge";
      star.append(starIcon(), document.createTextNode(String(stars)));
      star.setAttribute("title", `${stars} stars on GitHub`);
      badges.appendChild(star);
    }
    if (language) {
      const lang = document.createElement("span");
      lang.className = "repo-badge";
      lang.textContent = language;
      badges.appendChild(lang);
    }
    const kind = copy.querySelector<HTMLElement>(".project-kind");
    if (kind && kind.nextElementSibling) copy.insertBefore(badges, kind.nextElementSibling);
    else copy.appendChild(badges);
  }
}
