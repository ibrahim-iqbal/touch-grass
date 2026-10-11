// dare bank loading, matching, and transcript parsing — pure, ported from vanilla.

// ponytail: hardcoded single fallback, not a second dare bank — this is the
// last-resort floor when both the model and the dares.json fetch fail (e.g.
// offline with nothing cached yet). upgrade path: none needed, it's a floor.
export const FALLBACK_DARE = {
  text: "step outside for five minutes, no phone, and look around",
  time: "short",
  energy: "low",
};

let daresBank = null;
export async function loadDaresBank() {
  if (daresBank) return daresBank;
  const res = await fetch("dares.json");
  daresBank = await res.json();
  return daresBank;
}

export function pickFromBank(bank, context, currentDare) {
  const matches = bank.filter(
    (d) =>
      (!context.time || d.time === context.time) &&
      (!context.energy || d.energy === context.energy)
  );
  let pool = matches.length ? matches : bank;
  // avoid repeating the dare that's already on screen when another option exists
  if (pool.length > 1 && currentDare) {
    const withoutCurrent = pool.filter((d) => d.text !== currentDare.text);
    if (withoutCurrent.length) pool = withoutCurrent;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function parseContext(transcript) {
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

export function dareTimeLabel(time) {
  return time === "short" ? "~10 min" : time === "medium" ? "~20 min" : "~40 min";
}

export function dareMinutes(time) {
  return time === "long" ? 40 : time === "short" ? 10 : 20;
}
