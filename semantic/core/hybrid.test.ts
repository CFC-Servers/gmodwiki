import { describe, it, expect } from "vitest";
import { hybridSearch } from "./search.js";
import type { SearchResult } from "./types.js";

const semanticResults: SearchResult[] = [
  { address: "Player:Say", title: "Player:Say", url: "/Player:Say", snippet: "say", score: 0.9, source: "semantic" },
  { address: "Concept:Chat", title: "Concept:Chat", url: "/Concept:Chat", snippet: "chat", score: 0.7, source: "semantic" },
];
const keywordResults = [{ id: "Player:Say", snippet: "player to say" }, { id: "Entity:Fire", snippet: "fire" }];
const meta = (id: string) => ({ title: id, url: "/" + id, snippet: id });

describe("hybridSearch", () => {
  it("fuses both retrievers and marks shared hits as 'both'", async () => {
    const out = await hybridSearch("player say", 10, {
      semantic: async () => semanticResults,
      keyword: () => keywordResults,
      meta,
    });
    const top = out.find((r) => r.address === "Player:Say")!;
    expect(top.source).toBe("both");
    expect(out[0].address).toBe("Player:Say"); // found by both -> highest fused score
    expect(out.map((r) => r.address)).toEqual(expect.arrayContaining(["Concept:Chat", "Entity:Fire"]));
  });
});
