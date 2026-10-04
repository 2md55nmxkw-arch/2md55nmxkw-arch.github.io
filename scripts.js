"use strict";
(() => {
  // src/config.ts
  var MASCOT_NAME = "Mika";
  var AMBIENT_VOLUME = 0.5;
  var MUSIC_FILE = "assets/Seven_Floors_Above.mp3";
  var REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE_POINTER = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var DIALOGUE = [
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
    { text: "Thanks for stopping by. Come back soon!", file: "line-13-thanks", duration: 3.13 }
  ];
  var RECORDINGS = new Map([
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
    { text: "Make a wish.", file: "wish", duration: 1.28 }
  ].map((recording) => [recording.text, recording]));

  // src/dom.ts
  var embeddedData = document.getElementById("embedded-assets")?.textContent;
  var embeddedAssets = embeddedData ? JSON.parse(embeddedData) : {};
  function asset(path) {
    return embeddedAssets[path] ?? path;
  }
  function element(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing element: #${id}`);
    return node;
  }
  function readSetting(key) {
    try {
      return localStorage.getItem(key) !== "off";
    } catch {
      return true;
    }
  }
  function saveSetting(key, enabled) {
    try {
      localStorage.setItem(key, enabled ? "on" : "off");
    } catch {
    }
  }
  function updateToggle(button, enabled) {
    button.classList.toggle("off", !enabled);
    button.setAttribute("aria-pressed", String(enabled));
  }
  function resizeCanvas(canvas, context) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function restoreContent() {
    document.documentElement.classList.remove("lock");
    document.getElementById("start")?.setAttribute("hidden", "");
    document.querySelectorAll(".reveal-ready").forEach((node) => node.classList.remove("reveal-ready"));
  }

  // src/audio.ts
  function createAmbient(button) {
    let enabled = readSetting("ambient");
    let speaking = false;
    let music = null;
    let fadeFrame = 0;
    function fade(volume, duration, done) {
      cancelAnimationFrame(fadeFrame);
      if (!music) return;
      const audio = music;
      const from = audio.volume;
      const started = performance.now();
      function frame(now) {
        const progress = Math.max(0, Math.min(1, (now - started) / duration));
        audio.volume = from + (volume - from) * progress;
        if (progress < 1) fadeFrame = requestAnimationFrame(frame);
        else done?.();
      }
      fadeFrame = requestAnimationFrame(frame);
    }
    function start() {
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
      }).catch(() => {
      });
    }
    function duck(active2) {
      speaking = active2;
      if (enabled && music && !music.paused) {
        fade(active2 ? AMBIENT_VOLUME * 0.35 : AMBIENT_VOLUME, 400);
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
  function createVoice(button, ambient) {
    let enabled = readSetting("voice");
    let unlocked = false;
    let current = null;
    function stop() {
      current?.pause();
      current = null;
      ambient.duck(false);
    }
    function play(text) {
      stop();
      const recording = RECORDINGS.get(text);
      if (!enabled || !unlocked || !recording) return 0;
      const audio = new Audio(asset(`assets/voice/${recording.file}.mp3`));
      current = audio;
      function finish() {
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
    function unlock2(event) {
      unlocked = true;
      if (event.target instanceof Element && event.target.closest("#amb")) return;
      ambient.start();
    }
    updateToggle(button, enabled);
    addEventListener("pointerdown", unlock2, { once: true, capture: true });
    addEventListener("keydown", unlock2, { once: true, capture: true });
    button.addEventListener("click", () => {
      enabled = !enabled;
      unlocked = true;
      saveSetting("voice", enabled);
      updateToggle(button, enabled);
      if (!enabled) stop();
    });
    return { play, isEnabled: () => enabled };
  }

  // src/scene-data.ts
  var PERIODS = ["night", "morning", "day", "sunset"];
  var SCENE_FILES = {
    winter: {
      night: "winter_night",
      morning: "winter_morning",
      day: "winter_day",
      sunset: "winter_sunset"
    },
    spring: {
      night: "spring_night",
      morning: "spring_city_hero",
      day: "spring_day",
      sunset: "spring_sunset"
    },
    summer: {
      night: "summer_night",
      morning: "summer_morning",
      day: "summer_day",
      sunset: "summer_sunset"
    },
    autumn: {
      night: "autumn_night",
      morning: "autumn_morning",
      day: "autumn_day",
      sunset: "autumn_sunset"
    }
  };
  function seasonForMonth(month) {
    if (month === 12 || month <= 2) return "winter";
    if (month <= 5) return "spring";
    if (month <= 8) return "summer";
    return "autumn";
  }
  function sceneForHour(hour) {
    if (hour >= 21 || hour < 5) return "night";
    if (hour < 8) return "morning";
    if (hour < 18) return "day";
    return "sunset";
  }

  // src/scenes.ts
  function astanaTime() {
    const date = new Date(Date.now() + 5 * 60 * 60 * 1e3);
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes(), month: date.getUTCMonth() + 1 };
  }
  function greeting(hour) {
    if (hour >= 23 || hour < 5) return "Still awake? Same.";
    if (hour < 12) return `Good morning! I'm ${MASCOT_NAME}.`;
    if (hour < 18) return `Good afternoon! I'm ${MASCOT_NAME}.`;
    return `Good evening! I'm ${MASCOT_NAME}.`;
  }
  function initScenes(hero) {
    const videos = {
      night: element("bgN"),
      morning: element("bgM"),
      day: element("bgD"),
      sunset: element("bgS")
    };
    const clock = element("clock");
    const hours = element("ch");
    const minutes = element("cm");
    const caption = element("cs");
    const poster = element("hero-poster");
    let active2 = sceneForHour(astanaTime().hour);
    let season = seasonForMonth(astanaTime().month);
    let activeFile = "";
    let manual = null;
    let visible = true;
    let preloadSeason = null;
    let generation = 0;
    function play(video) {
      if (!REDUCED_MOTION && visible && !document.hidden) void video.play().catch(() => {
      });
    }
    function load(period, preload) {
      const video = videos[period];
      const file = SCENE_FILES[season][period];
      video.poster = asset(`assets/video/${file}.jpg`);
      video.dataset.scene = file;
      if (REDUCED_MOTION) return;
      video.preload = preload;
      if (!video.getAttribute("src")) {
        video.src = asset(`assets/video/${file}.mp4`);
        video.load();
      }
    }
    function loadRemaining() {
      const connection = navigator.connection;
      if (REDUCED_MOTION || connection?.saveData || preloadSeason === season) return;
      preloadSeason = season;
      const batch = generation;
      const remaining = PERIODS.filter((period) => period !== active2);
      function next() {
        if (batch !== generation) return;
        const period = remaining.shift();
        if (!period) return;
        const video = videos[period];
        if (video.getAttribute("src")) {
          setTimeout(next, 1e3);
          return;
        }
        let complete = false;
        const done = () => {
          if (complete) return;
          complete = true;
          video.removeEventListener("loadedmetadata", done);
          video.removeEventListener("error", done);
          setTimeout(next, 1e3);
        };
        video.addEventListener("loadedmetadata", done);
        video.addEventListener("error", done);
        load(period, "metadata");
        setTimeout(done, 5e3);
      }
      setTimeout(next, 1500);
    }
    function updateClock() {
      const { hour, minute } = astanaTime();
      hours.textContent = String(hour).padStart(2, "0");
      minutes.textContent = String(minute).padStart(2, "0");
      if (hour >= 23 || hour < 5) caption.textContent = "she's awake too";
      else if (hour < 12) caption.textContent = "good morning";
      else if (hour < 18) caption.textContent = "good afternoon";
      else caption.textContent = "good evening";
    }
    function updateScene(force = false) {
      const time = astanaTime();
      const nextSeason = seasonForMonth(time.month);
      const next = manual ?? sceneForHour(time.hour);
      const file = SCENE_FILES[nextSeason][next];
      if (!force && file === activeFile) return;
      if (nextSeason !== season) {
        generation++;
        season = nextSeason;
        preloadSeason = null;
        for (const video of Object.values(videos)) {
          video.pause();
          video.removeAttribute("src");
          video.preload = "none";
          video.load();
        }
      }
      active2 = next;
      activeFile = file;
      poster.src = asset(`assets/video/${file}.jpg`);
      for (const period of PERIODS) {
        const video = videos[period];
        video.classList.toggle("off", period !== active2);
        if (period === active2) {
          load(period, "auto");
          play(video);
        } else {
          setTimeout(() => {
            if (period !== active2) video.pause();
          }, 1900);
        }
      }
      if (videos[active2].readyState >= 2) loadRemaining();
    }
    for (const video of Object.values(videos)) {
      const ready = () => {
        if (video === videos[active2]) loadRemaining();
      };
      video.addEventListener("loadeddata", ready);
      video.addEventListener("error", ready);
    }
    updateClock();
    updateScene(true);
    setInterval(updateClock, 1e3);
    setInterval(updateScene, 3e4);
    clock.addEventListener("click", () => {
      manual = PERIODS[(PERIODS.indexOf(active2) + 1) % PERIODS.length];
      updateScene();
    });
    if (!REDUCED_MOTION && "IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play(videos[active2]);
        else videos[active2].pause();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) videos[active2].pause();
      else play(videos[active2]);
    });
    return () => videos[active2];
  }

  // src/stars.ts
  var active = false;
  function moveStar(star, seconds) {
    star.x += star.velocityX * seconds;
    star.y += star.velocityY * seconds;
  }
  function showShootingStars() {
    if (active) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    active = true;
    canvas.id = "rain";
    document.body.appendChild(canvas);
    let stars = [];
    let lastTime = performance.now();
    let spawnBudget = 0;
    let frame = 0;
    const end = lastTime + 7e3;
    const resize = () => resizeCanvas(canvas, context);
    function draw(now) {
      if (!context) return;
      const seconds = Math.min(0.064, (now - lastTime) / 1e3);
      lastTime = now;
      context.clearRect(0, 0, innerWidth, innerHeight);
      if (now < end) {
        spawnBudget += seconds * 120;
        while (spawnBudget >= 1) {
          spawnBudget--;
          if (Math.random() >= 0.22) continue;
          stars.push({
            x: Math.random() * innerWidth * 1.4,
            y: -50,
            velocityX: -(240 + Math.random() * 240),
            velocityY: 420 + Math.random() * 420,
            length: 90 + Math.random() * 130,
            opacity: 0.6 + Math.random() * 0.4
          });
        }
      }
      for (const star of stars) {
        moveStar(star, seconds);
        const speed = Math.hypot(star.velocityX, star.velocityY);
        const tailX = star.x - star.velocityX / speed * star.length;
        const tailY = star.y - star.velocityY / speed * star.length;
        const gradient = context.createLinearGradient(star.x, star.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
        gradient.addColorStop(0.3, `rgba(185, 164, 255, ${star.opacity * 0.5})`);
        gradient.addColorStop(1, "rgba(185, 164, 255, 0)");
        context.strokeStyle = gradient;
        context.lineWidth = 2;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(star.x, star.y);
        context.lineTo(tailX, tailY);
        context.stroke();
        context.fillStyle = "#fff";
        context.beginPath();
        context.arc(star.x, star.y, 2.2, 0, Math.PI * 2);
        context.fill();
      }
      stars = stars.filter((star) => star.y < innerHeight + 250 && star.x > -350);
      if (now < end || stars.length) frame = requestAnimationFrame(draw);
      else {
        active = false;
        removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", visibility);
        canvas.remove();
      }
    }
    function visibility() {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        lastTime = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }
    resize();
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(draw);
  }

  // src/achievements.ts
  var ACHIEVEMENTS = [
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
    { id: "konami", hint: "knows the old code" }
  ];
  var STORAGE_KEY = "secrets";
  function readProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  function writeProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
    }
  }
  var listeners = [];
  function unlock(id) {
    const progress = readProgress();
    if (progress[id]) return false;
    progress[id] = true;
    writeProgress(progress);
    for (const listener of listeners) listener(id);
    return true;
  }
  function onUnlock(listener) {
    listeners.push(listener);
  }
  function progressReport() {
    const progress = readProgress();
    return {
      unlocked: ACHIEVEMENTS.filter((achievement) => progress[achievement.id]).map((achievement) => achievement.hint),
      total: ACHIEVEMENTS.length,
      hints: ACHIEVEMENTS.filter((achievement) => !progress[achievement.id]).map((achievement) => achievement.hint)
    };
  }
  function initAchievements(say) {
    const milestone = ACHIEVEMENTS.length;
    let announced = {};
    try {
      announced = JSON.parse(localStorage.getItem("secrets-noted") ?? "{}");
    } catch {
      announced = {};
    }
    let count = Object.keys(readProgress()).length;
    const reactions = {
      1: "First secret found! There are more where that came from.",
      5: "Five secrets down. You're good at this.",
      10: "Ten secrets. Okay, you're showing off now.",
      [milestone]: "All of them?! Every single secret. I'm honestly impressed. You belong on this rooftop."
    };
    const announce = () => {
      count = Object.keys(readProgress()).length;
      if (announced[String(count)]) return;
      announced[String(count)] = true;
      try {
        localStorage.setItem("secrets-noted", JSON.stringify(announced));
      } catch {
      }
      const reaction = reactions[count];
      if (reaction) say(reaction);
    };
    onUnlock(announce);
  }

  // src/mascot.ts
  function initMascotPosition(hero) {
    const button = element("hit");
    const bubble = element("bubble");
    const dot = element("dot");
    const poster = element("hero-poster");
    function position() {
      const width = hero.clientWidth;
      const height = hero.clientHeight;
      const portrait = width <= height;
      const sourceWidth = poster.naturalWidth || 1344;
      const sourceHeight = poster.naturalHeight || 768;
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
  function initMikaSpeech(voice) {
    const bubble = element("bubble");
    const text = element("txt");
    const status = element("mascot-status");
    const dot = element("dot");
    let typingTimer = 0;
    let active2 = false;
    function say(line) {
      clearInterval(typingTimer);
      bubble.classList.add("show");
      bubble.classList.remove("typing");
      active2 = true;
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
        active2 = false;
      }, delay);
    }
    function busy() {
      return active2;
    }
    return { say, busy };
  }
  function initMascot(voice) {
    const button = element("hit");
    const soundButton = element("snd");
    let lineIndex = 0;
    let introTimer = 0;
    let holdTimer = 0;
    let greetingShown = false;
    let interacted = false;
    let holdTriggered = false;
    let typedKeys = "";
    const speech = initMikaSpeech(voice);
    const say = speech.say;
    function stopIntro() {
      interacted = true;
      clearTimeout(introTimer);
    }
    function wish() {
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
  function initStartScreen(video, startIntro) {
    const screen = element("start");
    const prompt = element("stp");
    const logo = document.querySelector(".logo svg");
    const slot = screen.querySelector(".slot");
    if (logo && slot) slot.appendChild(logo.cloneNode(true));
    let closed = false;
    let expiry = 0;
    function close(focus) {
      if (closed) return;
      closed = true;
      clearTimeout(expiry);
      screen.classList.add("hide");
      screen.setAttribute("aria-hidden", "true");
      screen.inert = true;
      setTimeout(() => {
        screen.hidden = true;
      }, REDUCED_MOTION ? 0 : 500);
      document.documentElement.classList.remove("lock");
      if (focus || document.activeElement === screen) {
        element("page-title").focus({ preventScroll: true });
      }
      startIntro();
    }
    function ready() {
      prompt.textContent = "Tap to start";
    }
    screen.addEventListener("click", () => close(true), { once: true });
    if (video.readyState >= 3 || REDUCED_MOTION) ready();
    else {
      video.addEventListener("canplay", ready, { once: true });
      video.addEventListener("error", ready, { once: true });
      setTimeout(ready, 1800);
    }
    expiry = setTimeout(() => close(false), 3200);
    screen.hidden = false;
    document.documentElement.classList.add("lock");
    screen.focus({ preventScroll: true });
  }

  // src/effects.ts
  function initReveal() {
    const nodes = document.querySelectorAll("[data-r]");
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    nodes.forEach((node) => {
      node.classList.add("reveal-ready");
      observer.observe(node);
    });
  }
  function initHeader() {
    const bar = document.querySelector(".bar");
    if (!bar) return;
    let pending = false;
    const update = () => {
      pending = false;
      bar.classList.toggle("sc", scrollY > 60);
    };
    addEventListener("scroll", () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  // src/scroll.ts
  function initScrollScenes() {
    const link = document.querySelector('.menu a[href="#work"]');
    const work = document.getElementById("work");
    if (!work || !link || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }, { rootMargin: "-15% 0px -15% 0px" }).observe(work);
  }

  // src/certificate-data.ts
  var CERTIFICATES = [
    {
      title: "WorldSkills Kazakhstan \u2014 3rd place, CyberSecurity",
      issuer: "WorldSkills Kazakhstan",
      date: "2025",
      preview: "assets/certificates/ws-2025-III-Respublic-CyberSecurity.jpg",
      pdf: "assets/certificates/ws-2025-III-Respublic-CyberSecurity.pdf"
    }
  ];

  // src/certificates.ts
  function initCertificates(certificates = CERTIFICATES) {
    if (!certificates.length) return;
    const section = element("certificates");
    const grid = element("certificate-grid");
    const dialog = element("certificate-dialog");
    const preview = element("certificate-preview");
    const download = element("certificate-download");
    const verify = element("certificate-verify");
    const close = element("certificate-close");
    for (const certificate of certificates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "certificate-card";
      const image = document.createElement("img");
      image.src = asset(certificate.preview);
      image.alt = "";
      image.loading = "lazy";
      const title = document.createElement("strong");
      title.textContent = certificate.title;
      const caption = document.createElement("span");
      caption.textContent = `${certificate.issuer} \xB7 ${certificate.date}`;
      button.append(image, title, caption);
      button.addEventListener("click", () => {
        unlock("certificates");
        element("certificate-name").textContent = certificate.title;
        preview.src = asset(certificate.preview);
        preview.alt = `${certificate.title} \u2014 ${certificate.issuer}`;
        download.href = asset(certificate.pdf);
        download.download = certificate.pdf.split("/").pop() ?? "certificate.pdf";
        verify.hidden = !certificate.verificationUrl;
        if (certificate.verificationUrl) verify.href = certificate.verificationUrl;
        else verify.removeAttribute("href");
        dialog.showModal();
        close.focus();
      });
      grid.append(button);
    }
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    section.hidden = false;
  }

  // src/terminal.ts
  var PROJECTS = [
    { name: "endfield-il2dump", kind: "Reverse engineering \xB7 C++", description: "Offline IL2CPP metadata dumper for Unity x64.", url: "https://github.com/2md55nmxkw-arch/endfield-il2dump" },
    { name: "Loliland-ModLoader", kind: "Systems \xB7 C++", description: "Mod loader for the Loliland launcher build.", url: "https://github.com/2md55nmxkw-arch/Loliland-ModLoader" },
    { name: "LuauEmu", kind: "Language tooling \xB7 Luau", description: "Luau script emulator that runs outside Roblox.", url: "https://github.com/2md55nmxkw-arch/LuauEmu" }
  ];
  var CONTACTS = [
    { key: "github", value: "github.com/2md55nmxkw-arch" },
    { key: "discord", value: "@mrxrer (copy it from the contact panel)" },
    { key: "astanahub", value: "astanahub.com" }
  ];
  var REACTIONS = /* @__PURE__ */ new Map([
    ["sudo", `${MASCOT_NAME}: Nice try. This terminal already runs as your browser.`],
    ["rm", `${MASCOT_NAME}: I hid the delete key. The rooftop stays.`],
    ["vim", `${MASCOT_NAME}: You are on your own in there. :q! has saved braver people.`],
    ["hello", `${MASCOT_NAME}: Hey! Click me on the rooftop if you want the full tour.`],
    ["hi", `${MASCOT_NAME}: Hey! Click me on the rooftop if you want the full tour.`],
    ["who", `${MASCOT_NAME}: That's 2md. I just live here.`],
    ["mika", `${MASCOT_NAME}: That's me! Try holding my rooftop avatar for a second. Wishes included.`],
    ["mrrx", `${MASCOT_NAME}: The fastest way to reach 2md. Copy it from the contact panel below.`],
    ["matrix", `${MASCOT_NAME}: There is no spoon. But there are 16 rooftop scenes.`],
    ["coffee", `${MASCOT_NAME}: 2md runs on it. I run on good weather.`]
  ]);
  var SEASON_ASSETS = 16;
  function print(host, lines) {
    for (const line of lines) host.print(line);
  }
  var SCAN_LINES = [
    "scanning 2md.arch (this very document)...",
    "PORT      SERVICE          STATE     DETAIL",
    "hero      video/seasons    open      4 seasons \xD7 4 times of day (16 scenes)",
    "mika      mascot/voice     open      clickable, huggable, slightly chaotic",
    "terminal  shell/reverse    open      you are here",
    "secrets   achievements     open      type 'achievements' for progress",
    "contact   discord/@mrxrer  open      fastest reply, copy from the panel",
    "scan complete: 0 critical, 0 high, 15 secrets remaining."
  ];
  var commands = [
    {
      name: "help",
      summary: "list available commands",
      run(host) {
        print(host, ["available commands:"]);
        for (const command of commands) host.print(`  ${command.name.padEnd(12)}${command.summary}`);
        host.print("psst: some undocumented commands exist. r3v3rs3 3ng1n33rs l1k3 expl0ring.");
      }
    },
    {
      name: "whoami",
      summary: "who is behind this page",
      run(host) {
        print(host, [
          "farid fatikhov \u2014 2md.arch",
          "engineer-developer & cybersecurity engineer, kazakhstan",
          "c++, typescript, reverse engineering. habit of looking underneath."
        ]);
      }
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
            "4 seasons \xD7 4 times of day, chosen by the Astana clock (UTC+5):",
            "  winter spring summer autumn \xD7 night morning day sunset",
            `  ${SEASON_ASSETS} looping videos, only the active one loads first`
          ]);
          return;
        }
        host.print(`ls: ${target || "home"}: about.md  projects/  contacts/  scenes/`, "out");
      }
    },
    {
      name: "cat",
      summary: "cat about | cat contact | cat <project>",
      run(host, arg) {
        const target = arg.trim();
        if (target === "about.md" || target === "about") {
          print(host, [
            "2md.arch \u2014 farid fatikhov",
            "i build tools and take software apart to see how it really works.",
            "from low-level systems to language tooling."
          ]);
          return;
        }
        if (target === "contact" || target === "contacts") {
          print(host, ["github:  https://github.com/2md55nmxkw-arch", "discord: @mrxrer  <- fastest reply", "astana hub: https://astanahub.com"]);
          return;
        }
        const project = PROJECTS.find((item) => item.name.toLowerCase() === target.toLowerCase());
        if (project) {
          print(host, [`${project.name} \u2014 ${project.kind}`, project.description, project.url]);
          return;
        }
        host.print(`cat: ${target || "(no file)"}: no such file`, "err");
      }
    },
    {
      name: "open",
      summary: "open <project> \u2014 open its repository",
      run(host, arg) {
        const project = PROJECTS.find((item) => item.name.toLowerCase() === arg.trim().toLowerCase());
        if (!project) {
          host.print(`open: ${arg.trim() || "(nothing)"}: try 'ls projects' first`, "err");
          return;
        }
        host.print(`opening ${project.name}...`);
        open(project.url, "_blank", "noopener");
      }
    },
    {
      name: "scan",
      summary: "scan this page itself",
      run(host) {
        host.stream(SCAN_LINES);
        unlock("scan");
      }
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
      }
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
        }
        host.print(`theme set to ${next}. the arch approves.`);
      }
    },
    {
      name: "underhood",
      summary: "how this page is built",
      run(host) {
        host.print("opening the engine room...");
        unlock("underhood");
        setTimeout(() => {
          const underhood = document.getElementById("underhood");
          const hoodClose = document.getElementById("hood-close");
          if (!underhood || !hoodClose) return;
          underhood.removeAttribute("hidden");
          hoodClose.focus();
        }, 0);
      }
    },
    {
      name: "mika",
      summary: "summon the mascot",
      run(host) {
        const reaction = REACTIONS.get("mika");
        if (reaction) host.print(reaction);
        unlock("mika");
        document.getElementById("hit")?.click();
      }
    },
    {
      name: "clear",
      summary: "clear the terminal",
      run() {
        const body = document.getElementById("term-body");
        if (body) body.replaceChildren();
      }
    },
    {
      name: "exit",
      summary: "close the terminal",
      run() {
        document.getElementById("term-close")?.click();
      }
    }
  ];
  function initTerminal() {
    const root = element("terminal");
    const panel = root.querySelector(".terminal-panel");
    const body = element("term-body");
    const input = element("term-input");
    const close = element("term-close");
    const history = [];
    let historyIndex = -1;
    let lastFocused = null;
    const host = {
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
        const queue = [...lines];
        const step = () => {
          const line = queue.shift();
          if (line === void 0) return;
          host.print(line, kind);
          if (queue.length) setTimeout(step, 90);
        };
        step();
      }
    };
    function openTerminal() {
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
        host.print("2md.arch terminal \u2014 type help for available commands.");
      }
    }
    function closeTerminal() {
      if (root.hidden) return;
      root.classList.remove("open");
      const finish = () => {
        root.hidden = true;
        lastFocused?.focus({ preventScroll: true });
      };
      if (REDUCED_MOTION) finish();
      else setTimeout(finish, 180);
    }
    const REACTION_SECRETS = /* @__PURE__ */ new Map([
      ["sudo", "sudo"],
      ["rm", "rm"],
      ["vim", "vim"],
      ["nano", "vim"],
      ["hello", "hello"],
      ["hi", "hello"],
      ["mika", "mika"],
      ["matrix", "matrix"],
      ["coffee", "coffee"]
    ]);
    function run(raw) {
      const line = raw.trim();
      if (!line) return;
      history.push(line);
      historyIndex = history.length;
      host.print(`\u279C ${line}`, "cmd");
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
        if (secret) unlock(secret);
        return;
      }
      if (lower.startsWith("sudo")) {
        host.print(REACTIONS.get("sudo"));
        unlock("sudo");
        return;
      }
      if (lower.startsWith("rm")) {
        host.print(REACTIONS.get("rm"));
        unlock("rm");
        return;
      }
      if (lower.startsWith("vim") || lower.startsWith("nano")) {
        host.print(REACTIONS.get("vim"));
        unlock("vim");
        return;
      }
      host.print(`command not found: ${name} \u2014 try 'help'`, "err");
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
      const target = event.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "`" || event.key === "~" && event.shiftKey) {
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
      if (event.key === "!" || event.key === "/" && event.shiftKey || event.key === "?") {
        event.preventDefault();
        toggleUnderhood();
      }
    });
    const underhood = element("underhood");
    const hoodClose = element("hood-close");
    function toggleUnderhood(force) {
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
    underhood.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        toggleUnderhood(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = underhood.querySelectorAll("button, a[href]");
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
    const button = document.getElementById("term-open");
    if (button) {
      button.setAttribute("aria-expanded", "false");
      new MutationObserver(() => button.setAttribute("aria-expanded", String(!root.hidden))).observe(root, { attributeFilter: ["hidden"] });
    }
  }

  // src/mika-reactions.ts
  var IDLE_LINES = [
    { minutes: 2, text: "Still there? The stars are nice tonight." },
    { minutes: 5, text: "I'll be here when you're back. Watching the city." },
    { minutes: 12, text: "Okay, I'm people-watching. There are three of them. Interesting." }
  ];
  var NIGHT_LINES = [
    "Late night browsing? Respect.",
    "The city is quieter now. I like it."
  ];
  var SCROLL_LINES = [
    "Careful with the scrollbar, it's a long way down."
  ];
  var TERMINAL_LINE = "Ooh, a terminal. Now this is my kind of page.";
  var KONAMI_LINE = "The old code! Up up down down... you've done this before, haven't you?";
  var KONAMI_ALL_SCENES_LINE = "Rooftop tour: every season, every hour. Try the clock, they rotate.";
  function initMikaReactions(speech) {
    const say = speech.say;
    let idleStep = 0;
    let idleTimer = 0;
    let nightNoted = false;
    let terminalNoted = false;
    let scrollNoted = false;
    function resetIdle() {
      clearTimeout(idleTimer);
      idleStep = 0;
      scheduleIdle();
    }
    function scheduleIdle() {
      const next = IDLE_LINES[idleStep];
      if (!next) return;
      idleTimer = setTimeout(() => {
        idleStep++;
        say(next.text);
        scheduleIdle();
      }, next.minutes * 60 * 1e3);
    }
    const activity = () => resetIdle();
    addEventListener("pointerdown", activity, { passive: true });
    addEventListener("keydown", activity);
    addEventListener("scroll", activity, { passive: true });
    scheduleIdle();
    function noteNight() {
      if (nightNoted) return;
      const hour = astanaTime().hour;
      if (hour >= 23 || hour < 5) {
        nightNoted = true;
        setTimeout(() => say(NIGHT_LINES[0]), 3e4);
      }
    }
    noteNight();
    setInterval(noteNight, 15 * 60 * 1e3);
    const terminal = document.getElementById("terminal");
    if (terminal) {
      new MutationObserver(() => {
        if (!terminal.hidden && !terminalNoted) {
          terminalNoted = true;
          setTimeout(() => say(TERMINAL_LINE), 1200);
        }
      }).observe(terminal, { attributeFilter: ["hidden"] });
    }
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
    const konami = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    let konamiIndex = 0;
    addEventListener("keydown", (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      konamiIndex = key === konami[konamiIndex] ? konamiIndex + 1 : key === konami[0] ? 1 : 0;
      if (konamiIndex < konami.length) return;
      konamiIndex = 0;
      if (unlock("konami")) {
        say(KONAMI_LINE);
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

  // src/discord.ts
  var DISCORD_USERNAME = "@mrxrer";
  function initDiscordContact(say) {
    const button = element("discord");
    const status = element("discord-status");
    const copyIcon = document.getElementById("discord-copy");
    let restoreTimer = 0;
    async function copy() {
      unlock("discord");
      let copied = false;
      try {
        await navigator.clipboard.writeText(DISCORD_USERNAME);
        copied = true;
      } catch {
        copied = false;
      }
      if (!copied) {
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
        }, 2e3);
      }
    }
    button.addEventListener("click", () => void copy());
  }

  // src/repo-badges.ts
  function starIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2l2.9 6.26 6.6.56-5 4.36 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.36 6.6-.56L12 2z");
    svg.appendChild(path);
    return svg;
  }
  function initRepoBadges() {
    const source = document.getElementById("repo-stats")?.textContent;
    if (!source) return;
    let stats;
    try {
      stats = JSON.parse(source);
    } catch {
      return;
    }
    for (const panel of document.querySelectorAll(".project-panel")) {
      const repo = panel.dataset.project;
      if (!repo) continue;
      const entry = stats[`2md55nmxkw-arch/${repo}`];
      if (!entry) continue;
      const stars = entry.stars ?? 0;
      const language = entry.language ?? "";
      if (stars <= 0 && !language) continue;
      const copy = panel.querySelector(".project-copy");
      if (!copy) continue;
      const badges = document.createElement("p");
      badges.className = "repo-badges";
      badges.setAttribute("aria-hidden", "true");
      if (stars > 0) {
        const star = document.createElement("span");
        star.className = "repo-badge";
        star.append(starIcon(), document.createTextNode(String(stars)));
        star.setAttribute("title", `${stars} stars on GitHub`);
        badges.appendChild(star);
      }
      if (language) {
        const lang = document.createElement("span");
        lang.className = "repo-badge";
        lang.textContent = language;
        badges.appendChild(lang);
      }
      const kind = copy.querySelector(".project-kind");
      if (kind && kind.nextElementSibling) copy.insertBefore(badges, kind.nextElementSibling);
      else copy.appendChild(badges);
    }
  }

  // src/main.ts
  function main() {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
    } catch {
    }
    const hero = element("hero");
    element("who").textContent = MASCOT_NAME;
    const activeVideo = initScenes(hero);
    const ambient = createAmbient(element("amb"));
    const voice = createVoice(element("snd"), ambient);
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
    console.log(
      '%c2md.arch%c \u2014 reading the console, huh? Right instinct.\nUnlock the source-reader secret: run %cunlock("source")%c in this console.\nOr take the scenic route: press ` and type scan.',
      "font-weight:bold;color:#a78bfa",
      "",
      "color:#a78bfa",
      ""
    );
    window.unlockSecret = (id) => {
      if (id === "source") unlock("source");
    };
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {
      });
    }
  }
  try {
    main();
  } catch (error) {
    restoreContent();
    console.error("Portfolio initialization failed:", error);
  }
})();
