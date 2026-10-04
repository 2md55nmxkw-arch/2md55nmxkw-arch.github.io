import { build } from "esbuild";
import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  legalComments: "none",
});
const script = result.outputFiles[0].text;

// Repository stats: fetched at build time with a cache file, so offline builds keep the badges.
const REPOS = ["2md55nmxkw-arch/endfield-il2dump", "2md55nmxkw-arch/Loliland-ModLoader", "2md55nmxkw-arch/LuauEmu"];
const statsPath = path.join(root, "assets/repo-stats.json");
let repoStats = {};
try {
  repoStats = JSON.parse(await readFile(statsPath, "utf8"));
} catch {
  // No cache yet.
}
async function refreshStats() {
  const fresh = { ...repoStats };
  for (const repo of REPOS) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "2md-arch-build" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      fresh[repo] = { stars: data.stargazers_count ?? 0, language: data.language ?? "" };
    } catch {
      // Offline or rate-limited: keep the cached value.
    }
  }
  return fresh;
}
repoStats = await refreshStats();
await writeFile(statsPath, JSON.stringify(repoStats, null, 2) + "\n");

const embedded = {};
for (const folder of ["", "voice", "video", "certificates", "fonts"]) {
  const files = await readdir(path.join(root, "assets", folder));
  for (const file of files) {
    const extension = path.extname(file);
    const mime = { ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2" }[extension];
    if (!mime) continue;
    const relativePath = ["assets", folder, file].filter(Boolean).join("/");
    const bytes = await readFile(path.join(root, relativePath));
    const url = `data:${mime};base64,${bytes.toString("base64")}`;
    embedded[relativePath] = url;
  }
}

let css = await readFile(path.join(root, "style.css"), "utf8");
css = css.replace(/url\("(assets\/[^"\s]+)"\)/g, (original, source) => {
  const url = embedded[source];
  if (!url) throw new Error(`Cannot embed CSS asset: ${source}`);
  return `url("${url}")`;
});
let html = await readFile(path.join(root, "index.html"), "utf8");
for (const marker of ['<link rel="stylesheet" href="style.css" />', '<script src="scripts.js"></script>']) {
  if (!html.includes(marker)) throw new Error(`Missing build marker: ${marker}`);
}
// Project badges: stats are read at runtime from assets/repo-stats.json (kept fresh by each build).
const statsScript = `<script id="repo-stats" type="application/json">${JSON.stringify(repoStats).replace(/</g, "\\u003c")}</script>`;
html = html.replace("<script src=\"scripts.js\"></script>", () => `${statsScript}\n<script src="scripts.js"></script>`);
await writeFile(path.join(root, "index.html"), html);
html = html.replace('<link rel="stylesheet" href="style.css" />', () => `<style>\n${css}\n</style>`);
html = html.replace(/(src|data-src|href)="(assets\/[^"\s]+)"/g, (original, attribute, source) => {
  const url = embedded[source];
  if (!url) throw new Error(`Cannot embed asset: ${source}`);
  return `${attribute}="${url}"`;
});
const data = JSON.stringify(embedded).replace(/</g, "\\u003c");
const safeScript = script.replace(/<\/script/gi, "<\\/script");
html = html.replace('<script src="scripts.js"></script>', () =>
  `<script id="embedded-assets" type="application/json">${data}</script>\n<script>\n${safeScript}\n</script>`);
await mkdir(path.join(root, "dist"), { recursive: true });
await writeFile(path.join(root, "scripts.js"), script);
await writeFile(path.join(root, "dist/index.single-file.html"), html);
console.log("Built scripts.js and dist/index.single-file.html");
