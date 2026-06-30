import type { Embedder, VectorStore, SearchResult, PageGetter, PageKind } from "./types.js";
import { reciprocalRankFusion } from "./rrf.js";
import { kindWeight } from "./model.js";

type Meta = { title: string; url: string; snippet: string; kind?: PageKind };

export async function semanticSearch(
  query: string,
  k: number,
  deps: {
    embedder: Embedder;
    store: VectorStore;
    meta: (id: string) => Meta | null;
  },
): Promise<SearchResult[]> {
  const vector = await deps.embedder.embed(query);
  const matches = await deps.store.query(vector, k);
  const out: SearchResult[] = [];
  for (const m of matches) {
    const meta = m.metadata ?? deps.meta(m.id);
    if (!meta) continue;
    out.push({
      address: m.id,
      title: meta.title,
      url: meta.url,
      snippet: meta.snippet,
      kind: meta.kind,
      // Type-aware nudge: demote hooks so the function you'd actually call wins
      // a near-tie. Re-sorted below so the order reflects the adjusted score.
      score: m.score * kindWeight(meta.kind),
      source: "semantic",
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export async function hybridSearch(
  query: string,
  k: number,
  deps: {
    semantic: () => Promise<SearchResult[]>;
    keyword: () => { id: string; snippet: string }[];
    meta: (id: string) => Meta | null;
  },
): Promise<SearchResult[]> {
  const [semantic, keyword] = [await deps.semantic(), deps.keyword()];

  const semanticIds = semantic.map((r) => r.address);
  const keywordIds = keyword.map((r) => r.id);
  const fused = reciprocalRankFusion([keywordIds, semanticIds]); // list 0 = keyword, 1 = semantic

  const snippetById = new Map<string, string>();
  for (const r of semantic) snippetById.set(r.address, r.snippet);
  for (const r of keyword) if (!snippetById.has(r.id)) snippetById.set(r.id, r.snippet);

  // Semantic results carry real title/url (from Vectorize on the hosted path, or
  // the manifest offline) plus the type-aware nudge already applied to their
  // ordering. Prefer them over the meta() fallback, which on the hosted path is
  // only a placeholder (the Worker has no manifest to look up).
  const metaById = new Map<string, Meta>();
  for (const r of semantic) metaById.set(r.address, { title: r.title, url: r.url, snippet: r.snippet, kind: r.kind });

  const out: SearchResult[] = [];
  for (const f of fused.slice(0, k)) {
    const meta = metaById.get(f.id) ?? deps.meta(f.id);
    const inKeyword = f.sources.includes(0);
    const inSemantic = f.sources.includes(1);
    const source: SearchResult["source"] = inKeyword && inSemantic ? "both" : inSemantic ? "semantic" : "keyword";
    out.push({
      address: f.id,
      title: meta?.title ?? f.id,
      url: meta?.url ?? "/" + f.id,
      snippet: snippetById.get(f.id) ?? meta?.snippet ?? "",
      kind: meta?.kind,
      score: f.score,
      source,
    });
  }
  return out;
}
