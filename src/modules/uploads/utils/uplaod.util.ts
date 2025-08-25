export const LEVEL_THRESHOLDS: Record<number, { min: number; max: number }> = {
  10: { min: 99.99, max: Infinity },
  9: { min: 99.97, max: 99.99 },
  8: { min: 99.37, max: 99.97 },
  7: { min: 93.31, max: 99.37 },
  6: { min: 69.14, max: 93.31 },
  5: { min: 30.85, max: 69.14 },
  4: { min: 6.68, max: 30.85 },
  3: { min: 0.62, max: 6.68 },
  2: { min: 0.02, max: 0.62 },
  1: { min: -Infinity, max: 0.02 },
};

export function computeLevel(
  bestVotesCount: number,
  interactedVotesCount: number,
): number | null {
  if (!interactedVotesCount || interactedVotesCount <= 0) return null; // undefined level if no interactions yet
  const ratio = (bestVotesCount / interactedVotesCount) * 100; // percentage
  for (const lvl of [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) {
    const { min, max } = LEVEL_THRESHOLDS[lvl];
    if (ratio >= min && ratio < max) return lvl;
  }
  return null;
}
