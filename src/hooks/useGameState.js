import { useState, useCallback, useRef } from "react";
import { loadState, saveState } from "../lib/storage.js";
import { BADGES } from "../lib/hud.js";
import { dareMinutes } from "../lib/dares.js";

// owns the persisted game state and the one mutation that matters —
// recording a proof photo — ported from the vanilla recordProof().
export function useGameState() {
  const [state, setState] = useState(loadState);
  const unlockedRef = useRef(new Set(BADGES.filter((b) => b.test(state)).map((b) => b.id)));

  const recordProof = useCallback((currentDare, looksOutside) => {
    const today = new Date().toDateString();
    if (state.lastProofDate === today) {
      return { outcome: "already" };
    }

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const next = {
      ...state,
      streak: state.lastProofDate === yesterday ? state.streak + 1 : 1,
      daresDone: state.daresDone + 1,
      outsideMinutes: state.outsideMinutes + dareMinutes(currentDare?.time),
      lastProofDate: today,
    };
    next.bestStreak = Math.max(state.bestStreak, next.streak);

    const nowUnlocked = new Set(BADGES.filter((b) => b.test(next)).map((b) => b.id));
    const justUnlocked = [...nowUnlocked].filter((id) => !unlockedRef.current.has(id));
    unlockedRef.current = nowUnlocked;

    saveState(next);
    setState(next);
    return { outcome: looksOutside ? "counted" : "dim", justUnlocked };
  }, [state]);

  return { state, recordProof };
}
