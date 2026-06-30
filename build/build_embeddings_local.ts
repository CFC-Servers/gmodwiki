// Generate embeddings.bin + embeddings_manifest.json locally from the existing
// build/cache/gmod/*.json — WITHOUT running the full site build. Reads only the
// local cache; the only network calls are Workers AI embed requests.
//
// Usage:
//   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_AI_API_TOKEN=... \
//     node --no-warnings=ExperimentalWarning --loader ts-node/esm ./scripts/build_embeddings_local.ts
//
// The token needs Workers AI (read) scope. Output lands in public/.
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
