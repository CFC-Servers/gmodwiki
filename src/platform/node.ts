import { promises as fs } from "fs";
import type { SemanticSearchDeps } from "../../semantic/core/search.js";
import type { KeywordIndex, PageLookup, Platform } from "./types";

const missingFileErrorCodes = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"]);
const hostPattern = /^([a-z0-9.-]+|\[[0-9a-f:]+\])(:\d+)?$/i;
const allowedProtocols = new Set(["http", "https"]);

let keywordIndex: Promise<KeywordIndex> | undefined;
let semanticSearch: Promise<SemanticSearchDeps> | undefined;

function isMissingFileError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return typeof error.code === "string" && missingFileErrorCodes.has(error.code);
}

function staysInsideContentDir(contentSlug: string): boolean {
  const segments = contentSlug.split(/[\\/]/);
  return !segments.includes("..") && !contentSlug.includes("\0");
}

async function loadPage(contentSlug: string): Promise<PageLookup> {
  if (!staysInsideContentDir(contentSlug)) return { status: "missing" };

  const contentDir = process.env.CONTENT_DIR ?? "./public/content";

  try {
    const content = await fs.readFile(`${contentDir}/${contentSlug}.json`, "utf8");
    return { status: "found", page: JSON.parse(content) };
  } catch (error) {
    if (isMissingFileError(error)) return { status: "missing" };
    throw error;
  }
}

function firstHeaderValue(request: Request, name: string): string {
  const header = request.headers.get(name) ?? "";
  return header.split(",")[0].trim();
}

function originFromRequestHeaders(request: Request, url: URL): string {
  const candidateHosts = [
    firstHeaderValue(request, "x-forwarded-host"),
    firstHeaderValue(request, "host"),
  ];

  const host = candidateHosts.find((candidate) => hostPattern.test(candidate));
  if (!host) return url.origin;

  const forwardedProtocol = firstHeaderValue(request, "x-forwarded-proto");
  const urlProtocol = url.protocol.replace(":", "");
  const protocol = allowedProtocols.has(forwardedProtocol) ? forwardedProtocol : urlProtocol;

  return `${protocol}://${host}`;
}

function configuredOrigin(): string | undefined {
  const configured = process.env.PUBLIC_ORIGIN;
  if (!configured) return undefined;

  return configured.replace(/\/+$/, "");
}

function publicOrigin(request: Request, url: URL): string {
  return configuredOrigin() ?? originFromRequestHeaders(request, url);
}

async function readKeywordIndex(): Promise<KeywordIndex> {
  const indexPath = process.env.SEARCH_INDEX ?? "./public/search_index.json";
  return JSON.parse(await fs.readFile(indexPath, "utf8"));
}

function loadKeywordIndex(): Promise<KeywordIndex> {
  keywordIndex ??= readKeywordIndex();
  return keywordIndex;
}

async function createSemanticSearch(): Promise<SemanticSearchDeps> {
  const { LocalVectorStore } = await import("../../semantic/adapters/local/store.js");
  const { LocalEmbedder } = await import("../../semantic/adapters/local/embedder.js");

  const binPath = process.env.EMBEDDINGS_BIN ?? "./public/embeddings.bin";
  const manifestPath = process.env.EMBEDDINGS_MANIFEST ?? "./public/embeddings_manifest.json";
  const store = await LocalVectorStore.load(binPath, manifestPath);

  return { embedder: new LocalEmbedder(), store, meta: (id) => store.meta(id) };
}

function loadSemanticSearch(): Promise<SemanticSearchDeps> {
  semanticSearch ??= createSemanticSearch();
  return semanticSearch;
}

export const platform: Platform = { loadPage, publicOrigin, loadKeywordIndex, loadSemanticSearch };
