// dare generation: optional on-device Gemma via transformers.js, with the
// curated bank as the reliability floor. ported verbatim from the vanilla app.
import { loadDaresBank, pickFromBank, FALLBACK_DARE } from "./dares.js";

async function generateDareWithModel(context, token) {
  // lazy-loaded from the CDN so the 300mb+ model never touches a visitor who
  // hasn't opted in with a token. kept as a CDN import on purpose — bundling
  // the WASM runtime through Vite is the brittle path; this works unchanged.
  const { pipeline, env } = await import(
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js"
  );
  // confirmed by hand: the default threaded WASM backend needs SharedArrayBuffer,
  // which needs the page cross-origin isolated (COOP/COEP) — not guaranteed on
  // every static host, and when missing onnxruntime-web throws a bare numeric
  // code with no message. Forcing single-threaded WASM sidesteps that entirely.
  env.backends.onnx.wasm.numThreads = 1;
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

export async function generateDare(context, { hfToken, currentDare } = {}) {
  if (hfToken) {
    try {
      return await generateDareWithModel(context, hfToken);
    } catch (err) {
      console.warn("model generation failed, falling back to dare bank", err);
    }
  }
  try {
    const bank = await loadDaresBank();
    return pickFromBank(bank, context, currentDare);
  } catch (err) {
    // offline with nothing cached yet and no model — never leave the UI hanging
    console.warn("dare bank unavailable, using built-in fallback dare", err);
    return FALLBACK_DARE;
  }
}
