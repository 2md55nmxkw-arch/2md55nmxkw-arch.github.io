import { MASCOT_NAME, REDUCED_MOTION } from "./config";
import { asset, element } from "./dom";
import { PERIODS, SCENE_FILES, sceneForHour, seasonForMonth, type Period, type Season } from "./scene-data";

export function astanaTime(): { hour: number; minute: number; month: number } {
  const date = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return { hour: date.getUTCHours(), minute: date.getUTCMinutes(), month: date.getUTCMonth() + 1 };
}

export function greeting(hour: number): string {
  if (hour >= 23 || hour < 5) return "Still awake? Same.";
  if (hour < 12) return `Good morning! I'm ${MASCOT_NAME}.`;
  if (hour < 18) return `Good afternoon! I'm ${MASCOT_NAME}.`;
  return `Good evening! I'm ${MASCOT_NAME}.`;
}

export function initScenes(hero: HTMLElement): () => HTMLVideoElement {
  const videos: Record<Period, HTMLVideoElement> = {
    night: element<HTMLVideoElement>("bgN"),
    morning: element<HTMLVideoElement>("bgM"),
    day: element<HTMLVideoElement>("bgD"),
    sunset: element<HTMLVideoElement>("bgS"),
  };
  const clock = element<HTMLButtonElement>("clock");
  const hours = element("ch");
  const minutes = element("cm");
  const caption = element("cs");
  const poster = element<HTMLImageElement>("hero-poster");
  let active = sceneForHour(astanaTime().hour);
  let season = seasonForMonth(astanaTime().month);
  let activeFile = "";
  let manual: Period | null = null;
  let visible = true;
  let preloadSeason: Season | null = null;
  let generation = 0;

  function play(video: HTMLVideoElement): void {
    if (!REDUCED_MOTION && visible && !document.hidden) void video.play().catch(() => {});
  }

  function load(period: Period, preload: "metadata" | "auto"): void {
    const video = videos[period];
    const file = SCENE_FILES[season][period];
    video.poster = asset(`assets/video/${file}.jpg`);
    video.dataset.scene = file;
    if (REDUCED_MOTION) return;
    video.preload = preload;
    if (!video.getAttribute("src")) {
      video.src = asset(`assets/video/${file}.mp4`);
      video.load();
    }
  }

  function loadRemaining(): void {
    const connection = (navigator as Navigator & { connection?: { saveData: boolean } }).connection;
    if (REDUCED_MOTION || connection?.saveData || preloadSeason === season) return;
    preloadSeason = season;
    const batch = generation;
    const remaining = PERIODS.filter((period) => period !== active);
    function next(): void {
      if (batch !== generation) return;
      const period = remaining.shift();
      if (!period) return;
      const video = videos[period];
      if (video.getAttribute("src")) {
        setTimeout(next, 1000);
        return;
      }
      let complete = false;
      const done = () => {
        if (complete) return;
        complete = true;
        video.removeEventListener("loadedmetadata", done);
        video.removeEventListener("error", done);
        setTimeout(next, 1000);
      };
      video.addEventListener("loadedmetadata", done);
      video.addEventListener("error", done);
      load(period, "metadata");
      setTimeout(done, 5000);
    }
    setTimeout(next, 1500);
  }

  function updateClock(): void {
    const { hour, minute } = astanaTime();
    hours.textContent = String(hour).padStart(2, "0");
    minutes.textContent = String(minute).padStart(2, "0");
    if (hour >= 23 || hour < 5) caption.textContent = "she's awake too";
    else if (hour < 12) caption.textContent = "good morning";
    else if (hour < 18) caption.textContent = "good afternoon";
    else caption.textContent = "good evening";
  }

  function updateScene(force = false): void {
    const time = astanaTime();
    const nextSeason = seasonForMonth(time.month);
    const next = manual ?? sceneForHour(time.hour);
    const file = SCENE_FILES[nextSeason][next];
    if (!force && file === activeFile) return;
    if (nextSeason !== season) {
      generation++;
      season = nextSeason;
      preloadSeason = null;
      for (const video of Object.values(videos)) {
        video.pause();
        video.removeAttribute("src");
        video.preload = "none";
        video.load();
      }
    }
    active = next;
    activeFile = file;
    poster.src = asset(`assets/video/${file}.jpg`);
    for (const period of PERIODS) {
      const video = videos[period];
      video.classList.toggle("off", period !== active);
      if (period === active) {
        load(period, "auto");
        play(video);
      } else {
        setTimeout(() => { if (period !== active) video.pause(); }, 1900);
      }
    }
    if (videos[active].readyState >= 2) loadRemaining();
  }

  for (const video of Object.values(videos)) {
    const ready = () => { if (video === videos[active]) loadRemaining(); };
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", ready);
  }
  updateClock();
  updateScene(true);
  setInterval(updateClock, 1000);
  setInterval(updateScene, 30000);
  clock.addEventListener("click", () => {
    manual = PERIODS[(PERIODS.indexOf(active) + 1) % PERIODS.length];
    updateScene();
  });

  if (!REDUCED_MOTION && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play(videos[active]);
      else videos[active].pause();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) videos[active].pause();
    else play(videos[active]);
  });
  return () => videos[active];
}
