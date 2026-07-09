import { describe, it, expect, vi } from "vitest";
import { WorkersAiEmbedder } from "./workers_ai_embedder.js";

describe("WorkersAiEmbedder", () => {
  it("throws without credentials", () => {
    expect(() => new WorkersAiEmbedder("", "")).toThrow();
  });

  it("posts texts and parses float arrays", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ result: { data: [[0.1, 0.2], [0.3, 0.4]] }, success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const e = new WorkersAiEmbedder("acct", "token");
    const out = await e.embedBatch(["a", "b"]);

    expect(out).toHaveLength(2);
    expect(Array.from(out[0])).toEqual([expect.closeTo(0.1, 5), expect.closeTo(0.2, 5)]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const callArgs = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(callArgs[1].body)).toEqual({ text: ["a", "b"] });

    vi.unstubAllGlobals();
  });
});
