import { useEffect, useRef } from "react";
import { PixiWorld as World } from "../pixi/world.js";

// mounts the Pixi living world into its layer and keeps it in sync with theme
// (day/night) and tier (firefly density). worldRef lets App drive one-off
// reactions (character walks off when a dare is set, etc).
export default function PixiWorld({ theme, tier, worldRef }) {
  const mountRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    const w = new World();
    instRef.current = w;
    if (worldRef) worldRef.current = w;
    let alive = true;
    w.init(mountRef.current, { theme, tier }).then(() => {
      if (!alive) w.destroy();
    }).catch((e) => console.error("pixi world init failed", e));
    return () => {
      alive = false;
      instRef.current?.destroy();
      instRef.current = null;
      if (worldRef) worldRef.current = null;
    };
    // mount once; theme/tier pushed via the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { instRef.current?.setTheme?.(theme); }, [theme]);
  useEffect(() => { instRef.current?.setTier?.(tier); }, [tier]);

  return <div className="pixi-layer" ref={mountRef} />;
}
