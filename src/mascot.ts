import { MASCOT_NAME, DIALOGUE, REDUCED_MOTION } from './config';
import { element } from './dom';
import { astanaTime, greeting } from './scenes';
import type { Voice } from './audio';
import { showShootingStars } from './stars';
import { unlock } from './achievements';

export function initMascotPosition(hero: HTMLElement): void {
  const button = element("hit");
  const bubble = element("bubble");
  const dot = element("dot");
  const poster = element<HTMLImageElement>("hero-poster");
  function position(): void {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const portrait = width <= height;
    // Use the current poster dimensions to match the video's cover crop.
    const sourceWidth = poster.naturalWidth || 1344;
    const sourceHeight = poster.naturalHeight || 768;
    // Mirrors the video's object-fit: cover; the portrait crop shifts to 91% (see style.css).
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const offsetX = (width - sourceWidth * scale) * (portrait ? 0.91 : 0.8);
    const offsetY = (height - sourceHeight * scale) * 0.5;
    const unit = portrait ? width / 100 : Math.min(width, height * 1.7778) / 100;
    const mouthX = offsetX + 0.775 * sourceWidth * scale;
    const mouthY = offsetY + 0.452 * sourceHeight * scale;
    const gap = unit * 0.7;
    const tail = unit * (portrait ? 3.4 : 1.4);
    const tipOffset = unit * (portrait ? 2.4 : 0.9);
    button.style.left = `${offsetX + 0.68 * sourceWidth * scale}px`;
    button.style.top = `${offsetY + 0.31 * sourceHeight * scale}px`;
    button.style.width = `${0.29 * sourceWidth * scale}px`;
    button.style.height = `${0.56 * sourceHeight * scale}px`;
    dot.style.left = `${mouthX - unit * 0.35}px`;
    dot.style.top = `${mouthY - unit * 0.35}px`;
    bubble.style.right = `${width - mouthX + gap + tipOffset}px`;
    bubble.style.bottom = `${height - mouthY + gap * 0.8 + tail}px`;
    bubble.style.maxWidth = `${Math.max(150, Math.min(mouthX - gap + tipOffset - 28, unit * (portrait ? 52 : 26)))}px`;
  }
  position();
  addEventListener("resize", position);
  poster.addEventListener("load", position);
}

export type MikaSpeech = { say(line: string): void; busy(): boolean };

/** Shared speech: bubble, typing animation, live region and optional voice recording. */
export function initMikaSpeech(voice: Voice): MikaSpeech {
  const bubble = element("bubble");
  const text = element("txt");
  const status = element("mascot-status");
  const dot = element("dot");
  let typingTimer = 0;
  let active = false;

  function say(line: string): void {
    clearInterval(typingTimer);
    bubble.classList.add("show");
    bubble.classList.remove("typing");
    active = true;
    // Announce one complete sentence; only the visual copy types letter by letter.
    status.textContent = `${MASCOT_NAME}: ${line}`;
    const duration = voice.play(line);
    if (REDUCED_MOTION) {
      text.textContent = line;
      dot.classList.remove("on");
      return;
    }
    const delay = duration ? Math.max(40, Math.round(duration * 900 / line.length)) : 34;
    let characters = 0;
    text.textContent = "";
    bubble.classList.add("typing");
    dot.classList.add("on");
    typingTimer = setInterval(() => {
      text.textContent = line.slice(0, ++characters);
      if (characters < line.length) return;
      clearInterval(typingTimer);
      bubble.classList.remove("typing");
      dot.classList.remove("on");
      active = false;
    }, delay);
  }

  function busy(): boolean {
    return active;
  }

  return { say, busy };
}

export function initMascot(voice: Voice): () => void {
  const button = element<HTMLButtonElement>("hit");
  const soundButton = element<HTMLButtonElement>("snd");
  let lineIndex = 0;
  let introTimer = 0;
  let holdTimer = 0;
  let greetingShown = false;
  let interacted = false;
  let holdTriggered = false;
  let typedKeys = "";
  const speech = initMikaSpeech(voice);
  const say = speech.say;

  function stopIntro(): void {
    interacted = true;
    clearTimeout(introTimer);
  }

  function wish(): void {
    stopIntro();
    unlock("wish");
    say("Make a wish.");
    if (!REDUCED_MOTION) showShootingStars();
  }

  button.addEventListener("click", () => {
    if (holdTriggered) {
      holdTriggered = false;
      return;
    }
    stopIntro();
    if (!greetingShown && voice.isEnabled()) {
      greetingShown = true;
      say(greeting(astanaTime().hour));
      return;
    }
    say(DIALOGUE[lineIndex++ % DIALOGUE.length].text);
  });
  soundButton.addEventListener("click", () => {
    stopIntro();
    if (!voice.isEnabled()) return;
    greetingShown = true;
    say(greeting(astanaTime().hour));
  });
  button.addEventListener("pointerdown", () => {
    clearTimeout(holdTimer);
    holdTriggered = false;
    holdTimer = setTimeout(() => {
      holdTriggered = true;
      wish();
    }, 900);
  });
  for (const event of ["pointerup", "pointerleave", "pointercancel"]) {
    button.addEventListener(event, () => clearTimeout(holdTimer));
  }
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  addEventListener("keydown", (event) => {
    if (event.key.length !== 1) return;
    typedKeys = (typedKeys + event.key.toLowerCase()).slice(-4);
    if (typedKeys !== "mika") return;
    typedKeys = "";
    wish();
  });

  return () => {
    introTimer = setTimeout(() => {
      greetingShown = true;
      say(greeting(astanaTime().hour));
      introTimer = setTimeout(() => {
        if (!interacted) say("Psst, click me. I have more stories.");
      }, 4200);
    }, 600);
  };
}

export function initStartScreen(video: HTMLVideoElement, startIntro: () => void): void {
  const screen = element<HTMLButtonElement>("start");
  const prompt = element("stp");
  const logo = document.querySelector(".logo svg");
  const slot = screen.querySelector(".slot");
  if (logo && slot) slot.appendChild(logo.cloneNode(true));
  let closed = false;
  let expiry = 0;

  function close(focus: boolean): void {
    if (closed) return;
    closed = true;
    clearTimeout(expiry);
    screen.classList.add("hide");
    screen.setAttribute("aria-hidden", "true");
    screen.inert = true;
    setTimeout(() => { screen.hidden = true; }, REDUCED_MOTION ? 0 : 500);
    document.documentElement.classList.remove("lock");
    if (focus || document.activeElement === screen) {
      element("page-title").focus({ preventScroll: true });
    }
    startIntro();
  }

  function ready(): void {
    prompt.textContent = "Tap to start";
  }
  screen.addEventListener("click", () => close(true), { once: true });
  if (video.readyState >= 3 || REDUCED_MOTION) ready();
  else {
    video.addEventListener("canplay", ready, { once: true });
    video.addEventListener("error", ready, { once: true });
    setTimeout(ready, 1800);
  }
  // Activate the overlay only after its escape paths are installed.
  expiry = setTimeout(() => close(false), 3200);
  screen.hidden = false;
  document.documentElement.classList.add("lock");
  screen.focus({ preventScroll: true });
}


