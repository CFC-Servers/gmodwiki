import type { APIContext } from "astro";
import { runsOnCloudflare } from "./runtime";

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

async function fetchFromOrigin(slug: string, url: URL): Promise<PageLookup> {
  const resource = `${url.protocol}//${url.host}/content/${slug}.json`;
  const response = await fetch(resource);
  if (response.status === 404) return { status: "missing" };

  return { status: "found", page: await response.json() };
}

const missingFileErrorCodes = new Set(["ENOENT", "ENOTDIR", "ENAMETOOLONG"]);

function isMissingFileError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return typeof error.code === "string" && missingFileErrorCodes.has(error.code);
}

function staysInsideContentDir(slug: string): boolean {
  const segments = slug.split(/[\\/]/);
  return !segments.includes("..") && !slug.includes("\0");
}

async function readFromDisk(slug: string): Promise<PageLookup> {
  if (!staysInsideContentDir(slug)) return { status: "missing" };

  const { promises: fs } = await import("fs");
  const contentDir = process.env.CONTENT_DIR ?? "./public/content";

  try {
    const content = await fs.readFile(`${contentDir}/${slug}.json`, "utf8");
    return { status: "found", page: JSON.parse(content) };
  } catch (error) {
    if (isMissingFileError(error)) return { status: "missing" };
    throw error;
  }
}

export async function loadPage(
  slug: string,
  url: URL,
  locals: APIContext["locals"],
): Promise<PageLookup> {
  const contentSlug = slug.toLowerCase();
  if (runsOnCloudflare(locals)) return fetchFromOrigin(contentSlug, url);

  return readFromDisk(contentSlug);
}
