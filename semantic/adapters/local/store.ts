import { promises as fs } from "fs";
import { decodeEmbeddings } from "../../core/binary.js";
import { bruteForceTopK } from "../../core/cosine.js";
import type { Manifest, Match, VectorStore } from "../../core/types.js";

export class LocalVectorStore implements VectorStore {
  private constructor(
    private vectors: Float32Array[],
    private ids: string[],
    private manifest: Manifest,
  ) {}

  static async load(binPath: string, manifestPath: string): Promise<LocalVectorStore> {
    const manifest: Manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const { vectors } = decodeEmbeddings(new Uint8Array(await fs.readFile(binPath)));
    const ids = manifest.entries.map((e) => e.id);
    return new LocalVectorStore(vectors, ids, manifest);
  }

  meta(id: string): { title: string; url: string; snippet: string } | null {
    const e = this.manifest.entries.find((x) => x.id === id);
    return e ? { title: e.title, url: e.url, snippet: e.snippet } : null;
  }

  async query(vector: Float32Array, k: number): Promise<Match[]> {
    const top = bruteForceTopK(vector, this.vectors, this.ids, k);
    return top.map((m) => ({ ...m, metadata: this.meta(m.id) ?? undefined }));
  }
}
