// level / rank / badge math — pure, ported verbatim from the vanilla app.

export const RANKS = ["newcomer", "wanderer", "trailblazer", "pathfinder", "ranger", "grass master"];
export const XP_PER_LEVEL = 3;

export function computeLevel(daresDone) {
  const level = Math.floor(daresDone / XP_PER_LEVEL) + 1;
  const xpInLevel = daresDone % XP_PER_LEVEL;
  const title = RANKS[Math.min(level - 1, RANKS.length - 1)];
  return { level, xpInLevel, xpToNext: XP_PER_LEVEL, title };
}

// ponytail: simple dare-count thresholds, not a real progression system —
// upgrade path is tuning these numbers once real usage data exists.
export function worldTier(daresDone) {
  if (daresDone >= 14) return 3;
  if (daresDone >= 7) return 2;
  if (daresDone >= 3) return 1;
  return 0;
}

export const FLAME_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 .5 2-1 3-2 2 1-2-1-3-1-5z"/></svg>';

export const BADGES = [
  {
    id: "first_dare",
    label: "first dare done",
    test: (s) => s.daresDone >= 1,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c0-6 4-10 8-11-1 6-4 10-8 11z"/><path d="M12 22c0-6-4-10-8-11 1 6 4 10 8 11z"/></svg>',
  },
  {
    id: "streak_3",
    label: "3 day streak",
    test: (s) => s.bestStreak >= 3,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 .5 2-1 3-2 2 1-2-1-3-1-5z"/></svg>',
  },
  {
    id: "streak_7",
    label: "7 day streak",
    test: (s) => s.bestStreak >= 7,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2"/></svg>',
  },
  {
    id: "hour_outside",
    label: "1 hour outside total",
    test: (s) => s.outsideMinutes >= 60,
    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
  },
];
