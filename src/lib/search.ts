/**
 * Shared search pipeline for the website (/websearch.json) and the MCP server
 * (/mcp): hybrid keyword + semantic search over official pages, with custom
 * (user-created) pages from Postgres mixed in.
 */

import { hybridSearch, semanticSearch } from "../../semantic/core/search.js";
import { keywordRank } from "../../semantic/core/keyword.js";
import { searchCustomPages } from "./db.js";
import type { SearchResult } from "../../semantic/core/types.js";

let localStorePromise: Promise<any> | null = null;
let localEmbedder: any = null;

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

async function customMatches(query: string): Promise<SearchResult[]> {
  try {
    const pages = await searchCustomPages(query, 10);
    return pages.map((p) => ({
      address: p.address,
      title: `${p.title} (custom)`,
      url: "/" + p.address,
      snippet: p.description || `Custom page in category ${p.category}`,
      kind: "other" as const,
      score: 1,
      source: "keyword" as const,
    }));
  } catch {
    return []; // no database — no custom results
  }
}

async function officialResults(query: string, k: number, origin: string): Promise<SearchResult[]> {
  const keywordIndex = (await (await fetch(`${origin}/search_index.json`)).json()) as Record<string, string[][]>;

  try {
    const { store, embedder } = await getLocalDeps();
    return await hybridSearch(query, k, {
      semantic: () => semanticSearch(query, k, { embedder, store, meta: (id: string) => store.meta(id) }),
      keyword: () => keywordRank(keywordIndex, query, k),
      meta: (id: string) => store.meta(id),
    });
  } catch (e) {
    console.warn("local semantic search unavailable, falling back to keyword:", e);
  }

  return keywordRank(keywordIndex, query, k).map((r) => ({
    address: r.id,
    title: r.id,
    url: "/" + r.id,
    snippet: r.snippet,
    score: 0,
    source: "keyword" as const,
  }));
}

/** Search official + custom pages. Custom title/address matches rank first. */
export async function searchWiki(query: string, k: number, origin: string): Promise<SearchResult[]> {
  const [custom, official] = await Promise.all([
    customMatches(query),
    officialResults(query, k, origin),
  ]);

  const customAddresses = new Set(custom.map((c) => c.address.toLowerCase()));
  const merged = [...custom, ...official.filter((r) => !customAddresses.has(r.address.toLowerCase()))];
  return merged.slice(0, k);
}
