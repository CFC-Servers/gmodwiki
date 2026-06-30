import { MODEL_ID, QUERY_PREFIX } from "../../core/model.js";
import type { Embedder } from "../../core/types.js";

export class HostedEmbedder implements Embedder {
  constructor(private ai: Ai) {}

  async embed(text: string): Promise<Float32Array> {
    const res: any = await this.ai.run(MODEL_ID as any, { text: [QUERY_PREFIX + text] });
    const data: number[][] = res.data ?? res.result?.data;
    if (!data || !data[0]) throw new Error("Workers AI embed returned no data");
    return Float32Array.from(data[0]);
  }
}
