import { MASCOT_NAME, REDUCED_MOTION } from "./config";
import { element } from "./dom";
import { unlock, progressReport } from "./achievements";

export type TerminalHost = {
  print(line: string, kind?: "out" | "cmd" | "err"): void;
  /** Queued output: lines appear one by one with a short delay. */
  stream(lines: string[], kind?: "out" | "err"): void;
};

type Command = {
  name: string;
  summary: string;
  run(host: TerminalHost, arg: string): void;
};

const PROJECTS = [
  { name: "endfield-il2dump", kind: "Reverse engineering · C++", description: "Offline IL2CPP metadata dumper for Unity x64.", url: "https://github.com/2md55nmxkw-arch/endfield-il2dump" },
  { name: "Loliland-ModLoader", kind: "Systems · C++", description: "Mod loader for the Loliland launcher build.", url: "https://github.com/2md55nmxkw-arch/Loliland-ModLoader" },
  { name: "LuauEmu", kind: "Language tooling · Luau", description: "Luau script emulator that runs outside Roblox.", url: "https://github.com/2md55nmxkw-arch/LuauEmu" },
];

const CONTACTS = [
  { key: "github", value: "github.com/2md55nmxkw-arch" },
  { key: "discord", value: "@mrxrer (copy it from the contact panel)" },
  { key: "astanahub", value: "astanahub.com" },
];

const REACTIONS = new Map<string, string>([
  ["sudo", `${MASCOT_NAME}: Nice try. This terminal already runs as your browser.`],
  ["rm", `${MASCOT_NAME}: I hid the delete key. The rooftop stays.`],
  ["vim", `${MASCOT_NAME}: You are on your own in there. :q! has saved braver people.`],
  ["hello", `${MASCOT_NAME}: Hey! Click me on the rooftop if you want the full tour.`],
  ["hi", `${MASCOT_NAME}: Hey! Click me on the rooftop if you want the full tour.`],
  ["who", `${MASCOT_NAME}: That's 2md. I just live here.`],
  ["mika", `${MASCOT_NAME}: That's me! Try holding my rooftop avatar for a second. Wishes included.`],
  ["mrrx", `${MASCOT_NAME}: The fastest way to reach 2md. Copy it from the contact panel below.`],
  ["matrix", `${MASCOT_NAME}: There is no spoon. But there are 16 rooftop scenes.`],
  ["coffee", `${MASCOT_NAME}: 2md runs on it. I run on good weather.`],
]);

const SEASON_ASSETS = 16;

function print(host: TerminalHost, lines: string[]): void {
  for (const line of lines) host.print(line);
}

const SCAN_LINES = [
  "scanning 2md.arch (this very document)...",
  "PORT      SERVICE          STATE     DETAIL",
  "hero      video/seasons    open      4 seasons × 4 times of day (16 scenes)",
  "mika      mascot/voice     open      clickable, huggable, slightly chaotic",
  "terminal  shell/reverse    open      you are here",
  "secrets   achievements     open      type 'achievements' for progress",
  "contact   discord/@mrxrer  open      fastest reply, copy from the panel",
  "scan complete: 0 critical, 0 high, 15 secrets remaining.",
];

const commands: Command[] = [
  {
    name: "help",
    summary: "list available commands",
    run(host) {
      print(host, ["available commands:"]);
      for (const command of commands) host.print(`  ${command.name.padEnd(12)}${command.summary}`);
      host.print("psst: some undocumented commands exist. r3v3rs3 3ng1n33rs l1k3 expl0ring.");
    },
  },
  {
    name: "whoami",
    summary: "who is behind this page",
    run(host) {
      print(host, [
        "farid fatikhov — 2md.arch",
        "engineer-developer & cybersecurity engineer, kazakhstan",
        "c++, typescript, reverse engineering. habit of looking underneath.",
      ]);
    },
  },
  {
    name: "ls",
    summary: "ls projects | ls contacts | ls scenes",
    run(host, arg) {
      const target = arg.trim();
      if (target === "projects") {
        for (const project of PROJECTS) host.print(`${project.name.padEnd(20)}${project.kind}`);
        return;
      }
      if (target === "contacts") {
        for (const contact of CONTACTS) host.print(`${contact.key.padEnd(12)}${contact.value}`);
        return;
      }
      if (target === "scenes") {
        print(host, [
          "4 seasons × 4 times of day, chosen by the Astana clock (UTC+5):",
          "  winter spring summer autumn × night morning day sunset",
          `  ${SEASON_ASSETS} looping videos, only the active one loads first`,
        ]);
        return;
      }
      host.print(`ls: ${target || "home"}: about.md  projects/  contacts/  scenes/`, "out");
    },
  },
  {
    name: "cat",
    summary: "cat about | cat contact | cat <project>",
    run(host, arg) {
      const target = arg.trim();
      if (target === "about.md" || target === "about") {
        print(host, [
          "2md.arch — farid fatikhov",
          "i build tools and take software apart to see how it really works.",
          "from low-level systems to language tooling.",
        ]);
        return;
      }
      if (target === "contact" || target === "contacts") {
        print(host, ["github:  https://github.com/2md55nmxkw-arch", "discord: @mrxrer  <- fastest reply", "astana hub: https://astanahub.com"]);
        return;
      }
      const project = PROJECTS.find((item) => item.name.toLowerCase() === target.toLowerCase());
      if (project) {
        print(host, [`${project.name} — ${project.kind}`, project.description, project.url]);
        return;
      }
      host.print(`cat: ${target || "(no file)"}: no such file`, "err");
    },
  },
  {
    name: "open",
    summary: "open <project> — open its repository",
    run(host, arg) {
      const project = PROJECTS.find((item) => item.name.toLowerCase() === arg.trim().toLowerCase());
      if (!project) {
        host.print(`open: ${arg.trim() || "(nothing)"}: try 'ls projects' first`, "err");
        return;
      }
      host.print(`opening ${project.name}...`);
      open(project.url, "_blank", "noopener");
    },
  },
  {
    name: "scan",
    summary: "scan this page itself",
    run(host) {
      host.stream(SCAN_LINES);
      unlock("scan");
    },
  },
  {
    name: "achievements",
    summary: "secret hunting progress",
    run(host) {
      const report = progressReport();
      host.print(`secrets found: ${report.unlocked.length}/${report.total}`);
      for (const done of report.unlocked) host.print(`  [x] ${done}`);
      if (report.unlocked.length === report.total) {
        host.print("every secret found. the rooftop is yours.");
        return;
      }
      host.print("still hidden:");
      for (const hint of report.hints) host.print(`  [ ] ${hint}`);
    },
  },
  {
    name: "theme",
    summary: "theme light | theme dark | toggle",
    run(host, arg) {
      const mode = arg.trim().toLowerCase();
      const next = mode === "light" || mode === "dark" ? mode : document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {
        // Storage is optional.
      }
      host.print(`theme set to ${next}. the arch approves.`);
    },
  },
  {
    name: "underhood",
    summary: "how this page is built",
    run(host) {
      host.print("opening the engine room...");
      unlock("underhood");
      // Defer: the Enter keydown would otherwise activate the focused close button.
      setTimeout(() => {
        const underhood = document.getElementById("underhood");
        const hoodClose = document.getElementById("hood-close");
        if (!underhood || !hoodClose) return;
        underhood.removeAttribute("hidden");
        (hoodClose as HTMLElement).focus();
      }, 0);
    },
  },
  {
    name: "mika",
    summary: "summon the mascot",
    run(host) {
      const reaction = REACTIONS.get("mika");
      if (reaction) host.print(reaction);
      unlock("mika");
      document.getElementById("hit")?.click();
    },
  },
  {
    name: "clear",
    summary: "clear the terminal",
    run() {
      const body = document.getElementById("term-body");
      if (body) body.replaceChildren();
    },
  },
  {
    name: "exit",
    summary: "close the terminal",
    run() {
      document.getElementById("term-close")?.click();
    },
  },
];

export function initTerminal(): void {
  const root = element("terminal");
  const panel = root.querySelector<HTMLElement>(".terminal-panel");
  const body = element("term-body");
  const input = element<HTMLInputElement>("term-input");
  const close = element<HTMLButtonElement>("term-close");
  const history: string[] = [];
  let historyIndex = -1;
  let lastFocused: HTMLElement | null = null;

  const host: TerminalHost = {
    print(line, kind = "out") {
      const paragraph = document.createElement("p");
      paragraph.className = kind === "out" ? "terminal-line" : kind === "cmd" ? "terminal-line terminal-cmd" : "terminal-line terminal-err";
      paragraph.textContent = line;
      body.appendChild(paragraph);
      body.scrollTop = body.scrollHeight;
    },
    stream(lines, kind = "out") {
      if (REDUCED_MOTION) {
        for (const line of lines) host.print(line, kind);
        return;
      }
      // One line at a time, like a real device responding.
      const queue = [...lines];
      const step = () => {
        const line = queue.shift();
        if (line === undefined) return;
        host.print(line, kind);
        if (queue.length) setTimeout(step, 90);
      };
      step();
    },
  };

  function openTerminal(): void {
    if (!root.hidden) {
      input.focus();
      return;
    }
    unlock("terminal");
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("open"));
    input.focus();
    if (!REDUCED_MOTION) {
      host.print("");
      const intro = body.lastElementChild;
      if (intro) intro.remove();
      host.print("2md.arch terminal — type help for available commands.");
    }
  }

  function closeTerminal(): void {
    if (root.hidden) return;
    root.classList.remove("open");
    const finish = () => {
      root.hidden = true;
      lastFocused?.focus({ preventScroll: true });
    };
    if (REDUCED_MOTION) finish();
    else setTimeout(finish, 180);
  }

  /** Secret words discovered through typing map to achievement ids. */
  const REACTION_SECRETS = new Map<string, string>([
    ["sudo", "sudo"], ["rm", "rm"], ["vim", "vim"], ["nano", "vim"],
    ["hello", "hello"], ["hi", "hello"], ["mika", "mika"], ["matrix", "matrix"],
    ["coffee", "coffee"],
  ]);

  function run(raw: string): void {
    const line = raw.trim();
    if (!line) return;
    history.push(line);
    historyIndex = history.length;
    host.print(`➜ ${line}`, "cmd");
    const [name, ...rest] = line.split(/\s+/);
    const command = commands.find((item) => item.name === name.toLowerCase());
    const lower = line.toLowerCase();
    const reaction = REACTIONS.get(lower) ?? REACTIONS.get(name.toLowerCase());
    if (command) {
      unlock("terminal");
      command.run(host, rest.join(" "));
      return;
    }
    if (reaction) {
      host.print(reaction);
      const secret = REACTION_SECRETS.get(lower) ?? REACTION_SECRETS.get(name.toLowerCase());
      if (secret) unlock(secret as Parameters<typeof unlock>[0]);
      return;
    }
    if (lower.startsWith("sudo")) {
      host.print(REACTIONS.get("sudo")!);
      unlock("sudo");
      return;
    }
    if (lower.startsWith("rm")) {
      host.print(REACTIONS.get("rm")!);
      unlock("rm");
      return;
    }
    if (lower.startsWith("vim") || lower.startsWith("nano")) {
      host.print(REACTIONS.get("vim")!);
      unlock("vim");
      return;
    }
    host.print(`command not found: ${name} — try 'help'`, "err");
  }

  element("term-open").addEventListener("click", openTerminal);
  close.addEventListener("click", closeTerminal);
  root.addEventListener("pointerdown", (event) => {
    if (event.target === root) closeTerminal();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      run(input.value);
      input.value = "";
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (historyIndex > 0) input.value = history[--historyIndex] ?? "";
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex < history.length - 1) input.value = history[++historyIndex] ?? "";
      else {
        historyIndex = history.length;
        input.value = "";
      }
    }
  });

  addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (event.key === "`" || (event.key === "~" && event.shiftKey)) {
      if (root.hidden) {
        event.preventDefault();
        openTerminal();
      } else if (document.activeElement !== input) {
        event.preventDefault();
        input.focus();
      }
      return;
    }
    if (event.key === "Escape" && !root.hidden) {
      event.preventDefault();
      closeTerminal();
    }
    if (typing) return;
    if (event.key === "!" || (event.key === "/" && event.shiftKey) || event.key === "?") {
      event.preventDefault();
      toggleUnderhood();
    }
  });

  const underhood = element("underhood");
  const hoodClose = element<HTMLButtonElement>("hood-close");

  function toggleUnderhood(force?: boolean): void {
    const show = force ?? underhood.hidden;
    if (show) {
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      underhood.removeAttribute("hidden");
      hoodClose.focus();
    } else {
      underhood.setAttribute("hidden", "");
      lastFocused?.focus({ preventScroll: true });
    }
  }

  hoodClose.addEventListener("click", () => toggleUnderhood(false));
  underhood.addEventListener("pointerdown", (event) => {
    if (event.target === underhood) toggleUnderhood(false);
  });

  // Focus trap and Escape for the under-the-hood dialog.
  underhood.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      toggleUnderhood(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = underhood.querySelectorAll<HTMLElement>("button, a[href]");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (panel) panel.addEventListener("pointerdown", (event) => event.stopPropagation());

  // Expose a manual hook for the terminal button's aria-expanded state.
  const button = document.getElementById("term-open");
  if (button) {
    button.setAttribute("aria-expanded", "false");
    new MutationObserver(() => button.setAttribute("aria-expanded", String(!root.hidden))).observe(root, { attributeFilter: ["hidden"] });
  }
}
