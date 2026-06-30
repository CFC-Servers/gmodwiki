// Generate embeddings.bin + embeddings_manifest.json locally from the existing build/cache/gmod/*.json
import { buildEmbeddings } from "./modules/embeddings.js";
import { WorkersAiEmbedder } from "./modules/workers_ai_embedder.js";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
if (!accountId || !apiToken) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN first.");
  process.exit(1);
}

const embedder = new WorkersAiEmbedder(accountId, apiToken);
const result = await buildEmbeddings({ cacheDir: "build/cache", outDir: "public", embedder });
console.log(`embeddings: wrote ${result.total} vectors (${result.embedded} new/changed, ${result.deleted.length} removed)`);
