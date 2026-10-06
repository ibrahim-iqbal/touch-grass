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
  micBtn: document.getElementById("mic-btn"),
  micHint: document.getElementById("mic-hint"),
  proofBtn: document.getElementById("proof-btn"),
  proofThumb: document.getElementById("proof-thumb"),
  statDares: document.getElementById("stat-dares"),
  statTime: document.getElementById("stat-time"),
  statBest: document.getElementById("stat-best"),
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
};

function renderStats() {
  els.streakCount.textContent = `${state.streak} day streak`;
  els.statDares.textContent = state.daresDone;
  els.statTime.textContent = `${state.outsideMinutes}m`;
  els.statBest.textContent = state.bestStreak;
}

function renderDare(dare) {
  currentDare = dare;
  els.dareText.textContent = dare.text;
  els.dareTime.textContent = dare.time === "short" ? "~10 min" : dare.time === "medium" ? "~20 min" : "~40 min";
  els.dareEnergy.textContent = `${dare.energy} energy`;
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
  const bank = await loadDaresBank();
  return pickFromBank(bank, context);
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
    const dare = await generateDare({});
    renderDare(dare);
    speak(dare.text);
    els.micBtn.disabled = false;
    return;
  }

  els.micBtn.disabled = true;
  els.micBtn.classList.add("listening");
  els.micHint.textContent = "listening...";

  recognition.onresult = async (e) => {
    const transcript = e.results[0][0].transcript;
    els.micHint.textContent = `heard: "${transcript}" — finding a dare...`;
    const context = parseContext(transcript);
    const dare = await generateDare(context);
    renderDare(dare);
    els.micHint.textContent = "say it again anytime for a new dare";
    speak(dare.text);
  };

  recognition.onerror = () => {
    els.micHint.textContent = "didn't catch that, try again";
  };

  recognition.onend = () => {
    els.micBtn.classList.remove("listening");
    els.micBtn.disabled = false;
  };

  recognition.start();
});

// --- camera proof ---
let cameraStream = null;

els.proofBtn.addEventListener("click", async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    els.cameraFeed.srcObject = cameraStream;
    els.cameraModal.classList.remove("hidden");
  } catch (err) {
    alert("couldn't access camera: " + err.message);
  }
});

function closeCameraModal() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  els.cameraModal.classList.add("hidden");
}

els.cameraCancel.addEventListener("click", closeCameraModal);

els.cameraSnap.addEventListener("click", () => {
  const canvas = els.cameraCanvas;
  canvas.width = els.cameraFeed.videoWidth;
  canvas.height = els.cameraFeed.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(els.cameraFeed, 0, 0);

  // ponytail: honest heuristic, not real vision — average brightness as a
  // loose "probably outside in daylight" signal. upgrade path: real
  // on-device classifier if this proves too easy to fake and it matters.
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4 * 97) sum += data[i] + data[i + 1] + data[i + 2];
  const brightness = sum / (data.length / (4 * 97)) / 3;

  els.proofThumb.src = canvas.toDataURL("image/jpeg", 0.8);
  els.proofThumb.classList.remove("hidden");

  recordProof(brightness > 60);
  closeCameraModal();
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
  renderStats();

  if (!looksOutside) {
    els.micHint.textContent = "proof saved (looked a bit dim, but counted it)";
  } else {
    els.micHint.textContent = "nice, streak counted";
  }
}

// --- settings ---
els.settingsBtn.addEventListener("click", () => {
  const secrets = loadSecrets();
  els.hfToken.value = secrets.hfToken || "";
  els.elevenKey.value = secrets.elevenKey || "";
  els.settingsModal.classList.remove("hidden");
});

els.settingsSave.addEventListener("click", () => {
  saveSecrets({ hfToken: els.hfToken.value.trim(), elevenKey: els.elevenKey.value.trim() });
  els.settingsModal.classList.add("hidden");
});

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
});

renderStats();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
