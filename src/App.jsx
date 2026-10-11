import { useState, useRef, useCallback } from "react";
import Scene from "./components/Scene.jsx";
import Hud from "./components/Hud.jsx";
import Dock from "./components/Dock.jsx";
import HelpDrawer from "./components/HelpDrawer.jsx";
import SettingsDrawer from "./components/SettingsDrawer.jsx";
import CameraModal from "./components/CameraModal.jsx";
import { useGameState } from "./hooks/useGameState.js";
import { useTheme } from "./hooks/useTheme.js";
import { useSpeech } from "./hooks/useSpeech.js";
import { useCamera } from "./hooks/useCamera.js";
import { worldTier } from "./lib/hud.js";

export default function App() {
  const { state, recordProof } = useGameState();
  const { theme, toggle } = useTheme();

  const [character, setCharacter] = useState(() => {
    try { return localStorage.getItem("tg-character") || "mask-dude"; } catch { return "mask-dude"; }
  });

  // button toggles show-all mode; tapping a char in the scene picks it
  const toggleShowAll = useCallback(() => {
    worldRef.current?.showAllCharacters?.();
  }, []);

  // called from Pixi when a character sprite is tapped
  const onCharacterPick = useCallback((key) => {
    setCharacter(key);
    try { localStorage.setItem("tg-character", key); } catch {}
  }, []);

  const [dare, setDare] = useState(null);
  const dareRef = useRef(null);
  const worldRef = useRef(null);
  const [proofThumb, setProofThumb] = useState(null);
  const [justUnlocked, setJustUnlocked] = useState([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const onDare = useCallback((d) => {
    dareRef.current = d;
    setDare(d);
    worldRef.current?.walkOff?.();
  }, []);
  const getCurrentDare = useCallback(() => dareRef.current, []);

  const { micHint, setMicHint, listening, micDisabled, handleMicClick } = useSpeech({ onDare, getCurrentDare });

  const onProof = useCallback(
    (currentDare, looksOutside, thumb) => {
      setProofThumb(thumb);
      const res = recordProof(currentDare, looksOutside);
      if (res.outcome === "already") {
        setMicHint("already counted today, nice work");
        return;
      }
      setMicHint(res.outcome === "dim" ? "proof saved (looked a bit dim, but counted it)" : "nice, streak counted");
      if (res.justUnlocked?.length) {
        setJustUnlocked(res.justUnlocked);
        setTimeout(() => setJustUnlocked([]), 600);
      }
    },
    [recordProof, setMicHint]
  );

  const camera = useCamera({ onHint: setMicHint, onProof });
  const showPitch = !dare && state.daresDone === 0;

  return (
    <div className="page">
      <Scene theme={theme} tier={worldTier(state.daresDone)} character={character} onCharacterPick={onCharacterPick} worldRef={worldRef} />

      <Hud
        state={state}
        theme={theme}
        character={character}
        onHelp={() => setHelpOpen(true)}
        onTheme={toggle}
        onCharacter={toggleShowAll}
        onSettings={() => setSettingsOpen(true)}
        justUnlocked={justUnlocked}
      />

      <Dock
        dare={dare}
        proofThumb={proofThumb}
        micHint={micHint}
        listening={listening}
        micDisabled={micDisabled}
        onMicClick={handleMicClick}
        onProofClick={camera.openCamera}
        proofDisabled={camera.proofDisabled}
        showPitch={showPitch}
      />

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CameraModal
        open={camera.cameraOpen}
        onClose={camera.closeCamera}
        onSnap={() => camera.snapProof(dareRef.current)}
        videoRef={camera.videoRef}
        canvasRef={camera.canvasRef}
      />
    </div>
  );
}
