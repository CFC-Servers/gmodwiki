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

  it("demotes a hook below a slightly-lower-scoring function (type-aware nudge)", async () => {
    // Hook out-scores the function on raw cosine, but the penalty flips them.
    const hookFirst = {
      async query() {
        return [{ id: "GM:PlayerSay", score: 0.8 }, { id: "Player:Say", score: 0.75 }];
      },
    };
    const kindMeta = (id: string) => ({
      title: id,
      url: "/" + id,
      snippet: "",
      kind: (id.startsWith("GM:") ? "hook" : "function") as "hook" | "function",
    });
    const results = await semanticSearch("send a chat message", 2, { embedder, store: hookFirst, meta: kindMeta });
    expect(results.map((r) => r.address)).toEqual(["Player:Say", "GM:PlayerSay"]);
    expect(results[0].kind).toBe("function");
  });

  it("leaves a hook on top when it wins by more than the penalty", async () => {
    const bigGap = {
      async query() {
        return [{ id: "GM:PlayerSay", score: 0.9 }, { id: "Player:Say", score: 0.5 }];
      },
    };
    const kindMeta = (id: string) => ({
      title: id, url: "/" + id, snippet: "",
      kind: (id.startsWith("GM:") ? "hook" : "function") as "hook" | "function",
    });
    const results = await semanticSearch("hook called when a player chats", 2, { embedder, store: bigGap, meta: kindMeta });
    expect(results[0].address).toBe("GM:PlayerSay");
  });
});
