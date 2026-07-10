import type { Match, PageKind, VectorStore } from "../../core/types.js";

export class HostedVectorStore implements VectorStore {
  constructor(private index: VectorizeIndex) {}

  async query(vector: Float32Array, k: number): Promise<Match[]> {
    const res = await this.index.query(Array.from(vector), { topK: k, returnMetadata: "all" });

    return res.matches.map((m) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata as { title: string; url: string; snippet: string; kind?: PageKind } | undefined,
    }));
  }
}
