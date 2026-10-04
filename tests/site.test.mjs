import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageUrl = pathToFileURL(path.join(root, "index.html")).href;
let browser;

before(async () => {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
});
after(async () => { await browser?.close(); });

async function open(t, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    ...options,
  });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.addInitScript(() => {
    const timestamp = new URL(location.href).searchParams.get("sceneTime");
    Date.now = () => window.sceneTime ?? (timestamp ? Number(timestamp) : Date.UTC(2026, 8, 30, 9, 15));
    window.pointerListeners = 0;
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this === window && type === "pointermove") window.pointerListeners++;
      return add.call(this, type, listener, options);
    };
  });
  return { context, page, errors };
}

async function start(page) {
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("lock"));
  await page.locator("#start").waitFor({ state: "hidden" });
}

async function activeScene(page) {
  return page.locator("video:not(.off)").evaluateAll((videos) => videos.map((video) => video.id));
}

test("content and poster remain visible with JavaScript disabled", async (t) => {
  const { page } = await open(t, { javaScriptEnabled: false });
  const videos = [];
  page.on("request", (request) => { if (request.url().includes(".mp4")) videos.push(request.url()); });
  await page.goto(pageUrl);
  assert.equal(await page.locator("#start").isVisible(), false);
  assert.equal(await page.locator("#hero-poster").evaluate((image) => image.naturalWidth > 0), true);
  assert.equal(await page.locator("[data-r]").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).opacity === "1")), true);
  assert.equal(await page.locator("html").getAttribute("class"), null);
  assert.deepEqual(videos, []);
});

test("failed initialization restores content and the native cursor", async (t) => {
  const { page, errors } = await open(t);
  await page.addInitScript(() => {
    window.IntersectionObserver = function () { throw new Error("test observer failure"); };
  });
  await page.goto(pageUrl);
  assert.equal(await page.locator("#start").isVisible(), false);
  assert.equal(await page.locator("html").evaluate((node) => node.classList.contains("lock") || node.classList.contains("cc")), false);
  assert.equal(await page.locator("[data-r]").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).opacity === "1")), true);
  assert.deepEqual(errors, []);
});

test("selected video loads first; other videos load later", async (t) => {
  const { page, errors } = await open(t);
  const requests = new Set();
  page.on("request", (request) => {
    if (request.url().includes(".mp4")) requests.add(path.basename(new URL(request.url()).pathname));
  });
  await page.goto(pageUrl);
  assert.deepEqual([...requests], ["autumn_day.mp4"]);
  assert.deepEqual(await activeScene(page), ["bgD"]);
  await page.waitForFunction(() => [...document.querySelectorAll("video")].every((video) => video.readyState >= 1));
  assert.deepEqual([...requests].sort(), ["autumn_day.mp4", "autumn_morning.mp4", "autumn_night.mp4", "autumn_sunset.mp4"]);
  assert.deepEqual(errors, []);
});

test("native clock supports click, Enter and Space; start restores focus", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  assert.equal(await page.evaluate(() => document.activeElement.id), "page-title");
  assert.equal(await page.locator("#clock").evaluate((node) => node.tagName), "BUTTON");
  await page.locator("#clock").click();
  assert.deepEqual(await activeScene(page), ["bgS"]);
  await page.keyboard.press("Enter");
  assert.deepEqual(await activeScene(page), ["bgN"]);
  await page.keyboard.press("Space");
  assert.deepEqual(await activeScene(page), ["bgM"]);
  await page.locator("#clock").click();
  assert.deepEqual(await activeScene(page), ["bgD"]);
  assert.deepEqual(errors, []);
});

test("live region announces one complete message during visual typing", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.locator("#snd").click();
  await page.evaluate(() => {
    window.announcements = [];
    const status = document.getElementById("mascot-status");
    new MutationObserver(() => window.announcements.push(status.textContent)).observe(status, { childList: true });
  });
  await page.locator("#hit").click();
  await page.waitForFunction(() => document.getElementById("txt").textContent === "Welcome to 2md's little corner of the internet.");
  assert.deepEqual(await page.evaluate(() => window.announcements), ["Mika: Welcome to 2md's little corner of the internet."]);
  assert.equal(await page.locator("#bubble").getAttribute("aria-hidden"), "true");
  assert.deepEqual(errors, []);
});

test("page keeps pointer tracking minimal and the native cursor", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  assert.ok(await page.evaluate(() => window.pointerListeners) <= 1);
  assert.equal(await page.locator(".cur, #trail").count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("cc")), false);
  assert.deepEqual(errors, []);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
  test(`${viewport.width}x${viewport.height}: video fills only the hero; Mika's hit area and bubble match the character`, async (t) => {
    const { page, errors } = await open(t, { viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
    await page.goto(pageUrl);
    await start(page);
    const hero = await page.locator("#hero").boundingBox();
    for (const box of await page.locator("video, #hero-poster").evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }))) {
      assert.ok(Math.abs(box.left - hero.x) < 1 && Math.abs(box.top - hero.y) < 1);
      assert.ok(Math.abs(box.width - hero.width) < 1 && Math.abs(box.height - hero.height) < 1);
    }
    assert.ok(await page.evaluate(() => document.querySelector("main").getBoundingClientRect().top >= document.getElementById("hero").getBoundingClientRect().bottom - 1));
    await page.locator("#snd").click();
    await page.locator("#hit").click();
    await page.waitForFunction(() => document.getElementById("bubble").classList.contains("show"));
    const geometry = await page.evaluate(() => {
      const hero = document.getElementById("hero").getBoundingClientRect();
      const poster = document.getElementById("hero-poster");
      const hit = document.getElementById("hit").getBoundingClientRect();
      const bubble = document.getElementById("bubble").getBoundingClientRect();
      const portrait = hero.width <= hero.height;
      const scale = Math.max(hero.width / poster.naturalWidth, hero.height / poster.naturalHeight);
      const offsetX = (hero.width - poster.naturalWidth * scale) * (portrait ? 0.91 : 0.8);
      const offsetY = (hero.height - poster.naturalHeight * scale) * 0.5;
      const mouth = { x: hero.left + offsetX + 0.775 * poster.naturalWidth * scale, y: hero.top + offsetY + 0.452 * poster.naturalHeight * scale };
      return { hero: { left: hero.left, right: hero.right }, hit: { left: hit.left, right: hit.right, top: hit.top, bottom: hit.bottom }, bubble: { left: bubble.left, right: bubble.right, top: bubble.top, bottom: bubble.bottom }, mouth };
    });
    assert.ok(geometry.mouth.x > geometry.hit.left && geometry.mouth.x < geometry.hit.right, "mouth inside hit area horizontally");
    assert.ok(geometry.mouth.y > geometry.hit.top && geometry.mouth.y < geometry.hit.bottom, "mouth inside hit area vertically");
    assert.ok(geometry.mouth.x > geometry.hero.left && geometry.mouth.x < geometry.hero.right, "character is inside the frame");
    assert.ok(geometry.bubble.left >= geometry.hero.left && geometry.bubble.right <= geometry.hero.right, "bubble stays inside the hero");
    assert.ok(geometry.bubble.bottom <= geometry.mouth.y, "bubble sits above the mouth");
    assert.ok(Math.abs(geometry.bubble.right - geometry.mouth.x) < Math.max(80, geometry.hero.right * 0.08), "bubble tail points at the character");
    assert.deepEqual(errors, []);
  });
}

test("star movement and smoothing agree at 30, 60 and 144 Hz", async (t) => {
  const { page } = await open(t);
  await page.goto(pageUrl);
  const result = await build({
    absWorkingDir: root,
    stdin: { contents: 'export { moveStar } from "./src/stars"; export { smoothing } from "./src/input";', resolveDir: root },
    bundle: true, write: false, format: "iife", globalName: "AnimationTest",
  });
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const values = await page.evaluate(() => [30, 60, 144].map((fps) => {
    const star = { x: 0, y: 0, velocityX: -300, velocityY: 600, length: 100, opacity: 1 };
    let pointer = 0;
    for (let frame = 0; frame < fps; frame++) {
      AnimationTest.moveStar(star, 1 / fps);
      pointer += (1 - pointer) * AnimationTest.smoothing(5, 1 / fps);
    }
    return { x: star.x, y: star.y, pointer };
  }));
  for (const value of values) {
    assert.ok(Math.abs(value.x + 300) < 1e-8);
    assert.ok(Math.abs(value.y - 600) < 1e-8);
    assert.ok(Math.abs(value.pointer - (1 - Math.exp(-5))) < 1e-8);
  }
});

for (const scenario of [
  { name: "reduced motion", options: { reducedMotion: "reduce" } },
  { name: "mobile", options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  { name: "observer fallback", noObserver: true },
  { name: "unavailable storage and rejected voice playback", failure: true },
]) {
  test(`${scenario.name}: dialogs, scroll and controls work`, async (t) => {
    const { page, errors } = await open(t, scenario.options);
    if (scenario.noObserver) await page.addInitScript(() => { delete window.IntersectionObserver; });
    if (scenario.failure) await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("test blocked storage"); } });
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        return this instanceof HTMLAudioElement ? Promise.reject(new Error("test playback failure")) : play.call(this);
      };
    });
    const videos = [];
    page.on("request", (request) => { if (request.url().includes(".mp4")) videos.push(request.url()); });
    await page.goto(pageUrl);
    await start(page);
    await page.locator("#snd").click();
    await page.locator("#hit").click();
    await page.waitForFunction(() => document.getElementById("txt").textContent === "Welcome to 2md's little corner of the internet.");
    await page.locator("#clock").focus();
    await page.keyboard.type("mika");
    await page.waitForFunction(() => document.getElementById("txt").textContent === "Make a wish.");
    assert.equal(await page.locator("#rain").count(), scenario.name === "reduced motion" ? 0 : 1);
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForFunction(() => document.querySelector(".bar").classList.contains("sc"));
    if (scenario.name === "reduced motion") {
      assert.deepEqual(videos, []);
      assert.equal(await page.locator(".cur").count(), 0);
    }
    await page.locator("#snd").click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#snd").getAttribute("aria-pressed"), "true");
    assert.deepEqual(errors, []);
  });
}

test("unavailable videos cannot trap the visitor on the start screen", async (t) => {
  const { page, errors } = await open(t);
  await page.route("**/*.mp4", (route) => route.abort());
  await page.goto(pageUrl);
  await page.waitForFunction(() => !document.documentElement.classList.contains("lock"), { timeout: 10000 });
  await page.locator("#start").waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => document.activeElement.id), "page-title");
  assert.equal(await page.locator("#hero-poster").evaluate((image) => image.naturalWidth > 0), true);
  assert.deepEqual(errors, []);
});

test("single-file build works without local scripts, styles or media requests", async (t) => {
  const { page, errors } = await open(t);
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.embeddedAudio = [];
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      window.embeddedAudio.push(audio);
      return audio;
    };
  });
  const requests = [];
  page.on("request", (request) => {
    if (/\/(assets\/|scripts\.js|style\.css)/.test(request.url())) requests.push(request.url());
  });
  await page.goto(pathToFileURL(path.join(root, "dist/index.single-file.html")).href);
  await start(page);
  await page.waitForFunction(() => window.embeddedAudio.some((audio) => audio.loop && !audio.paused && audio.currentTime > 0.1 && audio.src.startsWith("data:audio/mpeg;base64,")));
  assert.deepEqual(await activeScene(page), ["bgD"]);
  await page.locator("#snd").click();
  await page.locator("#snd").click();
  await page.waitForFunction(() => document.getElementById("bgD").readyState >= 2);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  const source = await readFile(path.join(root, "dist/index.single-file.html"), "utf8");
  assert.equal(source.includes('src="scripts.js"'), false);
  assert.equal(source.includes('href="style.css"'), false);
});

test("background track plays, ducks for voice and resumes after toggling", async (t) => {
  const { page, errors } = await open(t);
  await page.addInitScript(() => {
    localStorage.setItem("ambient", "on");
    localStorage.setItem("voice", "off");
    const NativeAudio = window.Audio;
    window.testAudio = [];
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      window.testAudio.push(audio);
      return audio;
    };
  });
  await page.goto(pageUrl);
  assert.equal(await page.evaluate(() => window.testAudio.length), 0);
  await start(page);
  await page.waitForFunction(() => window.testAudio.some((audio) => audio.src.endsWith("Seven_Floors_Above.mp3") && !audio.paused && audio.currentTime > 0.1 && audio.volume > 0.49));
  assert.equal(await page.evaluate(() => window.testAudio[0].loop), true);
  await page.locator("#snd").click();
  await page.locator("#hit").click();
  await page.waitForFunction(() => window.testAudio[0].volume < 0.18);
  await page.locator("#snd").click();
  await page.waitForFunction(() => window.testAudio[0].volume > 0.49);
  await page.locator("#amb").click();
  await page.waitForFunction(() => window.testAudio[0].paused);
  const pausedAt = await page.evaluate(() => window.testAudio[0].currentTime);
  assert.equal(await page.evaluate(() => localStorage.getItem("ambient")), "off");
  await page.locator("#amb").click();
  await page.waitForFunction((time) => !window.testAudio[0].paused && window.testAudio[0].currentTime > time, pausedAt);
  assert.equal(await page.evaluate(() => window.testAudio.filter((audio) => audio.src.endsWith("Seven_Floors_Above.mp3")).length), 1);
  assert.deepEqual(errors, []);
});

test("project workbench stays readable on desktop and mobile", async (t) => {
  const { page, errors } = await open(t, { viewport: { width: 1440, height: 900 } });
  await page.goto(pageUrl);
  await start(page);
  const hero = await page.locator("#hero").evaluate((node) => ({ width: node.clientWidth, height: node.clientHeight, clipped: getComputedStyle(node).overflow, containsCopy: node.contains(document.getElementById("lower")), containsVideos: [...document.querySelectorAll("video")].every((video) => video.parentElement === node) }));
  assert.equal(hero.width, 1440);
  assert.equal(hero.height, 900);
  assert.equal(hero.clipped, "hidden");
  assert.equal(hero.containsCopy, true);
  assert.equal(hero.containsVideos, true);

  assert.equal(await page.locator("#work").evaluate((work) => work.classList.contains("horizontal-work")), false);
  assert.equal(await page.locator(".project-track").evaluate((track) => getComputedStyle(track).display), "grid");
  const desktop = await page.locator(".project-panel").evaluateAll((panels) => panels.map((panel) => ({ top: panel.getBoundingClientRect().top, width: panel.getBoundingClientRect().width })));
  assert.ok(desktop[0].top < desktop[1].top && desktop[1].top < desktop[2].top);
  assert.ok(desktop.every((panel) => panel.width > 900));
  await page.locator(".project-link").nth(2).focus();
  await page.waitForFunction(() => { const r = document.querySelectorAll(".project-link")[2].getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const mobile = await page.locator(".project-panel").evaluateAll((panels) => panels.map((panel) => panel.getBoundingClientRect().top));
  assert.ok(mobile[0] < mobile[1] && mobile[1] < mobile[2]);
  const dock = await page.locator(".menu").evaluate((menu) => { const r = menu.getBoundingClientRect(); return { bottom: r.bottom, left: r.left, right: r.right }; });
  assert.ok(dock.bottom <= 844 && dock.bottom >= 820 && dock.left >= 0 && dock.right <= 390);
  await page.setViewportSize({ width: 320, height: 700 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator("#certificates").isVisible(), true);
  assert.equal(await page.locator(".certificate-card").count(), 1);
  assert.equal(await page.locator(".certificate-card img").evaluate((image) => image.naturalWidth > 0), true);
  assert.deepEqual(errors, []);
});

test("certificate preview supports PDF, optional verification and Escape focus return", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  const module = await build({ entryPoints: [path.join(root, "src/certificates.ts")], bundle: true, format: "iife", globalName: "CertificateTest", write: false });
  await page.addScriptTag({ content: module.outputFiles[0].text });
  // The real page may already render live certificates; reset the grid for this isolated case.
  await page.evaluate(() => { document.getElementById("certificate-grid").replaceChildren(); });
  await page.evaluate(() => CertificateTest.initCertificates([
    { title: "Test certificate", issuer: "Test issuer", date: "2026", preview: "assets/video/autumn_day.jpg", pdf: "assets/certificates/proof.pdf", verificationUrl: "https://example.com/verify" },
    { title: "Without verification", issuer: "Test issuer", date: "2026", preview: "assets/video/winter_day.jpg", pdf: "assets/certificates/second.pdf" },
  ]));
  await page.locator(".certificate-card").first().click();
  assert.equal(await page.locator("#certificate-dialog").evaluate((dialog) => dialog.open), true);
  assert.equal(await page.locator("#certificate-name").textContent(), "Test certificate");
  assert.equal(await page.locator("#certificate-download").getAttribute("download"), "proof.pdf");
  assert.equal(await page.locator("#certificate-verify").getAttribute("href"), "https://example.com/verify");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".certificate-card").first().evaluate((card) => card === document.activeElement), true);
  await page.locator(".certificate-card").nth(1).click();
  assert.equal(await page.locator("#certificate-verify").isVisible(), false);
  await page.locator("#certificate-close").click();
  assert.equal(await page.locator("#certificate-dialog").evaluate((dialog) => dialog.open), false);
  assert.deepEqual(errors, []);
});

test("the real certificate renders with its preview and PDF", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  assert.equal(await page.locator("#certificates").isVisible(), true);
  const card = page.locator(".certificate-card").first();
  await card.scrollIntoViewIfNeeded();
  await card.locator("img").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector(".certificate-card img")?.naturalWidth > 0);
  assert.equal(await card.locator("img").evaluate((image) => image.naturalWidth > 0), true);
  assert.ok((await card.locator("strong").textContent()).includes("WorldSkills"));
  await card.click();
  assert.equal(await page.locator("#certificate-dialog").evaluate((dialog) => dialog.open), true);
  assert.equal(await page.locator("#certificate-preview").evaluate((image) => image.naturalWidth > 0), true);
  assert.equal(await page.locator("#certificate-download").getAttribute("download"), "ws-2025-III-Respublic-CyberSecurity.pdf");
  assert.equal(await page.locator("#certificate-verify").isVisible(), false);
  await page.keyboard.press("Escape");
  await access(path.join(root, "assets/certificates/ws-2025-III-Respublic-CyberSecurity.pdf"));
  assert.deepEqual(errors, []);
});

test("calendar rules and all sixteen seasonal assets are complete", async () => {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ["src/scene-data.ts"],
    bundle: true, write: false, format: "esm",
  });
  const rules = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  const seasons = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
  seasons.forEach((season, index) => assert.equal(rules.seasonForMonth(index + 1), season));
  for (const [hour, period] of [[0,"night"],[4,"night"],[5,"morning"],[7,"morning"],[8,"day"],[17,"day"],[18,"sunset"],[20,"sunset"],[21,"night"],[23,"night"]]) {
    assert.equal(rules.sceneForHour(hour), period);
  }
  const files = Object.values(rules.SCENE_FILES).flatMap((periods) => Object.values(periods));
  assert.equal(new Set(files).size, 16);
  assert.equal(rules.SCENE_FILES.spring.morning, "spring_city_hero");
  for (const file of files) {
    await access(path.join(root, "assets/video", `${file}.mp4`));
    await access(path.join(root, "assets/video", `${file}.jpg`));
  }
});

test("each season and time selects its matching poster, including the Astana month boundary", async (t) => {
  const { page, errors } = await open(t, { reducedMotion: "reduce" });
  const cases = [];
  for (const [month, season] of [[1,"winter"],[4,"spring"],[7,"summer"],[10,"autumn"]]) {
    for (const [hour, period, id] of [[1,"night","bgN"],[6,"morning","bgM"],[14,"day","bgD"],[19,"sunset","bgS"]]) {
      const file = season === "spring" && period === "morning" ? "spring_city_hero" : `${season}_${period}`;
      cases.push({ time: Date.UTC(2026, month - 1, 15, hour - 5), file, id });
    }
  }
  cases.push({ time: Date.UTC(2026, 1, 28, 20), file: "spring_night", id: "bgN" });
  for (const { time, file, id } of cases) {
    await page.goto(`${pageUrl}?sceneTime=${time}`);
    assert.deepEqual(await activeScene(page), [id]);
    assert.equal(await page.locator(`#${id}`).getAttribute("data-scene"), file);
    await page.waitForFunction((name) => {
      const poster = document.getElementById("hero-poster");
      return poster.src.endsWith(`${name}.jpg`) && poster.naturalWidth > 0;
    }, file);
  }
  assert.deepEqual(errors, []);
});

test("an open page switches to the next season without reusing the old video sources", async (t) => {
  const { page, errors } = await open(t);
  await page.addInitScript(() => {
    window.sceneTime = Date.UTC(2026, 1, 28, 18, 59);
    const interval = window.setInterval;
    window.setInterval = (callback, delay, ...args) => interval(callback, delay === 30000 ? 250 : delay, ...args);
    Object.defineProperty(navigator, "connection", { value: { saveData: true } });
  });
  await page.goto(pageUrl);
  assert.equal(await page.locator("#bgN").getAttribute("data-scene"), "winter_night");
  await page.evaluate(() => { window.sceneTime = Date.UTC(2026, 1, 28, 19, 1); });
  await page.waitForFunction(() => document.getElementById("bgN").dataset.scene === "spring_night");
  assert.equal(await page.locator("#bgN").evaluate((video) => video.src.endsWith("spring_night.mp4")), true);
  assert.deepEqual(errors, []);
});

test("terminal opens with the backquote key, runs commands and closes with Escape", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  assert.equal(await page.locator("#terminal").isVisible(), false);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.activeElement.id), "term-input");
  await page.keyboard.type("whoami");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("term-body").textContent.includes("farid fatikhov"));
  await page.keyboard.type("ls projects");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("term-body").textContent.includes("endfield-il2dump"));
  await page.keyboard.press("ArrowUp");
  assert.equal(await page.locator("#term-input").inputValue(), "ls projects");
  await page.keyboard.press("ArrowUp");
  assert.equal(await page.locator("#term-input").inputValue(), "whoami");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator("#term-input").inputValue(), "");
  await page.keyboard.type("clear");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.getElementById("term-body").children.length), 0);
  await page.keyboard.type("notacommand");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("term-body").textContent.includes("command not found"));
  await page.keyboard.press("Escape");
  await page.locator("#terminal").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
});

test("terminal easter eggs respond without breaking the page", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.locator("#term-open").click();
  await page.locator("#terminal").waitFor({ state: "visible" });
  for (const [command, marker] of [["sudo rm -rf /", "Nice try"], ["vim", "on your own"], ["mika", "That's me"], ["open endfield-il2dump", "opening"]]) {
    await page.keyboard.type(command);
    await page.keyboard.press("Enter");
    await page.waitForFunction((text) => document.getElementById("term-body").textContent.includes(text), marker);
  }
  await page.keyboard.press("Escape");
  await page.locator("#terminal").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
});

test("under the hood dialog opens with the question-mark key and traps focus", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  assert.equal(await page.locator("#underhood").isVisible(), false);
  await page.keyboard.press("?");
  await page.locator("#underhood").waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.activeElement.id), "hood-close");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "hood-close");
  await page.keyboard.press("Escape");
  await page.locator("#underhood").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
});

test("discord contact copies the username and announces the result", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.evaluate(() => {
    window.clipboardCalls = [];
    navigator.clipboard.writeText = (text) => { window.clipboardCalls.push(text); return Promise.resolve(); };
  });
  await page.locator("#discord").scrollIntoViewIfNeeded();
  await page.locator("#discord").click();
  assert.deepEqual(await page.evaluate(() => window.clipboardCalls), ["@mrxrer"]);
  await page.waitForFunction(() => document.getElementById("discord-status").textContent.includes("@mrxrer"));
  assert.deepEqual(errors, []);
});

test("favicon and og image meta tags point at real assets", async (t) => {
  const { page, errors } = await open(t);
  const requests = [];
  page.on("request", (request) => { if (request.url().includes("assets/")) requests.push(request.url()); });
  await page.goto(pageUrl);
  assert.equal(await page.locator('link[rel="icon"][href="assets/favicon.svg"]').count(), 1);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "assets/og-image.png");
  assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute("content"), "1200");
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute("content"), "summary_large_image");
  await access(path.join(root, "assets/favicon.svg"));
  await access(path.join(root, "assets/favicon.png"));
  await access(path.join(root, "assets/og-image.png"));
  await access(path.join(root, "assets/og-image.svg"));
  assert.deepEqual(errors, []);
});

test("achievements track secrets across reloads", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  await page.keyboard.type("achievements");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("term-body").textContent.includes("secrets found: 1/15"));
  assert.equal(await page.evaluate(() => localStorage.getItem("secrets") !== null), true);
  // Reload: progress persists.
  await page.reload();
  await start(page);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  await page.keyboard.type("achievements");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("term-body").textContent.includes("secrets found: 1/15"));
  // A milestone reaction unlocks at the first secret.
  assert.equal(await page.evaluate(() => localStorage.getItem("secrets-noted") !== null), true);
  assert.deepEqual(errors, []);
});

test("scan streams its report line by line", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  await page.keyboard.type("scan");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("term-body").textContent.includes("scan complete"));
  const lines = await page.evaluate(() => [...document.querySelectorAll("#term-body p")].map((node) => node.textContent));
  assert.ok(lines.some((line) => line.includes("mika")) && lines.some((line) => line.includes("secrets")));
  assert.deepEqual(errors, []);
});

test("theme command switches the palette and it survives reload", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  await page.keyboard.type("theme light");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "light");
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.keyboard.press("Escape");
  await page.reload();
  await start(page);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "light");
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), lightBg);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  await page.keyboard.type("theme dark");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  assert.deepEqual(errors, []);
});

test("konami code earns the rooftop tour", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  await page.keyboard.press("Backquote");
  await page.locator("#terminal").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator("#terminal").waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement.id === "page-title");
  for (const key of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) {
    await page.keyboard.press(key);
  }
  await page.waitForFunction(() => {
    const progress = JSON.parse(localStorage.getItem("secrets") ?? "{}");
    return progress.konami === true;
  });
  // The tour cycles the clock through the season; wait for it to settle.
  await page.waitForTimeout(7000);
  const scenes = await page.evaluate(() => document.querySelector("video:not(.off)").id);
  assert.ok(["bgD", "bgS", "bgN", "bgM"].includes(scenes), `unexpected scene: ${scenes}`);
  assert.deepEqual(errors, []);
});

test("repo badges render build-time GitHub stats", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  await start(page);
  const badges = await page.evaluate(() => [...document.querySelectorAll(".repo-badge")].map((node) => node.textContent.trim()));
  assert.ok(badges.length >= 3, `expected badges, got: ${JSON.stringify(badges)}`);
  assert.ok(badges.some((badge) => badge.includes("C++")));
  assert.ok(badges.some((badge) => badge.includes("Luau")));
  assert.equal(await page.evaluate(() => document.querySelectorAll(".project-panel[data-project]").length), 3);
  assert.deepEqual(errors, []);
});

test("web manifest is linked and valid JSON", async (t) => {
  const { page, errors } = await open(t);
  await page.goto(pageUrl);
  assert.equal(await page.locator('link[rel="manifest"]').getAttribute("href"), "site.webmanifest");
  const manifest = JSON.parse(await readFile(path.join(root, "site.webmanifest"), "utf8"));
  assert.equal(manifest.name, "2md.arch — Farid Fatikhov");
  assert.equal(manifest.icons.length, 2);
  await access(path.join(root, "sw.js"));
  assert.deepEqual(errors, []);
});
