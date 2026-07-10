import { describe, it, expect } from "vitest";
import { highlightTerms } from "./highlight.js";

describe("highlightTerms", () => {
  it("marks matching terms", () => {
    const runs = highlightTerms("Forces the player to say text", "player say");
    const matched = runs.filter((r) => r.match).map((r) => r.text.toLowerCase());
    expect(matched).toContain("player");
    expect(matched).toContain("say");
  });
  it("returns a single unmatched run when nothing matches", () => {
    const runs = highlightTerms("Forces the bot to talk", "networking");
    expect(runs).toEqual([{ text: "Forces the bot to talk", match: false }]);
  });
});
