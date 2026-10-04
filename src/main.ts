import { MASCOT_NAME } from "./config";
import { element, restoreContent } from "./dom";
import { createAmbient, createVoice } from "./audio";
import { initScenes } from "./scenes";
import { initMascot, initMascotPosition, initStartScreen, initMikaSpeech } from "./mascot";
import { initHeader, initReveal } from "./effects";
import { initScrollScenes } from "./scroll";
import { initCertificates } from "./certificates";
import { initTerminal } from "./terminal";
import { initMikaReactions } from "./mika-reactions";
import { initDiscordContact } from "./discord";
import { initAchievements, unlock } from "./achievements";
import { initRepoBadges } from "./repo-badges";

function main(): void {
  // Restore the theme chosen through the terminal before first paint effects.
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  } catch {
    // Storage is optional.
  }
  const hero = element("hero");
  element("who").textContent = MASCOT_NAME;
  const activeVideo = initScenes(hero);
  const ambient = createAmbient(element<HTMLButtonElement>("amb"));
  const voice = createVoice(element<HTMLButtonElement>("snd"), ambient);
  const speech = initMikaSpeech(voice);
  const startIntro = initMascot(voice);
  initMascotPosition(hero);
  initHeader();
  initReveal();
  initCertificates();
  initScrollScenes();
  initTerminal();
  initMikaReactions(speech);
  initAchievements((line) => speech.say(line));
  initRepoBadges();
  initDiscordContact((line) => speech.say(line));
  initStartScreen(activeVideo(), startIntro);

  // Source readers get a greeting in the console and their achievement.
  console.log(
    "%c2md.arch%c — reading the console, huh? Right instinct.\n" +
    "Unlock the source-reader secret: run %cunlock(\"source\")%c in this console.\n" +
    "Or take the scenic route: press ` and type scan.",
    "font-weight:bold;color:#a78bfa", "", "color:#a78bfa", ""
  );
  (window as Window & { unlockSecret?: (id: string) => void }).unlockSecret = (id) => {
    if (id === "source") unlock("source");
  };

  // Offline support for the hosted page; file:// and single-file builds skip registration.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

try {
  main();
} catch (error) {
  restoreContent();
  console.error("Portfolio initialization failed:", error);
}
