export type AchievementId =
  | "terminal"
  | "underhood"
  | "sudo"
  | "rm"
  | "vim"
  | "mika"
  | "matrix"
  | "coffee"
  | "hello"
  | "scan"
  | "konami"
  | "source"
  | "wish"
  | "certificates"
  | "discord";

export type Achievement = {
  id: AchievementId;
  hint: string;
};

/** Every secret the page keeps. Order defines the display order. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "terminal", hint: "opened the terminal" },
  { id: "sudo", hint: "tried powers they do not have" },
  { id: "rm", hint: "attempted to delete the rooftop" },
  { id: "vim", hint: "entered the editor of legend" },
  { id: "mika", hint: "met the mascot by name" },
  { id: "matrix", hint: "checked for spoons" },
  { id: "coffee", hint: "asked about fuel" },
  { id: "hello", hint: "said hello" },
  { id: "scan", hint: "scanned the page itself" },
  { id: "underhood", hint: "looked under the hood" },
  { id: "wish", hint: "made a wish on the stars" },
  { id: "certificates", hint: "reviewed the records" },
  { id: "discord", hint: "copied the fastest contact" },
  { id: "source", hint: "read the page source" },
  { id: "konami", hint: "knows the old code" },
];

const STORAGE_KEY = "secrets";

function readProgress(): Record<string, true> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, true>) : {};
  } catch {
    return {};
  }
}

function writeProgress(progress: Record<string, true>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage is optional; the hunt just does not persist.
  }
}

const listeners: ((id: AchievementId) => void)[] = [];

export function unlock(id: AchievementId): boolean {
  const progress = readProgress();
  if (progress[id]) return false;
  progress[id] = true;
  writeProgress(progress);
  for (const listener of listeners) listener(id);
  return true;
}

export function onUnlock(listener: (id: AchievementId) => void): void {
  listeners.push(listener);
}

export function progressReport(): { unlocked: string[]; total: number; hints: string[] } {
  const progress = readProgress();
  return {
    unlocked: ACHIEVEMENTS.filter((achievement) => progress[achievement.id]).map((achievement) => achievement.hint),
    total: ACHIEVEMENTS.length,
    hints: ACHIEVEMENTS.filter((achievement) => !progress[achievement.id]).map((achievement) => achievement.hint),
  };
}

/** The mascot reacts to milestones and fully completed hunts. */
export function initAchievements(say: (line: string) => void): void {
  const milestone = ACHIEVEMENTS.length;
  let announced: Record<string, true> = {};
  try {
    announced = JSON.parse(localStorage.getItem("secrets-noted") ?? "{}");
  } catch {
    announced = {};
  }
  let count = Object.keys(readProgress()).length;
  const reactions: Record<number, string> = {
    1: "First secret found! There are more where that came from.",
    5: "Five secrets down. You're good at this.",
    10: "Ten secrets. Okay, you're showing off now.",
    [milestone]: "All of them?! Every single secret. I'm honestly impressed. You belong on this rooftop.",
  };
  /** Count is recomputed on each unlock; milestones speak once each. */
  const announce = (): void => {
    count = Object.keys(readProgress()).length;
    if (announced[String(count)]) return;
    announced[String(count)] = true;
    try {
      localStorage.setItem("secrets-noted", JSON.stringify(announced));
    } catch {
      // Optional.
    }
    const reaction = reactions[count];
    if (reaction) say(reaction);
  };
  onUnlock(announce);
}