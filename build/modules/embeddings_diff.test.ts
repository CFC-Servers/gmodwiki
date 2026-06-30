import { describe, it, expect } from "vitest";
import { changeKeyFor, diffManifest } from "./embeddings_diff.js";
import type { Manifest, RawEntry } from "../../semantic/core/types.js";

const mk = (address: string, rev: number): RawEntry => ({
  address, title: address, tags: "function", html: `<p>${address}</p>`, revisionId: rev,
});

describe("changeKeyFor", () => {
  it("uses revisionId when present", () => {
    expect(changeKeyFor(mk("A", 7))).toBe("7");
  });
  it("falls back to a content hash when revisionId is absent", () => {
    const e: RawEntry = { address: "A", title: "A", tags: "", html: "<p>hi</p>" };
    expect(changeKeyFor(e).startsWith("h:")).toBe(true);
  });
});

describe("diffManifest", () => {
  it("embeds everything on a fresh build", () => {
    const d = diffManifest(null, [mk("A", 1), mk("B", 1)]);
    expect(d.toEmbed.map((e) => e.address).sort()).toEqual(["A", "B"]);
    expect(d.toDelete).toEqual([]);
  });
  it("embeds only changed/new and deletes removed", () => {
    const prev: Manifest = {
      model: "m", dims: 768, count: 2,
      entries: [
        { id: "A", address: "A", title: "A", snippet: "", url: "/A", kind: "other", changeKey: "1" },
        { id: "B", address: "B", title: "B", snippet: "", url: "/B", kind: "other", changeKey: "1" },
      ],
    };
    const d = diffManifest(prev, [mk("A", 1), mk("B", 2), mk("C", 1)]);
    expect(d.toEmbed.map((e) => e.address).sort()).toEqual(["B", "C"]);
    expect(d.toDelete).toEqual([]); // changed ids are upserted, not deleted
    expect(d.unchanged).toEqual(["A"]);
  });
  it("marks removed pages for deletion", () => {
    const prev: Manifest = {
      model: "m", dims: 768, count: 1,
      entries: [{ id: "Z", address: "Z", title: "Z", snippet: "", url: "/Z", kind: "other", changeKey: "1" }],
    };
    const d = diffManifest(prev, [mk("A", 1)]);
    expect(d.toDelete).toEqual(["Z"]);
    expect(d.toEmbed.map((e) => e.address)).toEqual(["A"]);
  });
});
