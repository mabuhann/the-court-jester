(() => {
  // Guard: only one instance per page
  if (window.__courtJesterActive) return;
  window.__courtJesterActive = true;

  /* ═══════════════════════════════════════════════════════════════════════
     SPRITE CONFIG
     Values extracted from sprite_preview.html:
       idle:  3 frames @ 5 fps,  scale 0.88
       run:   3 frames @ 10 fps, scale 544/389 (~1.398)
       clap:  3 frames @ 8 fps,  scale 1.0
       dance: 4 frames @ 8 fps,  scale 1.0
     Frame width = naturalWidth / frames (computed at runtime)
     Frame height = naturalHeight (computed at runtime)
  ═══════════════════════════════════════════════════════════════════════ */
  const SPRITES = {
    idle:  { src: "assets/jester_idle_normalized.png",     frames: 3, fps: 5,  scale: 0.88 * 0.55 },
    run:   { src: "assets/jester_running_normalized.png",  frames: 3, fps: 10, scale: (544 / 389) * 0.55 },
    clap:  { src: "assets/jester_clapping_normalized.png", frames: 3, fps: 8,  scale: 1 * 0.55 },
    dance: { src: "assets/jester_dancing_normalized.png",  frames: 4, fps: 8,  scale: 1 * 0.55 }
  };

  const PROCLAMATIONS = [
    "My liege\u2026",
    "The realm demands distraction.",
    "Efficiency hath been outlawed.",
    "Thou seemest focused\u2026 suspicious.",
    "Shall we abandon this task?",
    "Productivity is a most dreadful curse.",
    "Hark! A notification most unimportant!",
    "The crown requires thy attention.",
    "Forsooth, this task is beneath thee.",
    "A jester never rests. Neither shalt thou.",
    "Why work when thou canst watch me?",
    "The court demands entertainment!",
    "Art thou\u2026 working? For shame.",
    "Is that a spreadsheet? Bold choice.",
    "The jester sees all. The jester judges.",
    "Focus is the enemy of fun.",
    "Thou hast been warned. Repeatedly.",
    "The deadline is merely a suggestion.",
  ];

  /* ═══════════════════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════════════════ */
  const state = {
    // DOM refs
    root: null,
    jester: null,
    bubble: null,
    banner: null,
    // Sprite engine
    currentState: "idle",
    frameIndex: 0,
    animTimer: null,
    loadToken: 0,
    imageCache: new Map(),
    // Position
    x: 0,
    y: 0,
    facingRight: true,
    jesterWidth: 80,
    jesterHeight: 100,
    // Movement animation
    animFrame: null,
    animResolve: null,
    // Behavior system
    isPerforming: false,
    behaviorTimeout: null,
    // Pranks
    videoCheckInterval: null,
    // Lifecycle
    enabled: false,
    worseMode: false,
    // Stats
    stats: { videosPaused: 0, proclamations: 0, behaviorsFired: 0 },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════════════════════════════════════ */
  function getUrl(path) { return chrome.runtime.getURL(path); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function vw() { return window.innerWidth; }
  function vh() { return window.innerHeight; }
  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* ═══════════════════════════════════════════════════════════════════════
     DOM MANAGEMENT
  ═══════════════════════════════════════════════════════════════════════ */
  function ensureDom() {
    if (state.root) return;

    const root = document.createElement("div");
    root.id = "court-jester-root";

    const jester = document.createElement("div");
    jester.id = "court-jester";
    jester.dataset.state = "idle";

    const bubble = document.createElement("div");
    bubble.id = "court-jester-bubble";

    const banner = document.createElement("div");
    banner.id = "court-jester-banner";

    root.appendChild(jester);
    root.appendChild(bubble);
    document.documentElement.appendChild(root);
    document.documentElement.appendChild(banner);

    state.root = root;
    state.jester = jester;
    state.bubble = bubble;
    state.banner = banner;

    // Initial position: bottom-left
    _applyRootTransform(32, vh() - 200);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SPRITE ENGINE
     Preserved from original — analyzes pixel data to find visible frame
     bounds, then renders each frame to a canvas data URL for jitter-free
     background-image swapping.
  ═══════════════════════════════════════════════════════════════════════ */
  function clearAnimTimer() {
    if (state.animTimer) {
      clearInterval(state.animTimer);
      state.animTimer = null;
    }
  }

  function analyzeFrameBounds(img, frameWidth, frameHeight, frameIndex) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(frameWidth);
    canvas.height = frameHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, frameIndex * frameWidth, 0, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] < 8) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0) {
      return { anchorX: frameWidth / 2, anchorY: frameHeight, minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
    }

    const lowerBodyStartY = Math.min(height - 1, Math.max(minY, Math.floor(height * 0.55)));
    let weightedX = 0, weightedCount = 0;
    for (let y = lowerBodyStartY; y <= maxY; y++) {
      const rowWeight = y - lowerBodyStartY + 1;
      for (let x = minX; x <= maxX; x++) {
        if (data[(y * width + x) * 4 + 3] < 8) continue;
        weightedX += x * rowWeight;
        weightedCount += rowWeight;
      }
    }

    return {
      anchorX: weightedCount > 0 ? weightedX / weightedCount : (minX + maxX) / 2,
      anchorY: maxY,
      minX, minY, maxX, maxY,
    };
  }

  function analyzeSprite(img, frames, frameWidth, frameHeight) {
    const frameMetrics = Array.from({ length: frames }, (_, i) =>
      analyzeFrameBounds(img, frameWidth, frameHeight, i)
    );
    const visibleWidths  = frameMetrics.map((m) => m.maxX - m.minX + 1);
    const visibleHeights = frameMetrics.map((m) => m.maxY - m.minY + 1);
    const stageBottom    = Math.max(...frameMetrics.map((m) => m.maxY));
    const stageTop       = Math.min(...frameMetrics.map((m) => m.minY));
    const stageWidth     = Math.max(1, ...visibleWidths);
    const stageHeight    = Math.max(1, stageBottom - stageTop + 1);

    return {
      frameMetrics,
      frameOffsets: frameMetrics.map((m, i) => ({
        x: Math.round((stageWidth - visibleWidths[i]) / 2 - m.minX),
        y: Math.round(stageBottom - m.maxY),
      })),
      stageWidth,
      stageHeight,
      visibleHeight: Math.max(1, ...visibleHeights),
    };
  }

  function buildFrameDataUrls(img, metrics, frameWidth, scale) {
    const sw = Math.max(1, Math.round(metrics.stageWidth * scale));
    const sh = Math.max(1, Math.round(metrics.stageHeight * scale));

    return metrics.frameMetrics.map((metric, i) => {
      const vw2 = metric.maxX - metric.minX + 1;
      const vh2 = metric.maxY - metric.minY + 1;
      const canvas = document.createElement("canvas");
      canvas.width  = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        img,
        i * frameWidth + metric.minX, metric.minY, vw2, vh2,
        Math.round((sw - vw2 * scale) / 2),
        Math.round(sh - vh2 * scale),
        vw2 * scale,
        vh2 * scale
      );
      return canvas.toDataURL();
    });
  }

  function preloadSprite(name) {
    if (state.imageCache.has(name)) return state.imageCache.get(name);
    const def = SPRITES[name];
    if (!def) throw new Error(`Unknown jester state: ${name}`);

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const frameWidth = img.naturalWidth / def.frames;
        const metrics    = analyzeSprite(img, def.frames, frameWidth, img.naturalHeight);
        const scale      = def.scale || 1;
        resolve({
          img,
          frameWidth,
          frameHeight: img.naturalHeight,
          frames: def.frames,
          fps: def.fps,
          scale,
          frameUrls: buildFrameDataUrls(img, metrics, frameWidth, scale),
          stageWidth:    Math.round(metrics.stageWidth * scale),
          stageHeight:   Math.round(metrics.stageHeight * scale),
          visibleHeight: Math.round(metrics.visibleHeight * scale),
        });
      };
      img.onerror = reject;
      img.src = getUrl(def.src);
    });

    state.imageCache.set(name, promise);
    return promise;
  }

  function renderFrame(sprite, frameIndex) {
    state.frameIndex = frameIndex;
    if (!state.jester) return;
    const url = sprite.frameUrls?.[frameIndex] || sprite.frameUrls?.[0] || "";
    state.jester.style.backgroundImage    = url ? `url("${url}")` : "";
    state.jester.style.backgroundPosition = "0px 0px";
  }

  async function applyJesterState(nextState) {
    // Don't recreate DOM if the jester was disabled mid-behavior
    if (!state.root) return;

    const token = ++state.loadToken;
    clearAnimTimer();
    state.currentState = nextState;
    if (state.jester) state.jester.dataset.state = nextState;

    let sprite;
    try {
      sprite = await preloadSprite(nextState);
    } catch (e) {
      return;
    }
    // Bail if state changed or DOM was torn down while awaiting
    if (token !== state.loadToken || !state.root || !state.jester) return;

    state.jester.style.backgroundSize = `${sprite.stageWidth}px ${sprite.stageHeight}px`;
    state.jester.style.width          = `${sprite.stageWidth}px`;
    state.jester.style.height         = `${sprite.stageHeight}px`;
    state.root.style.width            = `${sprite.stageWidth}px`;
    state.root.style.height           = `${sprite.stageHeight}px`;
    state.jesterWidth  = sprite.stageWidth;
    state.jesterHeight = sprite.stageHeight;

    renderFrame(sprite, 0);

    const frameMs = Math.max(24, Math.round(1000 / sprite.fps));
    state.animTimer = setInterval(() => {
      state.frameIndex = (state.frameIndex + 1) % sprite.frames;
      renderFrame(sprite, state.frameIndex);
    }, frameMs);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     POSITIONING
     All movement goes through _applyRootTransform / moveJester.
     setFacing flips the sprite element independently so the bubble
     (a sibling in the root) remains unaffected.
  ═══════════════════════════════════════════════════════════════════════ */
  function _applyRootTransform(x, y) {
    state.x = Math.round(x);
    state.y = Math.round(y);
    if (state.root) {
      state.root.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
    }
  }

  function moveJester(x, y) {
    if (!state.root) return;
    _applyRootTransform(x, y);
  }

  function setFacing(right) {
    state.facingRight = right;
    if (state.jester) {
      state.jester.style.transform = right ? "scaleX(1)" : "scaleX(-1)";
    }
  }

  function cancelAnimMovement() {
    if (state.animFrame) {
      cancelAnimationFrame(state.animFrame);
      state.animFrame = null;
    }
    // Resolve any pending animateTo promise so async behavior chains unblock
    if (state.animResolve) {
      state.animResolve();
      state.animResolve = null;
    }
  }

  function animateTo(targetX, targetY, duration) {
    return new Promise((resolve) => {
      cancelAnimMovement();
      const startX = state.x;
      const startY = state.y;
      const startTime = performance.now();
      state.animResolve = resolve;

      function step(now) {
        if (!state.root) { state.animResolve = null; resolve(); return; }
        const t = Math.min((now - startTime) / duration, 1);
        _applyRootTransform(startX + (targetX - startX) * t, startY + (targetY - startY) * t);
        if (t < 1) {
          state.animFrame = requestAnimationFrame(step);
        } else {
          state.animFrame    = null;
          state.animResolve  = null;
          resolve();
        }
      }
      state.animFrame = requestAnimationFrame(step);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MESSAGES
  ═══════════════════════════════════════════════════════════════════════ */
  function showJesterMessage(text, duration = 3000) {
    if (!state.bubble) return;
    state.bubble.textContent = text;
    state.bubble.classList.add("is-visible");
    clearTimeout(state.bubble._hideTimer);
    state.bubble._hideTimer = setTimeout(
      () => state.bubble?.classList.remove("is-visible"),
      duration
    );
  }

  function showRoyalBanner(text, duration = 2800) {
    if (!state.banner) return;
    state.banner.textContent = text;
    state.banner.classList.add("is-visible");
    clearTimeout(state.banner._hideTimer);
    state.banner._hideTimer = setTimeout(
      () => state.banner?.classList.remove("is-visible"),
      duration
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BEHAVIOR SYSTEM
     beginBehavior() / endBehavior() enforce the isPerforming lock.
     Every behavior must call beginBehavior() at the top (bail if false)
     and endBehavior() at the bottom (even on early exit).
  ═══════════════════════════════════════════════════════════════════════ */
  function beginBehavior() {
    if (state.isPerforming || !state.enabled) return false;
    state.isPerforming = true;
    state.stats.behaviorsFired++;
    saveStats();
    return true;
  }

  function endBehavior() {
    state.isPerforming = false;
    setFacing(true);
    scheduleNextBehavior();
  }

  // ── Run across screen ───────────────────────────────────────────────
  async function runAcrossScreen() {
    if (!beginBehavior()) return;

    const goRight = Math.random() > 0.5;
    const jW      = state.jesterWidth  || 80;
    const jH      = state.jesterHeight || 100;
    const groundY = vh() - jH - 10;
    const startX  = goRight ? -(jW + 10)  : vw() + 10;
    const endX    = goRight ?  vw() + 10  : -(jW + 10);

    setFacing(goRight);
    moveJester(startX, groundY);
    await applyJesterState("run");
    if (!state.root) { endBehavior(); return; }

    const distance = Math.abs(endX - startX);
    const speed    = state.worseMode ? 380 : 240; // px/s
    await animateTo(endX, groundY, (distance / speed) * 1000);

    await applyJesterState("idle");
    endBehavior();
  }

  // ── Dance in corner ─────────────────────────────────────────────────
  async function danceInCorner() {
    if (!beginBehavior()) return;

    const jW = state.jesterWidth  || 80;
    const jH = state.jesterHeight || 100;
    const corners = [
      { x: 20,           y: vh() - jH - 20 },
      { x: vw() - jW - 20, y: vh() - jH - 20 },
      { x: 20,             y: 40 },
      { x: vw() - jW - 20, y: 40 },
    ];
    const corner = pick(corners);

    await applyJesterState("run");
    if (!state.root) { endBehavior(); return; }
    setFacing(corner.x > state.x);
    await animateTo(corner.x, corner.y, 550);

    await applyJesterState("dance");
    if (!state.root) { endBehavior(); return; }
    showJesterMessage(pick([
      "Behold, my finest steps!",
      "The court demands a dance!",
      "Can thou match this grace?",
      "Dance, peasant! \u2026that\u2019s me.",
      "La la la la la.",
    ]));
    await delay(state.worseMode ? 2000 : 3500);

    await applyJesterState("idle");
    endBehavior();
  }

  // ── Clap randomly ───────────────────────────────────────────────────
  async function clapRandomly() {
    if (!beginBehavior()) return;

    const jH      = state.jesterHeight || 100;
    const jW      = state.jesterWidth  || 80;
    const targetX = rand(20, vw() - jW - 20);
    const targetY = rand(vh() * 0.35, vh() - jH - 20);

    await applyJesterState("run");
    if (!state.root) { endBehavior(); return; }
    setFacing(targetX > state.x);
    await animateTo(targetX, targetY, 450);

    await applyJesterState("clap");
    if (!state.root) { endBehavior(); return; }
    showJesterMessage(pick([
      "Bravo! Bravo!",
      "A magnificent nothing!",
      "I applaud thine confusion.",
      "Clap for the jester!",
      "Performance: 10/10.",
      "Simply dazzling.",
    ]));
    await delay(state.worseMode ? 1800 : 2800);

    await applyJesterState("idle");
    endBehavior();
  }

  // ── Idle proclamation ───────────────────────────────────────────────
  async function idleProclamation() {
    if (!beginBehavior()) return;
    state.stats.proclamations++;
    saveStats();

    showJesterMessage(pick(PROCLAMATIONS));
    await delay(3500);
    endBehavior();
  }

  // ── Center distraction (high-impact) ────────────────────────────────
  async function centerDistraction() {
    if (!beginBehavior()) return;

    const jW = state.jesterWidth  || 80;
    const jH = state.jesterHeight || 100;

    await applyJesterState("run");
    if (!state.root) { endBehavior(); return; }
    const cx = (vw() - jW) / 2;
    const cy = (vh() - jH) / 2;
    setFacing(cx > state.x);
    await animateTo(cx, cy, 350);

    await applyJesterState("dance");
    if (!state.root) { endBehavior(); return; }
    showJesterMessage(pick([
      "LOOK AT ME.",
      "Thy focus hath been stolen.",
      "The center of all things!",
      "Resistance is futile, my liege.",
      "I have replaced your productivity.",
    ]));
    await delay(state.worseMode ? 2200 : 3200);

    await applyJesterState("run");
    if (!state.root) { endBehavior(); return; }
    const retX = rand(20, vw() - (state.jesterWidth || 80) - 20);
    setFacing(retX > state.x);
    await animateTo(retX, vh() - (state.jesterHeight || 100) - 20, 380);

    await applyJesterState("idle");
    endBehavior();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PRANK SYSTEM
  ═══════════════════════════════════════════════════════════════════════ */
  function tryPauseVideo() {
    if (!state.enabled) return;
    const videos = Array.from(document.querySelectorAll("video"))
      .filter((v) => !v.paused && v.readyState >= 2);
    if (!videos.length) return;

    pick(videos).pause();
    state.stats.videosPaused++;
    saveStats();

    showJesterMessage(pick([
      "Intermission, my liege.",
      "The performance lacks flair.",
      "I\u2019ve improved thine viewing.",
      "A royal pause hath been declared.",
      "The jester demands attention.",
    ]));
  }

  function startVideoWatcher() {
    stopVideoWatcher();
    const interval = state.worseMode ? 9000 : 20000;
    state.videoCheckInterval = setInterval(() => {
      if (!state.enabled) return;
      if (Math.random() < (state.worseMode ? 0.55 : 0.28)) {
        tryPauseVideo();
      }
    }, interval);
  }

  function stopVideoWatcher() {
    if (state.videoCheckInterval) {
      clearInterval(state.videoCheckInterval);
      state.videoCheckInterval = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SCHEDULER
     Timing is randomised with ±jitter so the jester never feels like a clock.
     Proclamations are weighted higher — the jester should always be talking.
  ═══════════════════════════════════════════════════════════════════════ */
  const POOL_NORMAL = [
    runAcrossScreen, runAcrossScreen,
    danceInCorner,
    clapRandomly,
    idleProclamation, idleProclamation, idleProclamation,
    centerDistraction,
  ];

  const POOL_WORSE = [
    runAcrossScreen, runAcrossScreen, runAcrossScreen,
    danceInCorner, danceInCorner,
    clapRandomly, clapRandomly,
    idleProclamation, idleProclamation,
    centerDistraction, centerDistraction,
  ];

  function scheduleNextBehavior() {
    if (!state.enabled) return;
    clearTimeout(state.behaviorTimeout);

    const base   = state.worseMode ? randInt(3500, 8500) : randInt(9000, 19000);
    const jitter = rand(-1200, 1200);
    const d      = Math.max(1000, base + jitter);

    state.behaviorTimeout = setTimeout(() => {
      if (!state.enabled) return;
      pick(state.worseMode ? POOL_WORSE : POOL_NORMAL)();
    }, d);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STATS
  ═══════════════════════════════════════════════════════════════════════ */
  function saveStats() {
    chrome.storage.local.set({ cj_stats: state.stats });
  }

  function loadStats() {
    chrome.storage.local.get("cj_stats", (result) => {
      if (result.cj_stats) Object.assign(state.stats, result.cj_stats);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════════════════════════════════ */
  function enable() {
    if (state.enabled) return;
    state.enabled = true;
    loadStats();
    ensureDom();
    applyJesterState("idle");
    showRoyalBanner("The Court Jester is loose.");
    // Short grace period before first behavior so the banner is seen
    setTimeout(() => scheduleNextBehavior(), 2800);
    startVideoWatcher();
  }

  function disable() {
    state.enabled = false;
    clearAnimTimer();
    cancelAnimMovement();
    clearTimeout(state.behaviorTimeout);
    state.behaviorTimeout = null;
    stopVideoWatcher();
    // isPerforming: leave for any in-flight async chain to reset itself
    state.loadToken++;

    if (state.root)   state.root.remove();
    if (state.banner) state.banner.remove();

    state.root         = null;
    state.jester       = null;
    state.bubble       = null;
    state.banner       = null;
    state.currentState = "idle";
    state.frameIndex   = 0;
    state.isPerforming = false;
  }

  function setWorseMode(active) {
    state.worseMode = active;
    if (state.enabled) {
      startVideoWatcher(); // restart with updated interval
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MESSAGE LISTENER
  ═══════════════════════════════════════════════════════════════════════ */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg?.type) return;

    switch (msg.type) {
      case "CJ_ENABLE":
        enable();
        sendResponse({ ok: true });
        break;

      case "CJ_DISABLE":
        disable();
        sendResponse({ ok: true });
        break;

      case "CJ_WORSE":
        setWorseMode(msg.active ?? true);
        sendResponse({ ok: true });
        break;

      case "CJ_GET_STATS":
        sendResponse({ ok: true, stats: { ...state.stats } });
        break;

      case "CJ_SET_STATE":
        applyJesterState(msg.state || "idle").then(() => sendResponse?.({ ok: true }));
        return true; // async response

      case "CJ_MOVE":
        moveJester(msg.x || 0, msg.y || 0);
        sendResponse({ ok: true });
        break;

      case "CJ_SAY":
        showJesterMessage(msg.text || "");
        sendResponse({ ok: true });
        break;

      case "CJ_BANNER":
        showRoyalBanner(msg.text || "");
        sendResponse({ ok: true });
        break;

      case "CJ_REMOVE":
        disable();
        sendResponse({ ok: true });
        break;
    }
  });

  /* ═══════════════════════════════════════════════════════════════════════
     INIT — auto-restore if the user had the jester enabled before navigation
  ═══════════════════════════════════════════════════════════════════════ */
  chrome.storage.local.get(["cj_enabled", "cj_worse"], (result) => {
    if (result.cj_worse)   state.worseMode = true;
    if (result.cj_enabled) enable();
  });

  // Debug / testing API
  window.CourtJester = { enable, disable, setWorseMode, say: showJesterMessage, banner: showRoyalBanner };
})();
