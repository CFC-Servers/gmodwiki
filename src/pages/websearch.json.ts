import type { APIContext, APIRoute } from "astro";
import { hybridSearch, semanticSearch } from "../../semantic/core/search.js";
import { keywordRank } from "../../semantic/core/keyword.js";
import { HostedEmbedder } from "../../semantic/adapters/hosted/embedder.js";
import { HostedVectorStore } from "../../semantic/adapters/hosted/store.js";
import type { SearchResult } from "../../semantic/core/types.js";

type KeywordIndex = Record<string, string[][]>;

let localStorePromise: Promise<any> | null = null;
let localEmbedder: any = null;
let localKeywordIndexPromise: Promise<KeywordIndex> | null = null;

async function getLocalDeps() {
  const { LocalVectorStore } = await import("../../semantic/adapters/local/store.js");
  const { LocalEmbedder } = await import("../../semantic/adapters/local/embedder.js");
  if (!localStorePromise) {
    const binPath = process.env.EMBEDDINGS_BIN ?? "./public/embeddings.bin";
    const manifestPath = process.env.EMBEDDINGS_MANIFEST ?? "./public/embeddings_manifest.json";
    localStorePromise = LocalVectorStore.load(binPath, manifestPath);
  }
  if (!localEmbedder) localEmbedder = new LocalEmbedder();
  return { store: await localStorePromise, embedder: localEmbedder };
}

async function readLocalKeywordIndex(): Promise<KeywordIndex> {
  const { promises: fs } = await import("fs");
  const indexPath = process.env.SEARCH_INDEX ?? "./public/search_index.json";

  return JSON.parse(await fs.readFile(indexPath, "utf8"));
}

async function loadKeywordIndex(host: string): Promise<KeywordIndex> {
  if (host === "gmodwiki.com") {
    const response = await fetch("https://storage.gmodwiki.com/search_index.json");
    return await response.json() as KeywordIndex;
  }

  localKeywordIndexPromise ??= readLocalKeywordIndex();

  return localKeywordIndexPromise;
}

export async function search(query: string, url: URL, locals: APIContext["locals"]): Promise<SearchResult[]> {
  const keywordIndex = await loadKeywordIndex(url.host);

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
      return results;
    } catch (e) {

      console.warn("hosted semantic search unavailable, falling back to keyword:", e);
    }
  }

  // Offline path (Node adapter / Docker): local model + on-disk vectors
  try {
    const { store, embedder } = await getLocalDeps();
    const results = await hybridSearch(query, 50, {
      semantic: () => semanticSearch(query, 50, { embedder, store, meta: (id: string) => store.meta(id) }),
      keyword: () => keywordRank(keywordIndex, query, 50),
      meta: (id: string) => store.meta(id),
    });
    return results;
  } catch (e) {
    console.warn("local semantic search unavailable, falling back to keyword:", e);
  }

  // Fallback (no bindings?): keyword-only
  return keywordRank(keywordIndex, query, 50).map((r) => ({
    address: r.id, title: r.id, url: "/" + r.id, snippet: r.snippet, score: 0, source: "keyword" as const,
  }));
}

export const GET: APIRoute = async ({ url, locals }) => {
  const query = url.searchParams.get("query");
  if (!query || query.length === 0) return new Response("No query provided", { status: 400 });

  const results = await search(query, url, locals);

  return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
};
