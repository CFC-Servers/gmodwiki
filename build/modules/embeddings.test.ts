import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

import { buildEmbeddings, loadRawEntries, mergeManifest } from "./embeddings.js";
import { decodeEmbeddings } from "../../semantic/core/binary.js";
import { EMBEDDING_DIMS } from "../../semantic/core/model.js";

const fakeEmbedder = {
  async embedBatch(texts: string[]) {
    return texts.map((t) => {
      const v = new Float32Array(EMBEDDING_DIMS);
      v[0] = t.length;
      return v;
    });
  },
};

async function seedCache(dir: string, pages: { address: string; rev: number }[]) {
  const gmod = path.join(dir, "gmod");
  await fs.mkdir(gmod, { recursive: true });

  for (const p of pages) {
    await fs.writeFile(
      path.join(gmod, `${p.address}.json`),
      JSON.stringify({ address: p.address, title: p.address, tags: "function", html: `<p>${p.address}</p>`, revisionId: p.rev }),
    );
  }
}

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "emb-"));
});

describe("buildEmbeddings", () => {
  it("does a full build then an incremental build", async () => {
    const cacheDir = path.join(tmp, "cache");
    const outDir = path.join(tmp, "out");
    await fs.mkdir(outDir, { recursive: true });
    await seedCache(cacheDir, [{ address: "A", rev: 1 }, { address: "B", rev: 1 }]);

    const full = await buildEmbeddings({ cacheDir, outDir, embedder: fakeEmbedder });
    expect(full.embedded).toBe(2);
    expect(full.total).toBe(2);

    const bin = await fs.readFile(path.join(outDir, "embeddings.bin"));
    expect(decodeEmbeddings(new Uint8Array(bin)).count).toBe(2);

    // Change B, add C, remove nothing
    await seedCache(cacheDir, [{ address: "A", rev: 1 }, { address: "B", rev: 2 }, { address: "C", rev: 1 }]);

    const inc = await buildEmbeddings({ cacheDir, outDir, embedder: fakeEmbedder });
    expect(inc.embedded).toBe(2);
    expect(inc.total).toBe(3);
  });
});

describe("loadRawEntries", () => {
  it("reads json entries from <cacheDir>/gmod", async () => {
    const cacheDir = path.join(tmp, "cache");
    await seedCache(cacheDir, [{ address: "A", rev: 1 }]);

    const entries = await loadRawEntries(cacheDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].address).toBe("A");
  });
});
