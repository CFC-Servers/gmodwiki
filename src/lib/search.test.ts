import { platform } from "@platform";
import { afterEach, describe, expect, it, vi } from "vitest";
import { search } from "./search";

const keywordIndex = { ease: [["math.ease", "easing functions"]] };

describe("search", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to keyword results when semantic search cannot load", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(platform, "loadKeywordIndex").mockResolvedValue(keywordIndex);
    vi.spyOn(platform, "loadSemanticSearch").mockRejectedValue(new Error("no embeddings"));

    expect(await search("ease")).toEqual([
      { address: "math.ease", title: "math.ease", url: "/math.ease", snippet: "easing functions", score: 0, source: "keyword" },
    ]);
  });

  it("merges semantic matches with keyword matches", async () => {
    vi.spyOn(platform, "loadKeywordIndex").mockResolvedValue(keywordIndex);
    vi.spyOn(platform, "loadSemanticSearch").mockResolvedValue({
      embedder: { embed: async () => new Float32Array([1]) },
      store: { query: async () => [{ id: "math.ease", score: 0.9 }, { id: "Lerp", score: 0.5 }] },
      meta: (id) => ({ title: id, url: `/${id}`, snippet: "" }),
    });

    const results = await search("ease");

    expect(results.map((result) => [result.address, result.source])).toEqual([
      ["math.ease", "both"],
      ["Lerp", "semantic"],
    ]);
  });
});
