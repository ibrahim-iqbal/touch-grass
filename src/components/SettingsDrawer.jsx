import { useState, useEffect } from "react";
import Modal from "./Modal.jsx";
import { loadSecrets, saveSecrets } from "../lib/storage.js";

export default function SettingsDrawer({ open, onClose }) {
  const [hfToken, setHfToken] = useState("");
  const [elevenKey, setElevenKey] = useState("");

  // refill from stored secrets each time the drawer opens
  useEffect(() => {
    if (!open) return;
    const s = loadSecrets();
    setHfToken(s.hfToken || "");
    setElevenKey(s.elevenKey || "");
  }, [open]);

  function save() {
    saveSecrets({ hfToken: hfToken.trim(), elevenKey: elevenKey.trim() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} drawer labelledBy="settings-heading">
      <h2 id="settings-heading">settings</h2>
      <label className="field-label" htmlFor="hf-token">hugging face token (optional)</label>
      <input id="hf-token" className="field" type="password" autoComplete="off" placeholder="paste token to enable smart dare generation" value={hfToken} onChange={(e) => setHfToken(e.target.value)} />
      <p className="field-hint">without a token, dares come from a curated offline list instead of the live model. nothing you type here leaves your browser.</p>
      <label className="field-label" htmlFor="elevenlabs-key">elevenlabs api key (optional)</label>
      <input id="elevenlabs-key" className="field" type="password" autoComplete="off" placeholder="paste key for nicer voice" value={elevenKey} onChange={(e) => setElevenKey(e.target.value)} />
      <p className="field-hint">without a key, voice falls back to your browser's built-in speech engine.</p>
      <button className="btn btn-primary" onClick={save}>save</button>
    </Modal>
  );
}
