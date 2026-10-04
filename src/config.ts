type Recording = { text: string; file: string; duration: number };

export const MASCOT_NAME = "Mika";
export const AMBIENT_VOLUME = 0.5;
export const MUSIC_FILE = "assets/Seven_Floors_Above.mp3";
export const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const FINE_POINTER = matchMedia("(hover: hover) and (pointer: fine)").matches;

export const DIALOGUE: Recording[] = [
  { text: "Welcome to 2md's little corner of the internet.", file: "line-01-welcome", duration: 3.37 },
  { text: "2md designs spaces and writes code.", file: "line-02-designs", duration: 3.32 },
  { text: "Want to see the code? It's all on GitHub.", file: "line-03-code", duration: 3.13 },
  { text: "There's more on Astana Hub, too.", file: "line-04-astana", duration: 2.19 },
  { text: "I'll keep watch while you look around.", file: "line-06-keep-watch", duration: 2.25 },
  { text: "I sit up here and watch the city lights.", file: "line-05-watch-city", duration: 4.15 },
  { text: "Every building starts as a quiet idea.", file: "line-07-building", duration: 3.19 },
  { text: "Arches are my favorite. Strong, and kind of beautiful.", file: "line-09-arches", duration: 4.62 },
  { text: "Some nights, the code compiles on the first try.", file: "line-08-compiles", duration: 3.97 },
  { text: "Take your time. I'm not going anywhere.", file: "line-10-take-time", duration: 3.5 },
  { text: "Say hi to 2md on GitHub. Tell them Mika sent you.", file: "line-11-say-hi", duration: 4.28 },
  { text: "Fun fact: this rooftop has the best view in town.", file: "line-12-fun-fact", duration: 4.05 },
  { text: "Thanks for stopping by. Come back soon!", file: "line-13-thanks", duration: 3.13 },
];

export const RECORDINGS = new Map<string, Recording>([
  ...DIALOGUE,
  { text: "Good morning! I'm Mika.", file: "greeting-morning", duration: 2.61 },
  { text: "Good afternoon! I'm Mika.", file: "greeting-afternoon", duration: 2.35 },
  { text: "Good evening! I'm Mika.", file: "greeting-evening", duration: 2.38 },
  { text: "Still awake? Same.", file: "greeting-night", duration: 2.38 },
  { text: "Psst, click me. I have more stories.", file: "hint-psst", duration: 3.55 },
  // Mika reactions (idle, night, terminal, scroll, konami) and achievement milestones.
  { text: "Still there? The stars are nice tonight.", file: "reaction-idle-1", duration: 3.55 },
  { text: "I'll be here when you're back. Watching the city.", file: "reaction-idle-2", duration: 3.74 },
  { text: "Okay, I'm people-watching. There are three of them. Interesting.", file: "reaction-idle-3", duration: 6.01 },
  { text: "Late night browsing? Respect.", file: "reaction-night", duration: 2.85 },
  { text: "Ooh, a terminal. Now this is my kind of page.", file: "reaction-terminal", duration: 4.44 },
  { text: "Careful with the scrollbar, it's a long way down.", file: "reaction-scroll", duration: 3.63 },
  { text: "The old code! Up up down down... you've done this before, haven't you?", file: "reaction-konami", duration: 5.36 },
  { text: "Rooftop tour: every season, every hour. Try the clock, they rotate.", file: "reaction-konami-tour", duration: 5.22 },
  { text: "First secret found! There are more where that came from.", file: "secret-1", duration: 4.02 },
  { text: "Five secrets down. You're good at this.", file: "secret-5", duration: 2.35 },
  { text: "Ten secrets. Okay, you're showing off now.", file: "secret-10", duration: 4.28 },
  { text: "All of them?! Every single secret. I'm honestly impressed. You belong on this rooftop.", file: "secret-all", duration: 12.46 },
  { text: "Copied! See you on Discord.", file: "discord-copied", duration: 2.3 },
  { text: "Discord is m-r-x-r-e-r. No clipboard here, so screenshot that.", file: "discord-fallback", duration: 5.88 },
  { text: "Make a wish.", file: "wish", duration: 1.28 },
].map((recording) => [recording.text, recording]));


