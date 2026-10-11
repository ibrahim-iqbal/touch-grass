import { useState, useRef, useCallback } from "react";
import { generateDare } from "../lib/generate.js";
import { parseContext } from "../lib/dares.js";
import { speak } from "../lib/speak.js";
import { loadSecrets } from "../lib/storage.js";

const LISTEN_TIMEOUT_MS = 10000;
const LISTENING_HINT = "listening... (tap to cancel)";

function newRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = "en-US";
  return rec;
}

// the whole mic flow — ported from the vanilla mic handler, including the two
// defensive timeouts that stop the UI trapping the user: a hard listen timeout,
// and letting a second tap cancel an in-progress listen.
export function useSpeech({ onDare, getCurrentDare }) {
  const [micHint, setMicHint] = useState('try: "20 minutes, high energy, near the park"');
  const [listening, setListening] = useState(false);
  const [micDisabled, setMicDisabled] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const hintRef = useRef(micHint);
  hintRef.current = micHint;

  const stopListeningUI = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setListening(false);
    setMicDisabled(false);
    // the browser's own silence auto-stop sometimes wins the race against our
    // timeout, firing onend with no result and no error — if nothing already
    // explained what happened, say so rather than leaving stale "listening...".
    if (hintRef.current === LISTENING_HINT) {
      setMicHint("didn't hear anything, try again");
    }
  }, []);

  const produceDare = useCallback(
    async (context) => {
      const secrets = loadSecrets();
      const dare = await generateDare(context, {
        hfToken: secrets.hfToken,
        currentDare: getCurrentDare(),
      });
      onDare(dare);
      speak(dare.text, { elevenKey: secrets.elevenKey });
      return dare;
    },
    [onDare, getCurrentDare]
  );

  const handleMicClick = useCallback(async () => {
    if (listening) {
      setMicHint("cancelled, tap to try again");
      recognitionRef.current?.stop();
      return;
    }
    if (micDisabled) return;

    if (!recognitionRef.current) recognitionRef.current = newRecognition();
    const rec = recognitionRef.current;

    if (!rec) {
      // no speech recognition support — fall back to a generic dare
      setMicDisabled(true);
      setMicHint("voice not supported here, picking a generic dare...");
      try {
        await produceDare({});
      } finally {
        setMicDisabled(false);
      }
      return;
    }

    setListening(true);
    setMicHint(LISTENING_HINT);

    timeoutRef.current = setTimeout(() => {
      setMicHint("didn't hear anything, try again");
      rec.stop();
    }, LISTEN_TIMEOUT_MS);

    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      setMicHint(`heard: "${transcript}" — finding a dare...`);
      try {
        await produceDare(parseContext(transcript));
        setMicHint("say it again anytime for a new dare");
      } catch (err) {
        console.warn("dare generation failed", err);
        setMicHint("couldn't come up with a dare, try again");
      }
    };
    rec.onerror = () => setMicHint("didn't catch that, try again");
    rec.onend = stopListeningUI;

    rec.start();
  }, [listening, micDisabled, produceDare, stopListeningUI]);

  return { micHint, setMicHint, listening, micDisabled, handleMicClick };
}
