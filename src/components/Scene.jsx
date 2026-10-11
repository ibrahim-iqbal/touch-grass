import PixiWorld from "./PixiWorld.jsx";

// The scene stage. The Pixi world (painted backdrop + walking character +
// fireflies + camera) is the real, interactive layer. The CSS sky/backdrop
// underneath stays as a graceful fallback if Pixi fails to init.
export default function Scene({ theme, tier, worldRef }) {
  return (
    <div className="scene" data-tier={tier} aria-hidden="true">
      <div className="sky" />
      <div className="backdrop-img backdrop-day" />
      <div className="backdrop-img backdrop-night" />
      <PixiWorld theme={theme} tier={tier} worldRef={worldRef} />
    </div>
  );
}
