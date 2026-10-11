import { useEffect, useRef } from "react";
import { PixiWorld as World } from "../pixi/world.js";

export default function PixiWorld({ theme, tier, character, onCharacterPick, worldRef }) {
  const mountRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    const w = new World();
    instRef.current = w;
    if (worldRef) worldRef.current = w;
    let alive = true;
    w.init(mountRef.current, { theme, tier, character }).then(() => {
      if (!alive) w.destroy();
    }).catch((e) => console.error("pixi world init failed", e));
    return () => {
      alive = false;
      instRef.current?.destroy();
      instRef.current = null;
      if (worldRef) worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { instRef.current?.setTheme?.(theme); }, [theme]);
  useEffect(() => { instRef.current?.setTier?.(tier); }, [tier]);
  useEffect(() => { instRef.current?.setCharacter?.(character); }, [character]);
  useEffect(() => { instRef.current?.setOnCharacterPick?.(onCharacterPick || null); }, [onCharacterPick]);

  return <div className="pixi-layer" ref={mountRef} />;
}
