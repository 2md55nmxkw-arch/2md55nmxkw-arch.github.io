type Setting = "voice" | "ambient";

const embeddedData = document.getElementById("embedded-assets")?.textContent;
const embeddedAssets: Record<string, string> = embeddedData ? JSON.parse(embeddedData) : {};

export function asset(path: string): string {
  return embeddedAssets[path] ?? path;
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node as T;
}

export function readSetting(key: Setting): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

export function saveSetting(key: Setting, enabled: boolean): void {
  try {
    localStorage.setItem(key, enabled ? "on" : "off");
  } catch {
    // Storage is optional; the controls still work without it.
  }
}

export function updateToggle(button: HTMLButtonElement, enabled: boolean): void {
  button.classList.toggle("off", !enabled);
  button.setAttribute("aria-pressed", String(enabled));
}

export function resizeCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export function restoreContent(): void {
  document.documentElement.classList.remove("lock");
  document.getElementById("start")?.setAttribute("hidden", "");
  document.querySelectorAll(".reveal-ready").forEach((node) => node.classList.remove("reveal-ready"));
}
