// speak a dare aloud: ElevenLabs if a key is set, else the browser's own voice.
// ported verbatim from the vanilla app.

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

export function speak(text, { elevenKey } = {}) {
  if (elevenKey) {
    speakWithElevenLabs(text, elevenKey).catch(() => speakWithBrowser(text));
  } else {
    speakWithBrowser(text);
  }
}
