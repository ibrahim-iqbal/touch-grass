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

  const [dare, setDare] = useState(null);
  const dareRef = useRef(null);
  const [proofThumb, setProofThumb] = useState(null);
  const [justUnlocked, setJustUnlocked] = useState([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const onDare = useCallback((d) => {
    dareRef.current = d;
    setDare(d);
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
      // ponytail: the player cheer + sparkle burst lived on the DOM sprite;
      // that moves to the Pixi scene (phase 2), where celebrate() will fire.
    },
    [recordProof, setMicHint]
  );

  const camera = useCamera({ onHint: setMicHint, onProof });

  const showPitch = !dare && state.daresDone === 0;

  return (
    <div className="page">
      <Scene tier={worldTier(state.daresDone)} />

      <Hud
        state={state}
        theme={theme}
        onHelp={() => setHelpOpen(true)}
        onTheme={toggle}
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
