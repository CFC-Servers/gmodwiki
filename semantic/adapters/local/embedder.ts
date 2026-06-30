import { pipeline, env } from "@huggingface/transformers";
import type { Embedder } from "../../core/types.js";
import { QUERY_PREFIX } from "../../core/model.js";

export class LocalEmbedder implements Embedder {
  private extractor: any | null = null;

  private async ensure() {
    if (!this.extractor) {
      // Node uses the onnxruntime-node (cpu) backend — the only one transformers.js
      // supports outside the browser. The Docker image prunes the unused
      // cross-platform binaries to keep the size down (packaging strategy A).
      // q8 keeps the baked model ~35MB (vs ~90MB fp32); negligible cosine-rank impact.
      //
      // MODEL_CACHE_DIR: set in the Docker final image to the baked-in hf-cache path.
      // When present, force offline mode so the container never hits the network.
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
