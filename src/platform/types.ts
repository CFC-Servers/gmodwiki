import type { SemanticSearchDeps } from "../../semantic/core/search.js";

export interface WikiPage {
  title: string;
  description: string;
  html: string;
  footer: string;
  tags?: string;
}

export type PageLookup =
  | { status: "found"; page: WikiPage }
  | { status: "missing" };

export type KeywordIndex = Record<string, string[][]>;

export interface Platform {
  loadPage(contentSlug: string): Promise<PageLookup>;
  publicOrigin(request: Request, url: URL): string;
  loadKeywordIndex(): Promise<KeywordIndex>;
  loadSemanticSearch(): Promise<SemanticSearchDeps>;
}
