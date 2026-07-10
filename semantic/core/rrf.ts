import { RRF_K } from "./model.js";

export function reciprocalRankFusion(
  lists: string[][],
  k: number = RRF_K,
): { id: string; score: number; sources: number[] }[] {
  const scores = new Map<string, { score: number; sources: number[] }>();
  lists.forEach((list, listIndex) => {
    list.forEach((id, rank) => {
      const contribution = 1 / (k + rank + 1);
      const existing = scores.get(id);
      if (existing) {
        existing.score += contribution;
        existing.sources.push(listIndex);
      } else {
        scores.set(id, { score: contribution, sources: [listIndex] });
      }
    });
  });
  return [...scores.entries()]
    .map(([id, v]) => ({ id, score: v.score, sources: v.sources }))
    .sort((a, b) => b.score - a.score);
}
