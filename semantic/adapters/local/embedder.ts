import { pipeline, env } from "@huggingface/transformers";
import type { Embedder } from "../../core/types.js";
import { QUERY_PREFIX } from "../../core/model.js";

export class LocalEmbedder implements Embedder {
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

  async embed(text: string): Promise<Float32Array> {
    const extractor = await this.ensure();
    const output = await extractor(QUERY_PREFIX + text, { pooling: "mean", normalize: true });
    return Float32Array.from(output.data as Float32Array);
  }
}
