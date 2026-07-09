import type { Match } from "./types.js";

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  if (na === 0 || nb === 0) return 0;

  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Exact linear scan. Fast enough at wiki scale (a few thousand vectors),
// so no ANN index is needed.
export function bruteForceTopK(
  query: Float32Array,
  vectors: Float32Array[],
  ids: string[],
  k: number,
): Match[] {
  const scored: Match[] = vectors.map((v, i) => ({
    id: ids[i],
    score: cosineSimilarity(query, v),
  }));

  scored.sort((x, y) => y.score - x.score);

  return scored.slice(0, k);
}
