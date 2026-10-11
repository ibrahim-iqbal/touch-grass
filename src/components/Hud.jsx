import { computeLevel, BADGES, FLAME_ICON } from "../lib/hud.js";

const MAX_PIPS = 7;

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function Hud({ state, theme, onHelp, onTheme, onSettings, justUnlocked }) {
  const { level, xpInLevel, xpToNext, title } = computeLevel(state.daresDone);
  const xpPct = Math.round((xpInLevel / xpToNext) * 100);
  const lit = Math.min(state.streak, MAX_PIPS);
  const streakText = state.streak > MAX_PIPS ? `+${state.streak - MAX_PIPS}` : String(state.streak);
  const showProgress = state.daresDone > 0;
  const dark = theme === "dark";

  return (
    <>
      <header className="hud hud-top-left">
        <div className="level-badge"><span className="level-num">{level}</span></div>
        <div className="level-info">
          <p className="rank-title">{title}</p>
          <div className="xp-bar" role="progressbar" aria-label="experience to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPct}>
            <div className="xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </header>

      <div className="hud hud-top-right">
        <div className="top-bar-actions">
          <button className="icon-btn" aria-label="help and faq" title="help / how this works" onClick={onHelp}><HelpIcon /></button>
          <button className="icon-btn" aria-label="toggle light and dark mode" title="toggle light / dark" onClick={onTheme}>
            {dark ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="4" y1="12" x2="2" y2="12" /><line x1="22" y1="12" x2="20" y2="12" /><line x1="18.4" y1="5.6" x2="19.8" y2="4.2" /><line x1="4.2" y1="19.8" x2="5.6" y2="18.4" /><line x1="18.4" y1="18.4" x2="19.8" y2="19.8" /><line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            )}
          </button>
          <button className="icon-btn" aria-label="settings" title="settings: optional ai voice/model keys" onClick={onSettings}><SettingsIcon /></button>
        </div>
        {showProgress && (
          <div className="streak-row">
            <span className="streak-label">streak</span>
            <div className="streak-pips">
              {Array.from({ length: MAX_PIPS }, (_, i) => (
                <span key={i} className={"pip" + (i < lit ? " lit" : "")} dangerouslySetInnerHTML={i < lit ? { __html: FLAME_ICON } : undefined} />
              ))}
            </div>
            <span className="streak-count">{streakText}</span>
          </div>
        )}
      </div>

      {showProgress && (
        <div className="hud hud-badges badges">
          {BADGES.map((b) => {
            const unlocked = b.test(state);
            const isNew = justUnlocked?.includes(b.id);
            return (
              <div
                key={b.id}
                className={"badge" + (unlocked ? " unlocked" : "") + (isNew ? " just-unlocked" : "")}
                title={b.label}
                aria-label={(unlocked ? "unlocked: " : "locked: ") + b.label}
                dangerouslySetInnerHTML={{ __html: b.icon }}
              />
            );
          })}
        </div>
      )}

      <section className="hud hud-stats">
        <div className="stat"><p className="stat-num">{state.daresDone}</p><p className="stat-label">dares</p></div>
        <div className="stat"><p className="stat-num">{state.outsideMinutes}m</p><p className="stat-label">outside</p></div>
        <div className="stat"><p className="stat-num">{state.bestStreak}</p><p className="stat-label">best</p></div>
      </section>
    </>
  );
}
