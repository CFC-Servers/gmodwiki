import { describe, it, expect } from "vitest";
import { keywordRank } from "./keyword.js";

const index = {
  player: [["Player:Say", "forces the player to say"], ["Entity:GetOwner", "the player who owns"]],
  say: [["Player:Say", "player to say text"]],
};

describe("keywordRank", () => {
  it("ranks pages matching more query terms higher", () => {
    const out = keywordRank(index, "player say", 10);
    expect(out[0].id).toBe("Player:Say"); // matches both terms
    expect(out.map((o) => o.id)).toContain("Entity:GetOwner");
  });
});
