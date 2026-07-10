import { describe, it, expect } from "vitest";
import { cosineSimilarity, bruteForceTopK } from "./cosine.js";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    const v = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(v, new Float32Array([1, 2, 3]))).toBeCloseTo(1, 5);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0, 5);
  });
});

describe("bruteForceTopK", () => {
  it("returns the closest ids in descending score order", () => {
    const vectors = [
      new Float32Array([1, 0]),
      new Float32Array([0.9, 0.1]),
      new Float32Array([0, 1]),
    ];
    const ids = ["a", "b", "c"];

    const out = bruteForceTopK(new Float32Array([1, 0]), vectors, ids, 2);

    expect(out.map((m) => m.id)).toEqual(["a", "b"]);
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });
});
