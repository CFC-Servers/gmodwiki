// Generate embeddings.bin + embeddings_manifest.json locally from the existing build/cache/gmod/*.json
import { buildEmbeddings } from "./modules/embeddings.js";
import { LocalDocEmbedder } from "./modules/local_doc_embedder.js";

const embedder = new LocalDocEmbedder();
const result = await buildEmbeddings({ cacheDir: "build/cache", outDir: "public", embedder });
console.log(`embeddings: wrote ${result.total} vectors (${result.embedded} new/changed, ${result.deleted.length} removed)`);
