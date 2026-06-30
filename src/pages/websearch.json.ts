import type { APIRoute } from "astro";
import { hybridSearch, semanticSearch } from "../../semantic/core/search.js";
import { keywordRank } from "../../semantic/core/keyword.js";
import { HostedEmbedder } from "../../semantic/adapters/hosted/embedder.js";
import { HostedVectorStore } from "../../semantic/adapters/hosted/store.js";

// Local adapter lazy loaders — dynamic imports so transformers.js/onnxruntime-node
// are never pulled into the Cloudflare Worker bundle.
let localStorePromise: Promise<any> | null = null;
let localEmbedder: any = null;

async function getLocalDeps() {
  const { LocalVectorStore } = await import("../../semantic/adapters/local/store.js");
  const { LocalEmbedder } = await import("../../semantic/adapters/local/embedder.js");
  if (!localStorePromise) {
    // EMBEDDINGS_BIN / EMBEDDINGS_MANIFEST allow the Docker final image to point
    // at dist/client/ (where Astro copies public/ assets) instead of the source
    // public/ tree which is not present in the container.
    const binPath = process.env.EMBEDDINGS_BIN ?? "./public/embeddings.bin";
    const manifestPath = process.env.EMBEDDINGS_MANIFEST ?? "./public/embeddings_manifest.json";
    localStorePromise = LocalVectorStore.load(binPath, manifestPath);
  }
  if (!localEmbedder) localEmbedder = new LocalEmbedder();
  return { store: await localStorePromise, embedder: localEmbedder };
}

export const GET: APIRoute = async ({ url, locals, request }) => {
  const query = url.searchParams.get("query");
  if (!query || query.length === 0) return new Response("No query provided", { status: 400 });

  const host = url.host;
  const indexUrl = host === "gmodwiki.com"
    ? "https://storage.gmodwiki.com/search_index.json"
    : `${url.origin}/search_index.json`;
  const keywordIndex = await (await fetch(indexUrl)).json() as Record<string, string[][]>;

  const env = (locals as any)?.runtime?.env;

  // Hosted path: Workers AI + Vectorize available as bindings.
  if (env?.AI && env?.VECTORIZE) {
    try {
      const embedder = new HostedEmbedder(env.AI);
      const store = new HostedVectorStore(env.VECTORIZE);
      const results = await hybridSearch(query, 50, {
        semantic: () =>
          semanticSearch(query, 50, {
            embedder,
            store,
            meta: (id) => ({ title: id, url: "/" + id, snippet: "" }),
          }),
        keyword: () => keywordRank(keywordIndex, query, 50),
        meta: (id) => ({ title: id, url: "/" + id, snippet: "" }),
      });
      return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
    } catch (e) {
      // Transient Workers AI / Vectorize error — degrade to keyword-only below
      // rather than 500ing, since the keyword index is already in hand.
      console.warn("hosted semantic search unavailable, falling back to keyword:", e);
    }
  }

  // Offline path (Node adapter / Docker): local model + on-disk vectors, if the artifact exists.
  try {
    const { store, embedder } = await getLocalDeps();
    const results = await hybridSearch(query, 50, {
      semantic: () => semanticSearch(query, 50, { embedder, store, meta: (id: string) => store.meta(id) }),
      keyword: () => keywordRank(keywordIndex, query, 50),
      meta: (id: string) => store.meta(id),
    });
    return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
  } catch (e) {
    console.warn("local semantic search unavailable, falling back to keyword:", e);
  }

  // Fallback (no bindings, e.g. local Node before Phase 3): keyword-only, shaped as SearchResult[].
  const keywordOnly = keywordRank(keywordIndex, query, 50).map((r) => ({
    address: r.id, title: r.id, url: "/" + r.id, snippet: r.snippet, score: 0, source: "keyword" as const,
  }));
  return new Response(JSON.stringify(keywordOnly), { headers: { "content-type": "application/json" } });
};
