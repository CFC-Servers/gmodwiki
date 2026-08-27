import { pipeline, env } from "@huggingface/transformers";

// Documents are embedded as passages: bge-base-en-v1.5 is asymmetric, so unlike
// the query-side LocalEmbedder there is NO instruction prefix here.
const MAX_BATCH = 16;

export class LocalDocEmbedder {
  private extractor: any | null = null;

  private async ensure() {
    if (!this.extractor) {
      if (process.env.MODEL_CACHE_DIR) {
        env.cacheDir = process.env.MODEL_CACHE_DIR;
        env.allowRemoteModels = false;
      }

      this.extractor = await pipeline("feature-extraction", "Xenova/bge-base-en-v1.5", {
        dtype: "q8",
      });
    }

    return this.extractor;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const extractor = await this.ensure();
    const out: Float32Array[] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      const chunk = texts.slice(i, i + MAX_BATCH);
      const output = await extractor(chunk, { pooling: "mean", normalize: true });

      const dims = output.dims[output.dims.length - 1];
      const data = output.data as Float32Array;
      for (let row = 0; row < chunk.length; row++) {
        out.push(Float32Array.from(data.subarray(row * dims, (row + 1) * dims)));
      }

      console.log(`  embedded ${Math.min(i + MAX_BATCH, texts.length)}/${texts.length}`);
    }

    return out;
  }
}
