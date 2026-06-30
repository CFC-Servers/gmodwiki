import { describe, it, expect } from "vitest";
import { semanticSearch } from "./search.js";
import { EMBEDDING_DIMS } from "./model.js";

const embedder = { async embed() { const v = new Float32Array(EMBEDDING_DIMS); v[0] = 1; return v; } };
const store = { async query() { return [{ id: "Player:Say", score: 0.91 }, { id: "Entity:Fire", score: 0.5 }]; } };
const meta = (id: string) => ({ title: id, url: "/" + id, snippet: id + " snippet" });

describe("semanticSearch", () => {
  it("maps store matches to SearchResults with source=semantic", async () => {
    const results = await semanticSearch("how to make a player talk", 2, { embedder, store, meta });
    expect(results[0]).toMatchObject({ address: "Player:Say", source: "semantic", url: "/Player:Say" });
    expect(results[0].score).toBeCloseTo(0.91, 5);
    expect(results).toHaveLength(2);
  });
});
