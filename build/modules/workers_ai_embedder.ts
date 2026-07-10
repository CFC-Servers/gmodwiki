import { MODEL_ID } from "../../semantic/core/model.js";

// Workers AI caps embedding requests at 100 texts per call.
const MAX_BATCH = 100;

export class WorkersAiEmbedder {
  constructor(
    private accountId: string,
    private apiToken: string,
  ) {
    if (!accountId || !apiToken) {
      throw new Error("WorkersAiEmbedder requires accountId and apiToken");
    }
  }

  private async runBatch(texts: string[]): Promise<Float32Array[]> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${MODEL_ID}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texts }),
    });

    if (!res.ok) {
      throw new Error(`Workers AI embed failed: ${res.status} ${await res.text()}`);
    }

    const json: any = await res.json();
    const data: number[][] = json.result?.data;
    if (!Array.isArray(data)) throw new Error("Workers AI embed: missing result.data");

    return data.map((row) => Float32Array.from(row));
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const out: Float32Array[] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      const chunk = texts.slice(i, i + MAX_BATCH);
      out.push(...(await this.runBatch(chunk)));
      console.log(`  embedded ${Math.min(i + MAX_BATCH, texts.length)}/${texts.length}`);
    }

    return out;
  }
}
