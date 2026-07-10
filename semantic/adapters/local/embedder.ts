import { pipeline, env } from "@huggingface/transformers";
import type { Embedder } from "../../core/types.js";
import { QUERY_PREFIX } from "../../core/model.js";

export class LocalEmbedder implements Embedder {
  private extractor: any | null = null;

  private async ensure() {
    if (!this.extractor) {
      // When a pre-baked model cache is provided, use it and never hit the network.
      if (process.env.MODEL_CACHE_DIR) {
        env.cacheDir = process.env.MODEL_CACHE_DIR;
        env.allowRemoteModels = false;
      }

      // Same model the build embeds documents with. q8 = 8-bit quantized
      // weights: smaller download, faster CPU inference, negligible quality loss.
      this.extractor = await pipeline("feature-extraction", "Xenova/bge-base-en-v1.5", {
        dtype: "q8",
      });
    }

    return this.extractor;
  }

  async embed(text: string): Promise<Float32Array> {
    const extractor = await this.ensure();

    // Mean pooling + normalization matches how Workers AI serves this model,
    // so local and hosted scores are comparable.
    const output = await extractor(QUERY_PREFIX + text, { pooling: "mean", normalize: true });

    return Float32Array.from(output.data as Float32Array);
  }
}
