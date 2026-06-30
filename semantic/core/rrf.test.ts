import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "./rrf.js";

describe("reciprocalRankFusion", () => {
  it("ranks an item found by both lists above items found by one", () => {
    const keyword = ["a", "b", "c"];
    const semantic = ["b", "d", "e"];
    const fused = reciprocalRankFusion([keyword, semantic]);
    expect(fused[0].id).toBe("b");
    expect(fused.find((f) => f.id === "b")!.sources).toEqual([0, 1]);
  });
  it("includes items unique to a single list", () => {
    const fused = reciprocalRankFusion([["a"], ["z"]]);
    expect(fused.map((f) => f.id).sort()).toEqual(["a", "z"]);
  });
});
