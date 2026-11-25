import { env } from "cloudflare:workers";
import { HostedEmbedder } from "../../semantic/adapters/hosted/embedder.js";
import { HostedVectorStore } from "../../semantic/adapters/hosted/store.js";
import type { SemanticSearchDeps } from "../../semantic/core/search.js";
import type { KeywordIndex, PageLookup, Platform } from "./types";

const keywordIndexUrl = "https://storage.gmodwiki.com/search_index.json";

// the assets binding only reads the path of the URL
const assetsOrigin = "https://assets.local";

function contentUrl(contentSlug: string): string {
  const encodedSegments = contentSlug.split("/").map(encodeURIComponent);
  return `${assetsOrigin}/content/${encodedSegments.join("/")}.json`;
}

async function loadPage(contentSlug: string): Promise<PageLookup> {
  const response = await env.ASSETS.fetch(contentUrl(contentSlug));
  if (response.status === 404) return { status: "missing" };
  if (!response.ok) throw new Error(`Content request failed with status ${response.status}`);

  return { status: "found", page: await response.json() };
}

function publicOrigin(_request: Request, url: URL): string {
  return url.origin;
}

async function loadKeywordIndex(): Promise<KeywordIndex> {
  const response = await fetch(keywordIndexUrl);
  if (!response.ok) throw new Error(`Keyword index request failed with status ${response.status}`);

  return response.json();
}

async function loadSemanticSearch(): Promise<SemanticSearchDeps> {
  return {
    embedder: new HostedEmbedder(env.AI),
    store: new HostedVectorStore(env.VECTORIZE),
    meta: (id) => ({ title: id, url: `/${id}`, snippet: "" }),
  };
}

export const platform: Platform = { loadPage, publicOrigin, loadKeywordIndex, loadSemanticSearch };
