import PixiWorld from "./PixiWorld.jsx";

export default function Scene({ theme, tier, character, onCharacterPick, worldRef }) {
  return (
    <div className="scene" data-tier={tier} aria-hidden="true">
      <div className="sky" />
      <div className="backdrop-img backdrop-day" />
      <div className="backdrop-img backdrop-night" />
      <PixiWorld theme={theme} tier={tier} character={character} onCharacterPick={onCharacterPick} worldRef={worldRef} />
    </div>
  );
}
