import { forwardRef } from "react";

// The scene backdrop. The painted day/night art, sky, stars and sliding
// sun/moon stay as cheap CSS ambiance (they key off <html data-theme>). The
// living, interactive layer (character, parallax, fog, fireflies, particles)
// mounts into `.pixi-layer` in phase 2. `tier` still drives any CSS growth.
const Scene = forwardRef(function Scene({ tier }, pixiMountRef) {
  return (
    <div className="scene" data-tier={tier} aria-hidden="true">
      <div className="sky" />
      <div className="backdrop-img backdrop-day" />
      <div className="backdrop-img backdrop-night" />
      <div className="stars" />
      <div className="sun-moon" />
      <div className="pixi-layer" ref={pixiMountRef} />
    </div>
  );
});

export default Scene;
