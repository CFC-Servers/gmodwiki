// Downloads and builds all of the gmod pages
import path from "path";
import * as cheerio from "cheerio";
import { PagesAPI } from "./pages_api.js";
import { promises as fs } from "fs";
import { getAllPageLinks } from "./get_page_manifest.js";
import type { Page } from "./pages_api.js";
import type ApiInterface from "./api_interface.js";
import type StaticContentHandler from "./static.js";
import type SearchManager from "./search.js";

interface PageResponse {
  title: string;
  wikiName?: string;
  wikiIcon?: string;
  wikiUrl?: string;
  tags: string;
  address: string;
  createdTime?: string;
  updateCount?: number;
  markup?: string;
  html: string;
  footer: string;
  revisionId?: number;
  pageLinks?: any[];
}

const ellipsis = (str: string, max: number): string => {
  if (str.length <= max) {
    return str;
  }

  const ellipsisChars = "...";
  const trimLength = max - ellipsisChars.length;

  const lastSpaceIndex = str.lastIndexOf(" ", trimLength);

  const cutIndex = lastSpaceIndex > -1 ? lastSpaceIndex : trimLength;

  return str.substring(0, cutIndex) + ellipsisChars;
};

const stripMarkdownLinks = (text: string): string => {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
};

// Builds the description that'll be used in the og:description meta tag
const buildDescription = (markup: string, pageContent: string) => {
  let $ = cheerio.load(markup);

  // Try summary, then description
  let summary = $("summary").first().text();
  if (summary.length === 0) {
    summary = $("description").first().text();
  }

  // Fallback to first paragraph of the html
  if (summary.length === 0) {
    $ = cheerio.load(pageContent);
    summary = $("p").first().text();
  } else {
    // If we found a summary or description tag, we need to strip markdown
    summary = stripMarkdownLinks(summary);
  }

  return ellipsis(summary, 254);
};

// Excluded to keep the bundle size under 25mb (cloudflare limit)
const excludes: Map<string, boolean> = new Map([]);

async function buildPage(
  api: ApiInterface,
  contentManager: StaticContentHandler,
  searchManager: SearchManager,
  pageAPI: PagesAPI,
  link: string,
) {
  if (excludes.has(link)) {
    return;
  }

  const struct: PageResponse = await api.getJSON(`/gmod/${link}`);
  // console.log(chalk.green("Building"), link)

  let pageContent = await contentManager.processContent(struct.html, false);
  pageContent = pageContent.replace(/<html><head><\/head><body>/g, ""); // Remove unnecessary tags
  pageContent = pageContent.replace(/<\/body><\/html>/g, ""); // Remove unnecessary tags
  pageContent = pageContent.replace(
    /https:\/\/wiki\.facepunch\.com\/gmod\//g,
    "/",
  );
  pageContent = pageContent.replaceAll(/\/gmod\//g, "/"); // We've removed the /gmod prefix
  pageContent = pageContent.replaceAll(/CopyCode/g, "window.CopyCode"); // Because we use astro/rocket loader, we can't access the function without it being on the window
  pageContent = pageContent.replaceAll(
    /href="https:/g,
    `target="_blank" href="https:`,
  ); // Open external links in a new tab

  let address = struct.address.length > 0 ? struct.address : "index";
  address = address.replaceAll("/gmod/", "/");

  const page: Page = {
    title: struct.title,
    description: buildDescription(struct.markup || "", pageContent),
    tags: struct.tags,
    address: address,
    html: pageContent,
    footer: struct.footer,
  };

  pageAPI.addPage(page);

  const jsonDestination = `./public/content/${address.toLowerCase()}.json`;
  const dirPath = path.dirname(jsonDestination);
  await fs.mkdir(dirPath, { recursive: true });

  const jsonContent = JSON.stringify(page);
  await fs.writeFile(jsonDestination, jsonContent);

  searchManager.addBlob(address, pageContent);
}

export async function buildAllPages(
  api: ApiInterface,
  contentHandler: StaticContentHandler,
  searchManager: SearchManager,
) {
  const pageAPI = new PagesAPI();
  const allLinks = await getAllPageLinks(api);

  // split into 10 chunks
  const chunkSize = Math.ceil(allLinks.length / 10);
  const chunks = [];
  for (let i = 0; i < allLinks.length; i += chunkSize) {
    chunks.push(allLinks.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const promises = chunk.map((link) =>
      buildPage(api, contentHandler, searchManager, pageAPI, link),
    );
    await Promise.all(promises);
  }

  // TODO: Enable and finalize if this could be useful
  // await pageAPI.save()
}
