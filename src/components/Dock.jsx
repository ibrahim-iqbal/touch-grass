import { dareTimeLabel } from "../lib/dares.js";

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function Dock({
  dare,
  proofThumb,
  micHint,
  listening,
  micDisabled,
  onMicClick,
  onProofClick,
  proofDisabled,
  showPitch,
}) {
  return (
    <div className="hud-dock">
      {dare && (
        <section className="quest-ribbon">
          <p className="quest-label">◆ quest ◆</p>
          <p className="dare-text" aria-live="polite" aria-atomic="true">{dare.text}</p>
          <div className="dare-tags">
            <span className="tag">{dareTimeLabel(dare.time)}</span>
            <span className="tag">{dare.energy} energy</span>
          </div>
        </section>
      )}

      {proofThumb && <img className="proof-thumb" src={proofThumb} alt="your outdoor proof photo" />}
      {dare && <p className="proof-hint">snap a photo outside to count it toward your streak</p>}
      {dare && (
        <button className="proof-btn" title="snap a photo outside to count this dare" onClick={onProofClick} disabled={proofDisabled}>
          <CameraIcon /> prove it outside
        </button>
      )}

      <section className="mic-section">
        {showPitch && <p className="pitch">tap, say what you've got, get a reason to go outside</p>}
        <button
          className={"mic-btn" + (listening ? " listening" : "")}
          aria-label="speak to get a dare"
          title="tap to speak"
          onClick={onMicClick}
          disabled={micDisabled}
        >
          <MicIcon />
        </button>
        <p className="mic-hint" aria-live="polite" aria-atomic="true">{micHint}</p>
      </section>
    </div>
  );
}
