import { element } from "./dom";
import { unlock } from "./achievements";

const DISCORD_USERNAME = "@mrxrer";

/** Copy the Discord handle with a confirmation that works without sight. */
export function initDiscordContact(say: (line: string) => void): void {
  const button = element<HTMLButtonElement>("discord");
  const status = element("discord-status");
  const copyIcon = document.getElementById("discord-copy");
  let restoreTimer = 0;

  async function copy(): Promise<void> {
    unlock("discord");
    let copied = false;
    try {
      await navigator.clipboard.writeText(DISCORD_USERNAME);
      copied = true;
    } catch {
      copied = false;
    }
    if (!copied) {
      // Clipboard API can be unavailable (insecure context, permissions); degrade gracefully.
      status.textContent = `Discord username: ${DISCORD_USERNAME}`;
      say("Discord is m-r-x-r-e-r. No clipboard here, so screenshot that.");
      return;
    }
    status.textContent = `Copied ${DISCORD_USERNAME}`;
    say("Copied! See you on Discord.");
    if (copyIcon) {
      const use = copyIcon.querySelector("use");
      if (use) use.setAttribute("href", "#i-code");
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        if (use) use.setAttribute("href", "#i-copy");
        status.textContent = "";
      }, 2000);
    }
  }

  button.addEventListener("click", () => void copy());
}
