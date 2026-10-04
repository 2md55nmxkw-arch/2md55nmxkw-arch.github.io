# 2md.arch portfolio

Personal portfolio: a full-bleed seasonal video hero with Mika, followed by a calm dark page with soft violet surfaces, three project cards with schematic diagrams, a compact toolkit and a closing contact panel.

## Run
Just open `index.html` in a browser. Or serve the folder:

    python3 -m http.server 8080   # then open http://localhost:8080

Onest is bundled locally as a variable woff2 font; headings and body copy use the same family. All page assets work offline.
`dist/index.single-file.html` embeds the script, styles, videos, posters and voice recordings. The font is embedded too; the standalone file requires no external asset requests.

## Edit the script

Edit the TypeScript files in `src/`, then build:

    npm install
    npm run check
    npm run build

`npm run build` checks TypeScript, bundles `src/main.ts` into `scripts.js`, and rebuilds `dist/index.single-file.html` from the same HTML, styles and assets. Both versions open directly without a development server. Generated files should not be edited by hand.

## Structure
    index.html            page markup
    style.css             page styles
    src/main.ts           page initialization and failure recovery
    src/scenes.ts         clock, scene selection and staged video loading
    src/scene-data.ts     seasonal filenames and calendar/time rules
    src/audio.ts          background music and voice controls
    src/mascot.ts         dialog, positioning and start screen
    src/input.ts          frame-rate independent smoothing helper
    src/effects.ts        scroll reveal and header state
    src/scroll.ts         section navigation and project visibility
    src/certificate-data.ts  certificate records
    src/certificates.ts   certificate gallery and accessible preview dialog
    src/stars.ts          shooting stars with time-based movement
    src/config.ts         mascot name and recording data
    src/dom.ts            DOM, storage and embedded asset helpers
    src/terminal.ts       interactive terminal: commands, easter eggs, hotkeys
    src/mika-reactions.ts idle, night-time, konami and event reactions for the mascot
    src/discord.ts        Discord contact with clipboard copy
    src/achievements.ts   secret hunting progress with mascot milestone reactions
    src/repo-badges.ts    build-time GitHub stars/language badges on project cards
    scripts.js            generated browser script
    build.mjs             browser bundle and single-file build
    tsconfig.json         strict TypeScript configuration
    assets/video/         16 seasonal mp4 scenes and matching jpg posters
    assets/voice/         mascot voice clips (mp3)
    assets/fonts/         local Onest variable font (woff2)
    assets/icons/         source SVGs of the Lucide icons, GitHub mark and Discord mark (the page inlines them as symbols)
    assets/licenses/      Lucide and Simple Icons license notices
    assets/SOURCES.md     visual asset provenance
    assets/certificates/  certificate previews and PDFs
    assets/Seven_Floors_Above.mp3  background music
    assets/logo.svg       logo (dark background)
    assets/logo-light.svg logo, light arch variant
    assets/favicon.svg    SVG favicon (arch mark)
    assets/favicon.png    512x512 PNG favicon fallback / apple touch icon
    assets/og-image.*     Open Graph preview image (SVG source, 1200x630 PNG)
    dist/                 generated single-file build
    site.webmanifest      PWA manifest (icons, colors)
    sw.js                 cache-first service worker for the hosted page
    assets/repo-stats.json  cached GitHub repository stats (refreshed by build)
    tests/site.test.mjs   browser regression tests
    tests/voice-lines-to-record.txt  Fish Audio script for the new Mika lines

## Things you will likely edit
- `src/config.ts`: `MASCOT_NAME` controls the mascot name shown in the bubble and greetings. Voice clips say "Mika", so re-record them if you rename her.
- `src/config.ts`: `MUSIC_FILE` selects the background track; `AMBIENT_VOLUME` sets its volume. Music starts after interaction, loops, fades when toggled, becomes quieter during voice lines and pauses while the tab is hidden. The music toggle remembers its setting.
- `src/scene-data.ts`: `SCENE_FILES` maps each season and period to a recording. `seasonForMonth(month)` selects winter (December–February), spring (March–May), summer (June–August) or autumn (September–November).
- `src/scene-data.ts`: `sceneForHour(hour)` selects night (21:00–05:00), morning (05:00–08:00), day (08:00–18:00) or sunset (18:00–21:00). Both month and hour use Astana time, UTC+5. Spring morning uses `spring_city_hero.mp4`.
- `src/config.ts`: `DIALOGUE` stores each click-through line with its recording filename and duration. `RECORDINGS` adds greetings and looks up clips by text. No clip = text-only.
- `index.html`: links; search for `github.com/2md55nmxkw-arch` and `astanahub.com`.
- `src/discord.ts`: `DISCORD_USERNAME` is the handle copied by the contact button (`@mrxrer`).
- Easter egg: hold on the mascot for 1 s or type `mika`.
- Konami code (↑↑↓↓←→←→BA) earns a rooftop tour through the four scenes of the season.
- Interactive terminal: press `` ` `` (backquote) or the Terminal button in the menu. Commands: `help`, `whoami`, `ls projects|contacts|scenes`, `cat about|contact|<project>`, `open <project>`, `scan`, `underhood`, `theme light|dark`, `achievements`, `mika`, `clear`, `exit`. Undocumented reactions exist for `sudo`, `rm`, `vim`, `hello` and a few more words.
- Under the hood: press `?` anywhere (or run `underhood` in the terminal) to see how the page itself is built.
- Achievements: 15 secrets tracked in `localStorage` (terminal words, konami, a source-reader console unlock, wish, certificates, discord). Run `achievements` in the terminal for the checklist; Mika comments at 1/5/10/15 milestones.
- New voice lines are all recorded and wired into `RECORDINGS` with their durations (see the table below).

## Behavior

Content and the static hero poster remain visible without JavaScript. Reveal animations only hide elements after their observers are installed. Initialization errors restore visible content and the native cursor. The start screen closes automatically after about three seconds and returns keyboard focus to the heading when dismissed manually.

Only the selected scene loads initially. The other three videos of the current season load metadata sequentially after the first scene is ready; videos from other seasons stay unloaded. Data-saving mode skips background loading. Reduced-motion mode uses posters without loading or playing videos. Clicking the clock cycles night, morning, day and sunset within the current season. An open page also updates its season when the local month changes.

All 16 background videos use a one-second circular crossfade between their ending and beginning. Each loop runs forward for 100 frames at 24 fps (4.167 seconds); the posters match its first frame. Background clips have no audio track because the site controls ambient sound separately. Original recordings are preserved in `backups/video-before-loop-20261001/` and are excluded from the build.

Visual typing has a separate, full-sentence live region for screen readers. The clock is a native button. Cursor, magnets and parallax share one pointer listener and update at most once per frame; magnetic link bounds are cached until the layout changes.

The mascot is alive beyond clicks: she comments once when the terminal opens, once when a visitor reaches the contact section, notes late-night visits (23:00–05:00 Astana time) and has escalating idle lines after 2, 5 and 12 minutes of inactivity. These reactions are text-only; no recordings exist for them, so the voice stays silent while the bubble types.

The contact panel has a Discord button that copies the handle `@mrxrer` to the clipboard, announces the result in a live region and has Mika comment. If the Clipboard API is unavailable, the handle is shown in text instead.

Repository badges (stars, language) are fetched from the GitHub API at build time into `assets/repo-stats.json` and embedded as a `#repo-stats` JSON block; offline builds keep the cached values. The page has a light theme (`theme light` in the terminal; persists across reloads), a PWA manifest (`site.webmanifest`) and a cache-first service worker (`sw.js`, registered only over https).

## Layout

The hero is one full-width video confined to the hero section: videos and poster cover it edge to edge (`object-fit: cover`), with the copy over a dark gradient on the left and Mika on the right. Below it the page is a plain dark background. Surfaces use large radii, tonal fills and no outline borders. Project cards alternate their schematic panel left and right; the schematics are drawn in SVG to show what each tool does and are captioned as schematics, not screenshots. Icons are Lucide at one size (20px) and one stroke (2.25) with the filled GitHub brand mark.

Phones get a separate composition: the video crop shifts to keep Mika in frame (`object-position: 91% 50%`, mirrored in `src/mascot.ts`), the clock moves to the top right, and navigation becomes a bottom dock with labelled icons. Cards stack vertically, there is no horizontal scrolling and reduced-motion visitors get the same layout without transitions.

Motion is limited to a short reveal on scroll, a press response on buttons and a small hover on cards and arrows.

## Add a certificate

Place a preview (`.jpg`, `.png` or `.webp`) and PDF in `assets/certificates/`, then add a record to `CERTIFICATES` in `src/certificate-data.ts`:

```ts
{
  title: "Certificate title",
  issuer: "Issuing organization",
  date: "2026",
  preview: "assets/certificates/example.jpg",
  pdf: "assets/certificates/example.pdf",
  verificationUrl: "https://issuer.example/verify/example", // Optional
}
```

Run `npm run build`. The gallery stays hidden while the list is empty. Clicking a certificate opens its full preview, PDF download and optional verification link. Escape closes the dialog and returns focus to the card. Previews and PDFs are embedded in the single-file build too.

## Browser checks

Install the test browser once, then run the suite:

    npx playwright install chromium
    npm test

To use an installed Edge browser in PowerShell:

    $env:PLAYWRIGHT_CHANNEL = "msedge"
    npm test

Tests cover startup failures, missing videos, loading order, keyboard focus and controls, live announcements, video and Mika hit-area/bubble geometry at four viewport sizes, movement at 30/60/144 Hz, mobile and reduced-motion behavior, unavailable storage, rejected voice playback, the single-file build, the terminal (open/run/history/clear/Escape plus easter eggs, scan and achievements), the under-the-hood dialog focus trap, the Discord copy button, the favicon/og-image meta tags, achievements persistence across reloads, the theme switch, the konami code, the repo badges and the web manifest.

## Voice clips
| file | text |
|---|---|
| greeting-morning / afternoon / evening | Good morning / afternoon / evening! I'm Mika. |
| greeting-night | Still awake? Same. |
| hint-psst | Psst, click me. I have more stories. |
| line-01 ... line-13 | the 13 click-through lines, in order |
| reaction-idle-1/2/3 | idle lines at 2/5/12 minutes |
| reaction-night | late-night greeting |
| reaction-terminal / reaction-scroll | first terminal open / deep scroll |
| reaction-konami / reaction-konami-tour | the konami code and its scene tour |
| secret-1 / secret-5 / secret-10 / secret-all | achievement milestones |
| discord-copied / discord-fallback | clipboard success / fallback |
| wish | Make a wish. (hold the mascot) |

Voice: Kasane Teto via Fish Audio. Check the voice's license terms for public use.


Playwright's bundled Chromium cannot decode H.264, so the two tests that wait for the mp4 scenes to load (`selected video loads first...` and `single-file build...`) need Edge/Chrome (`PLAYWRIGHT_CHANNEL=msedge` or `chrome`).
