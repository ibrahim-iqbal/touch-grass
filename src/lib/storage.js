// localStorage persistence — same keys as the vanilla app so an existing
// user's state/streak/secrets carry over. every access wrapped in try/catch
// (private mode, blocked storage, etc. must never crash the app).

const STORE_KEY = "touchgrass_state_v1";
const SECRETS_KEY = "touchgrass_secrets_v1";
export const THEME_KEY = "touchgrass_theme";

export const DEFAULT_STATE = {
  daresDone: 0,
  outsideMinutes: 0,
  streak: 0,
  bestStreak: 0,
  lastProofDate: null,
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) throw new Error("no state yet");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadSecrets() {
  try {
    return JSON.parse(localStorage.getItem(SECRETS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveSecrets(secrets) {
  try {
    localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
  } catch {}
}
