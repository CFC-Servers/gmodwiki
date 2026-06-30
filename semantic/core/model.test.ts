import { describe, it, expect } from "vitest";
import { MODEL_ID, EMBEDDING_DIMS, RRF_K } from "./model.js";

describe("model constants", () => {
  it("pins the bge-base model and its dimensions", () => {
    expect(MODEL_ID).toBe("@cf/baai/bge-base-en-v1.5");
    expect(EMBEDDING_DIMS).toBe(768);
    expect(RRF_K).toBe(60);
  });
});
