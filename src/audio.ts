import { AMBIENT_VOLUME, MUSIC_FILE, RECORDINGS } from "./config";
import { asset, readSetting, saveSetting, updateToggle } from "./dom";

export type Ambient = { start(): void; duck(speaking: boolean): void };
export type Voice = { play(text: string): number; isEnabled(): boolean };

export function createAmbient(button: HTMLButtonElement): Ambient {
  let enabled = readSetting("ambient");
  let speaking = false;
  let music: HTMLAudioElement | null = null;
  let fadeFrame = 0;

  function fade(volume: number, duration: number, done?: () => void): void {
    cancelAnimationFrame(fadeFrame);
    if (!music) return;
    const audio = music;
    const from = audio.volume;
    const started = performance.now();
    function frame(now: number): void {
      const progress = Math.max(0, Math.min(1, (now - started) / duration));
      audio.volume = from + (volume - from) * progress;
      if (progress < 1) fadeFrame = requestAnimationFrame(frame);
      else done?.();
    }
    fadeFrame = requestAnimationFrame(frame);
  }

  function start(): void {
    if (!enabled || document.hidden) return;
    if (!music) {
      music = new Audio(asset(MUSIC_FILE));
      music.loop = true;
      music.preload = "none";
      music.volume = 0;
    }
    const audio = music;
    void audio.play().then(() => {
      if (!enabled || document.hidden) {
        audio.pause();
        return;
      }
      fade(speaking ? AMBIENT_VOLUME * 0.35 : AMBIENT_VOLUME, 1200);
    }).catch(() => {});
  }

  function duck(active: boolean): void {
    speaking = active;
    if (enabled && music && !music.paused) {
      fade(active ? AMBIENT_VOLUME * 0.35 : AMBIENT_VOLUME, 400);
    }
  }

  updateToggle(button, enabled);
  button.addEventListener("click", () => {
    enabled = !enabled;
    saveSetting("ambient", enabled);
    updateToggle(button, enabled);
    if (enabled) start();
    else fade(0, 700, () => music?.pause());
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(fadeFrame);
      music?.pause();
      if (music) music.volume = 0;
    } else if (music) start();
  });
  return { start, duck };
}

export function createVoice(button: HTMLButtonElement, ambient: Ambient): Voice {
  let enabled = readSetting("voice");
  let unlocked = false;
  let current: HTMLAudioElement | null = null;
  function stop(): void {
    current?.pause();
    current = null;
    ambient.duck(false);
  }
  function play(text: string): number {
    stop();
    const recording = RECORDINGS.get(text);
    if (!enabled || !unlocked || !recording) return 0;
    const audio = new Audio(asset(`assets/voice/${recording.file}.mp3`));
    current = audio;
    function finish(): void {
      if (current !== audio) return;
      current = null;
      ambient.duck(false);
    }
    audio.onended = finish;
    audio.onerror = finish;
    ambient.duck(true);
    void audio.play().catch(finish);
    return recording.duration;
  }
  function unlock(event: Event): void {
    unlocked = true;
    if (event.target instanceof Element && event.target.closest("#amb")) return;
    ambient.start();
  }
  updateToggle(button, enabled);
  addEventListener("pointerdown", unlock, { once: true, capture: true });
  addEventListener("keydown", unlock, { once: true, capture: true });
  button.addEventListener("click", () => {
    enabled = !enabled;
    unlocked = true;
    saveSetting("voice", enabled);
    updateToggle(button, enabled);
    if (!enabled) stop();
  });
  return { play, isEnabled: () => enabled };
}



