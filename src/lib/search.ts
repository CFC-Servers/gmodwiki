import { platform } from "@platform";
import { hybridSearch, semanticSearch } from "../../semantic/core/search.js";
import { keywordRank } from "../../semantic/core/keyword.js";
import type { SearchResult } from "../../semantic/core/types.js";

const resultLimit = 50;

export async function search(query: string): Promise<SearchResult[]> {
  const keywordIndex = await platform.loadKeywordIndex();
  const keywordMatches = () => keywordRank(keywordIndex, query, resultLimit);

  try {
    const semanticDeps = await platform.loadSemanticSearch();

    return await hybridSearch(query, resultLimit, {
      semantic: () => semanticSearch(query, resultLimit, semanticDeps),
      keyword: keywordMatches,
      meta: semanticDeps.meta,
    });
  } catch (error) {
    console.warn("semantic search unavailable, falling back to keyword:", error);
  }

  return keywordMatches().map((match) => ({
    address: match.id,
    title: match.id,
    url: `/${match.id}`,
    snippet: match.snippet,
    score: 0,
    source: "keyword",
  }));
}
