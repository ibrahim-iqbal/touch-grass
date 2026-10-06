// touch grass — voice dares that get you outside
// state lives in localStorage, nothing leaves the browser unless the user
// pastes their own hugging face token or elevenlabs key in settings.

const STORE_KEY = "touchgrass_state_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) throw new Error("no state yet");
    return JSON.parse(raw);
  } catch {
    return { daresDone: 0, outsideMinutes: 0, streak: 0, bestStreak: 0, lastProofDate: null };
  }
}

function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

function loadSecrets() {
  try { return JSON.parse(localStorage.getItem("touchgrass_secrets_v1")) || {}; } catch { return {}; }
}

function saveSecrets(secrets) {
  try { localStorage.setItem("touchgrass_secrets_v1", JSON.stringify(secrets)); } catch {}
}

let state = loadState();
let currentDare = null;

const els = {
  streakCount: document.getElementById("streak-count"),
  dareCard: document.getElementById("dare-card"),
  dareText: document.getElementById("dare-text"),
  dareTime: document.getElementById("dare-time"),
  dareEnergy: document.getElementById("dare-energy"),
  pitch: document.getElementById("pitch"),
  micBtn: document.getElementById("mic-btn"),
  micHint: document.getElementById("mic-hint"),
  proofBtn: document.getElementById("proof-btn"),
  proofThumb: document.getElementById("proof-thumb"),
  statDares: document.getElementById("stat-dares"),
  statTime: document.getElementById("stat-time"),
  statBest: document.getElementById("stat-best"),
  themeBtn: document.getElementById("theme-btn"),
  themeIconDark: document.getElementById("theme-icon-dark"),
  themeIconLight: document.getElementById("theme-icon-light"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsModal: document.getElementById("settings-modal"),
  settingsSave: document.getElementById("settings-save"),
  hfToken: document.getElementById("hf-token"),
  elevenKey: document.getElementById("elevenlabs-key"),
  cameraModal: document.getElementById("camera-modal"),
  cameraFeed: document.getElementById("camera-feed"),
  cameraCanvas: document.getElementById("camera-canvas"),
  cameraSnap: document.getElementById("camera-snap"),
  cameraCancel: document.getElementById("camera-cancel"),
  scene: document.querySelector(".scene"),
  player: document.getElementById("player"),
  clouds: document.querySelector(".clouds"),
  levelNum: document.getElementById("level-num"),
  rankTitle: document.getElementById("rank-title"),
  xpFill: document.getElementById("xp-fill"),
  xpBar: document.getElementById("xp-bar"),
  streakPips: document.getElementById("streak-pips"),
  badges: document.getElementById("badges"),
};

// ponytail: dares-done clouds are capped so the sky doesn't fill up forever —
// upgrade path is a "cleared the sky" milestone if this ever feels limiting.
const MAX_DARE_CLOUDS = 8;

function renderDareClouds(daresDone, animateNewest) {
  els.clouds.querySelectorAll(".dare-cloud").forEach(c => c.remove());
  const count = Math.min(daresDone, MAX_DARE_CLOUDS);
  for (let i = 0; i < count; i++) {
    const isNewest = animateNewest && i === count - 1;
    spawnCloud(isNewest, i);
  }
}

function spawnCloud(isNew, seed) {
  const cloud = document.createElement("span");
  cloud.className = "cloud dare-cloud" + (isNew ? " cloud-new" : "");
  const rand = (min, max, s) => min + ((Math.sin(s * 999) + 1) / 2) * (max - min);
  const size = rand(26, 50, seed + 1);
  cloud.style.width = `${size}px`;
  cloud.style.height = `${size * 0.42}px`;
  cloud.style.top = `${rand(4, 34, seed + 2)}%`;
  cloud.style.left = isNew ? "-90px" : `${rand(0, 100, seed + 3)}%`;
  if (isNew) {
    cloud.style.setProperty("--cloud-drift-duration", `${rand(40, 65, seed + 4)}s`);
  } else {
    cloud.style.animationDuration = `${rand(40, 65, seed + 4)}s`;
    cloud.style.animationDelay = `-${rand(0, 40, seed + 5)}s`;
  }
  els.clouds.appendChild(cloud);
  if (isNew) setTimeout(() => cloud.classList.remove("cloud-new"), 1200);
}

// ponytail: simple dare-count thresholds, not a real progression system —
// upgrade path is tuning these numbers once real usage data exists.
function worldTier(daresDone) {
  if (daresDone >= 14) return 3;
  if (daresDone >= 7) return 2;
  if (daresDone >= 3) return 1;
  return 0;
}

// --- hud: level, xp, streak pips, badges ---
const RANKS = ["newcomer", "wanderer", "trailblazer", "pathfinder", "ranger", "grass master"];
const XP_PER_LEVEL = 3;

function computeLevel(daresDone) {
  const level = Math.floor(daresDone / XP_PER_LEVEL) + 1;
  const xpInLevel = daresDone % XP_PER_LEVEL;
  const title = RANKS[Math.min(level - 1, RANKS.length - 1)];
  return { level, xpInLevel, xpToNext: XP_PER_LEVEL, title };
}

const FLAME_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 .5 2-1 3-2 2 1-2-1-3-1-5z"/></svg>';

const BADGES = [
  { id: "first_dare", label: "first dare done", test: s => s.daresDone >= 1,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c0-6 4-10 8-11-1 6-4 10-8 11z"/><path d="M12 22c0-6-4-10-8-11 1 6 4 10 8 11z"/></svg>' },
  { id: "streak_3", label: "3 day streak", test: s => s.bestStreak >= 3,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 .5 2-1 3-2 2 1-2-1-3-1-5z"/></svg>' },
  { id: "streak_7", label: "7 day streak", test: s => s.bestStreak >= 7,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2"/></svg>' },
  { id: "hour_outside", label: "1 hour outside total", test: s => s.outsideMinutes >= 60,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>' },
];

let unlockedBadgeIds = new Set();

function renderBadges(detectNew) {
  const nowUnlocked = new Set(BADGES.filter(b => b.test(state)).map(b => b.id));
  els.badges.innerHTML = "";
  for (const badge of BADGES) {
    const isUnlocked = nowUnlocked.has(badge.id);
    const isNew = detectNew && isUnlocked && !unlockedBadgeIds.has(badge.id);
    const el = document.createElement("div");
    el.className = "badge" + (isUnlocked ? " unlocked" : "") + (isNew ? " just-unlocked" : "");
    el.title = badge.label;
    el.setAttribute("aria-label", (isUnlocked ? "unlocked: " : "locked: ") + badge.label);
    el.innerHTML = badge.icon;
    els.badges.appendChild(el);
  }
  unlockedBadgeIds = nowUnlocked;
}

function renderHud(detectNewBadges) {
  const { level, xpInLevel, xpToNext, title } = computeLevel(state.daresDone);
  els.levelNum.textContent = level;
  els.rankTitle.textContent = title;
  const pct = Math.round((xpInLevel / xpToNext) * 100);
  els.xpFill.style.width = `${pct}%`;
  els.xpBar.setAttribute("aria-valuenow", String(pct));

  const maxPips = 7;
  const lit = Math.min(state.streak, maxPips);
  els.streakPips.innerHTML = "";
  for (let i = 0; i < maxPips; i++) {
    const pip = document.createElement("span");
    pip.className = "pip" + (i < lit ? " lit" : "");
    if (i < lit) pip.innerHTML = FLAME_ICON;
    els.streakPips.appendChild(pip);
  }
  els.streakCount.textContent = state.streak > maxPips ? `+${state.streak - maxPips}` : String(state.streak);

  renderBadges(detectNewBadges);
}

function renderStats(animateNewestCloud) {
  els.statDares.textContent = state.daresDone;
  els.statTime.textContent = `${state.outsideMinutes}m`;
  els.statBest.textContent = state.bestStreak;
  if (state.daresDone > 0) els.pitch.classList.add("hidden");
  els.scene.dataset.tier = String(worldTier(state.daresDone));
  renderDareClouds(state.daresDone, animateNewestCloud);
  renderHud(animateNewestCloud);
}

function bumpStat(el) {
  el.classList.remove("bump");
  // restart the animation even if it's already mid-play
  void el.offsetWidth;
  el.classList.add("bump");
}

function celebrate() {
  els.player.classList.remove("celebrating");
  void els.player.offsetWidth;
  els.player.classList.add("celebrating");
  setTimeout(() => els.player.classList.remove("celebrating"), 1000);

  const rect = els.player.getBoundingClientRect();
  const burst = document.createElement("span");
  burst.className = "sparkle-burst";
  burst.textContent = "+1 ✦";
  burst.style.left = `${rect.left + rect.width / 2 - 14}px`;
  burst.style.top = `${rect.top - 10}px`;
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1200);
}

function renderDare(dare) {
  currentDare = dare;
  els.dareText.textContent = dare.text;
  els.dareTime.textContent = dare.time === "short" ? "~10 min" : dare.time === "medium" ? "~20 min" : "~40 min";
  els.dareEnergy.textContent = `${dare.energy} energy`;
  els.pitch.classList.add("hidden");
  els.dareCard.classList.remove("hidden");
  els.proofBtn.classList.remove("hidden");
}

// --- dare generation ---
// ponytail: real model call attempted only if a hugging face token is set.
// any failure (no webgpu, bad token, offline model fetch) silently falls
// back to the curated bank below — this is the reliability floor, upgrade
// path is wiring a tested transformers.js pipeline once model quality is verified.

let daresBank = null;
async function loadDaresBank() {
  if (daresBank) return daresBank;
  const res = await fetch("dares.json");
  daresBank = await res.json();
  return daresBank;
}

function pickFromBank(bank, context) {
  const matches = bank.filter(d =>
    (!context.time || d.time === context.time) &&
    (!context.energy || d.energy === context.energy)
  );
  const pool = matches.length ? matches : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function generateDare(context) {
  const secrets = loadSecrets();
  if (secrets.hfToken) {
    try {
      return await generateDareWithModel(context, secrets.hfToken);
    } catch (err) {
      console.warn("model generation failed, falling back to dare bank", err);
    }
  }
  try {
    const bank = await loadDaresBank();
    return pickFromBank(bank, context);
  } catch (err) {
    // offline with nothing cached yet and no model — never leave the UI hanging
    console.warn("dare bank unavailable, using built-in fallback dare", err);
    return FALLBACK_DARE;
  }
}

async function generateDareWithModel(context, token) {
  // lazy-loaded so the 300mb+ model never touches a visitor who hasn't
  // opted in with a token in settings.
  const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js");
  const generator = await pipeline("text-generation", "onnx-community/gemma-3-270m-it-ONNX", {
    dtype: "q4",
    token,
  });
  const prompt = `Give one short outdoor dare for someone with ${context.energy || "medium"} energy and ${context.time || "medium"} time, ${context.place || "nearby"}. One sentence, no explanation.`;
  const out = await generator(prompt, { max_new_tokens: 40 });
  const text = (out?.[0]?.generated_text || "").split("\n").pop().trim();
  if (!text) throw new Error("empty generation");
  return { text, time: context.time || "medium", energy: context.energy || "medium" };
}

// --- voice input ---
function parseContext(transcript) {
  const t = transcript.toLowerCase();
  const context = {};
  if (/low|tired|exhaust/.test(t)) context.energy = "low";
  else if (/high|energetic|pumped/.test(t)) context.energy = "high";
  else if (/energy/.test(t)) context.energy = "medium";

  if (/5 min|10 min|short|quick/.test(t)) context.time = "short";
  else if (/30 min|40 min|long|hour/.test(t)) context.time = "long";
  else if (/20 min|medium/.test(t)) context.time = "medium";

  const placeMatch = t.match(/at the (\w+)|near the (\w+)|in the (\w+)/);
  if (placeMatch) context.place = placeMatch[0];
  return context;
}

function speak(text) {
  const secrets = loadSecrets();
  if (secrets.elevenKey) {
    speakWithElevenLabs(text, secrets.elevenKey).catch(() => speakWithBrowser(text));
  } else {
    speakWithBrowser(text);
  }
}

function speakWithBrowser(text) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utter);
}

async function speakWithElevenLabs(text, apiKey) {
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // default elevenlabs voice
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, model_id: "eleven_turbo_v2" }),
  });
  if (!res.ok) throw new Error("elevenlabs request failed");
  const blob = await res.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  audio.play();
}

// ponytail: hardcoded single fallback, not a second dare bank — this is the
// last-resort floor when both the model and the dares.json fetch fail (e.g.
// offline with nothing cached yet). upgrade path: none needed, it's a floor.
const FALLBACK_DARE = { text: "step outside for five minutes, no phone, and look around", time: "short", energy: "low" };

let recognition = null;
function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = "en-US";
  return rec;
}

els.micBtn.addEventListener("click", async () => {
  if (els.micBtn.disabled) return;
  if (!recognition) recognition = setupSpeechRecognition();

  if (!recognition) {
    // no speech recognition support — fall back to a generic dare with a typed hint
    els.micBtn.disabled = true;
    els.micHint.textContent = "voice not supported here, picking a generic dare...";
    try {
      const dare = await generateDare({});
      renderDare(dare);
      speak(dare.text);
    } finally {
      els.micBtn.disabled = false;
    }
    return;
  }

  els.micBtn.disabled = true;
  els.micBtn.classList.add("listening");
  els.player.classList.add("listening");
  els.micHint.textContent = "listening...";

  recognition.onresult = async (e) => {
    const transcript = e.results[0][0].transcript;
    els.micHint.textContent = `heard: "${transcript}" — finding a dare...`;
    const context = parseContext(transcript);
    try {
      const dare = await generateDare(context);
      renderDare(dare);
      els.micHint.textContent = "say it again anytime for a new dare";
      speak(dare.text);
    } catch (err) {
      console.warn("dare generation failed", err);
      els.micHint.textContent = "couldn't come up with a dare, try again";
    }
  };

  recognition.onerror = () => {
    els.micHint.textContent = "didn't catch that, try again";
  };

  recognition.onend = () => {
    els.micBtn.classList.remove("listening");
    els.player.classList.remove("listening");
    els.micBtn.disabled = false;
  };

  recognition.start();
});

// --- camera proof ---
let cameraStream = null;

els.proofBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    els.micHint.textContent = "camera isn't available on this device or browser";
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    els.cameraFeed.srcObject = cameraStream;
    showModal(els.cameraModal, els.proofBtn);
  } catch (err) {
    els.micHint.textContent = err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
      ? "camera permission denied — allow camera access to add proof"
      : "couldn't access camera: " + err.message;
  }
});

function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

els.cameraCancel.addEventListener("click", () => hideModal(els.cameraModal));

els.cameraSnap.addEventListener("click", () => {
  const canvas = els.cameraCanvas;
  const w = els.cameraFeed.videoWidth;
  const h = els.cameraFeed.videoHeight;
  if (!w || !h) {
    // video metadata hasn't loaded yet (very fast tap) — nothing to capture
    els.micHint.textContent = "camera isn't ready yet, give it a second and try again";
    return;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(els.cameraFeed, 0, 0);

  // ponytail: honest heuristic, not real vision — average brightness as a
  // loose "probably outside in daylight" signal. upgrade path: real
  // on-device classifier if this proves too easy to fake and it matters.
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4 * 97) {
    sum += data[i] + data[i + 1] + data[i + 2];
    count++;
  }
  const brightness = count ? sum / count / 3 : 0;

  els.proofThumb.src = canvas.toDataURL("image/jpeg", 0.8);
  els.proofThumb.classList.remove("hidden");

  recordProof(brightness > 60);
  hideModal(els.cameraModal);
});

function recordProof(looksOutside) {
  const today = new Date().toDateString();
  if (state.lastProofDate === today) {
    els.micHint.textContent = "already counted today, nice work";
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  state.streak = state.lastProofDate === yesterday ? state.streak + 1 : 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.daresDone += 1;
  state.outsideMinutes += currentDare?.time === "long" ? 40 : currentDare?.time === "short" ? 10 : 20;
  state.lastProofDate = today;

  saveState(state);
  renderStats(true);
  bumpStat(els.streakCount);
  bumpStat(els.statDares);
  bumpStat(els.statBest);
  celebrate();

  if (!looksOutside) {
    els.micHint.textContent = "proof saved (looked a bit dim, but counted it)";
  } else {
    els.micHint.textContent = "nice, streak counted";
  }
}

// --- modal focus management (keyboard reachable + closable) ---
const FOCUSABLE_SELECTOR = 'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])';
let modalTrigger = null;

function trapModalKeydown(e) {
  const modal = document.querySelector(".modal:not(.hidden)");
  if (!modal) return;
  if (e.key === "Escape") {
    e.preventDefault();
    hideModal(modal);
    return;
  }
  if (e.key !== "Tab") return;
  const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function showModal(modal, trigger) {
  modalTrigger = trigger || document.activeElement;
  modal.classList.remove("hidden");
  const focusable = modal.querySelector(FOCUSABLE_SELECTOR);
  if (focusable) focusable.focus();
  document.addEventListener("keydown", trapModalKeydown);
}

function hideModal(modal) {
  if (modal === els.cameraModal) stopCameraStream();
  modal.classList.add("hidden");
  document.removeEventListener("keydown", trapModalKeydown);
  if (modalTrigger) {
    modalTrigger.focus();
    modalTrigger = null;
  }
}

// --- theme ---
const THEME_KEY = "touchgrass_theme";

function effectiveTheme() {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit) return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeIcon() {
  const dark = effectiveTheme() === "dark";
  // icon shown is what tapping switches TO
  els.themeIconDark.classList.toggle("hidden", dark);
  els.themeIconLight.classList.toggle("hidden", !dark);
}

(function initTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) document.documentElement.setAttribute("data-theme", stored);
  } catch {}
  applyThemeIcon();
})();

els.themeBtn.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  applyThemeIcon();
});

// --- settings ---
els.settingsBtn.addEventListener("click", () => {
  const secrets = loadSecrets();
  els.hfToken.value = secrets.hfToken || "";
  els.elevenKey.value = secrets.elevenKey || "";
  showModal(els.settingsModal, els.settingsBtn);
});

els.settingsSave.addEventListener("click", () => {
  saveSecrets({ hfToken: els.hfToken.value.trim(), elevenKey: els.elevenKey.value.trim() });
  hideModal(els.settingsModal);
});

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideModal(modal);
  });
});

renderStats();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
