import { describe, it, expect } from "vitest";
import { encodeEmbeddings, decodeEmbeddings } from "./binary.js";

describe("embeddings codec", () => {
  it("round-trips vectors", () => {
    const vectors = [new Float32Array([0.1, 0.2, 0.3]), new Float32Array([0.4, 0.5, 0.6])];
    const decoded = decodeEmbeddings(encodeEmbeddings(vectors, 3));
    expect(decoded.dims).toBe(3);
    expect(decoded.count).toBe(2);
    expect(Array.from(decoded.vectors[1])).toEqual(expect.arrayContaining([
      expect.closeTo(0.4, 5), expect.closeTo(0.5, 5), expect.closeTo(0.6, 5),
    ]));
  });
  it("rejects a buffer with the wrong magic", () => {
    expect(() => decodeEmbeddings(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow();
  });
});
