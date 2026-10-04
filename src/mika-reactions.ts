import { REDUCED_MOTION } from "./config";
import { astanaTime } from "./scenes";
import type { MikaSpeech } from "./mascot";
import { unlock } from "./achievements";

type IdleLine = { minutes: number; text: string };

const IDLE_LINES: IdleLine[] = [
  { minutes: 2, text: "Still there? The stars are nice tonight." },
  { minutes: 5, text: "I'll be here when you're back. Watching the city." },
  { minutes: 12, text: "Okay, I'm people-watching. There are three of them. Interesting." },
];

const NIGHT_LINES = [
  "Late night browsing? Respect.",
  "The city is quieter now. I like it.",
];

const SCROLL_LINES = [
  "Careful with the scrollbar, it's a long way down.",
];

const TERMINAL_LINE = "Ooh, a terminal. Now this is my kind of page.";

const KONAMI_LINE = "The old code! Up up down down... you've done this before, haven't you?";
const KONAMI_ALL_SCENES_LINE = "Rooftop tour: every season, every hour. Try the clock, they rotate.";


/** Reactions that make Mika feel present: idle visitors, late hours, big scrolls, the terminal. */
export function initMikaReactions(speech: MikaSpeech): void {
  const say = speech.say;

  let idleStep = 0;
  let idleTimer = 0;
  let nightNoted = false;
  let terminalNoted = false;
  let scrollNoted = false;

  function resetIdle(): void {
    clearTimeout(idleTimer);
    idleStep = 0;
    scheduleIdle();
  }

  function scheduleIdle(): void {
    const next = IDLE_LINES[idleStep];
    if (!next) return;
    idleTimer = setTimeout(() => {
      idleStep++;
      say(next.text);
      scheduleIdle();
    }, next.minutes * 60 * 1000);
  }

  const activity = () => resetIdle();
  addEventListener("pointerdown", activity, { passive: true });
  addEventListener("keydown", activity);
  addEventListener("scroll", activity, { passive: true });
  scheduleIdle();

  // One-time note when a deep night visitor arrives (or stays until deep night).
  function noteNight(): void {
    if (nightNoted) return;
    const hour = astanaTime().hour;
    if (hour >= 23 || hour < 5) {
      nightNoted = true;
      setTimeout(() => say(NIGHT_LINES[0]), 30000);
    }
  }
  noteNight();
  setInterval(noteNight, 15 * 60 * 1000);

  // React once when the terminal opens for the first time.
  const terminal = document.getElementById("terminal");
  if (terminal) {
    new MutationObserver(() => {
      if (!terminal.hidden && !terminalNoted) {
        terminalNoted = true;
        setTimeout(() => say(TERMINAL_LINE), 1200);
      }
    }).observe(terminal, { attributeFilter: ["hidden"] });
  }

  // React once to a committed reader: someone who scrolls deep into the page.
  const contact = document.getElementById("contact");
  if (contact && "IntersectionObserver" in window && !REDUCED_MOTION) {
    new IntersectionObserver((entries, observer) => {
      if (scrollNoted) return observer.disconnect();
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        scrollNoted = true;
        say(SCROLL_LINES[0]);
        observer.disconnect();
      }
    }, { threshold: 0.4 }).observe(contact);
  }

  // Konami code: the classic sequence earns a rooftop tour of all 16 scenes.
  const konami = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let konamiIndex = 0;
  addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    const key = event.key.toLowerCase();
    konamiIndex = key === konami[konamiIndex] ? konamiIndex + 1 : key === konami[0] ? 1 : 0;
    if (konamiIndex < konami.length) return;
    konamiIndex = 0;
    if (unlock("konami")) {
      say(KONAMI_LINE);
      // Cycle through all four periods of the current season with a small pause.
      const clock = document.getElementById("clock");
      if (clock && !REDUCED_MOTION) {
        let step = 0;
        const tour = setInterval(() => {
          clock.click();
          step++;
          if (step < 4) say(KONAMI_ALL_SCENES_LINE);
          if (step >= 4) clearInterval(tour);
        }, 1600);
      }
    }
  });
}
