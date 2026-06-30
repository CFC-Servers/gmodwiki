import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { encodeEmbeddings } from "../../core/binary.js";
import { LocalVectorStore } from "./store.js";
import type { Manifest } from "../../core/types.js";

let binPath: string;
let manifestPath: string;

beforeAll(async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lvs-"));
  binPath = path.join(tmp, "embeddings.bin");
  manifestPath = path.join(tmp, "manifest.json");
  const vectors = [new Float32Array([1, 0, 0]), new Float32Array([0, 1, 0])];
  await fs.writeFile(binPath, encodeEmbeddings(vectors, 3));
  const manifest: Manifest = {
    model: "m", dims: 3, count: 2,
    entries: [
      { id: "A", address: "A", title: "Alpha", snippet: "a", url: "/A", kind: "function", changeKey: "1" },
      { id: "B", address: "B", title: "Beta", snippet: "b", url: "/B", kind: "hook", changeKey: "1" },
    ],
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
});

describe("LocalVectorStore", () => {
  it("returns the nearest id with metadata", async () => {
    const store = await LocalVectorStore.load(binPath, manifestPath);
    const matches = await store.query(new Float32Array([1, 0, 0]), 1);
    expect(matches[0].id).toBe("A");
    expect(matches[0].metadata).toEqual({ title: "Alpha", url: "/A", snippet: "a", kind: "function" });
  });
});
