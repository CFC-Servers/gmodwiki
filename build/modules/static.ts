// Finds, acquires, writes, and stubs any static content found in a given html file
import path from "path";
import sharp, { type WebpOptions } from "sharp";
import * as cheerio from "cheerio";
import isAnimated from "@frsource/is-animated";
import { promises as fs } from "fs";
import type ApiInterface from "./api_interface.js";

/**
 * Finds and extracts static content (images, css, js, fonts) from HTML and CSS files,
 * downloads them locally, potentially optimizes them, and rewrites the URLs to point to our hosted copies.
 */

async function fileExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

const fileWhitelist = new Map([
  [".png", true],
  [".jpg", true],
  [".svg", true],
  [".jpeg", true],
  [".gif", true],
  [".webp", true],
  [".ico", true],
  [".css", true],
  [".js", true],
  [".woff", true],
  [".woff2", true],
  [".ttf", true],
  [".eot", true],
  [".otf", true],
  [".7z", true],
]);

const isImage = new Map([
  [".png", true],
  [".jpg", true],
  [".svg", true],
  [".jpeg", true],
  [".gif", true],
  [".webp", true],
]);

const scriptableImageExtensions = new Set([".svg"]);

const hostWhitelist = new Map([
  ["files.facepunch.com", true],
  ["wiki.facepunch.com", true],
]);

const staticWebpOptions: WebpOptions = {
  effort: 5,
  quality: 83,
  preset: "text",
  smartSubsample: true,
};

const animatedWebpOptions: WebpOptions = {
  effort: 4,
  lossless: true,
};

export interface StoredFile {
  filePath: string;
  data: Buffer;
}

function withWebpExtension(filePath: string): string {
  const extension = path.extname(filePath);
  const withoutExtension = filePath.slice(0, -extension.length);

  return `${withoutExtension}.webp`;
}

function toPublicUrl(filePath: string): string {
  return `/${filePath}`.replaceAll("public/", "");
}

async function findExistingFile(filePaths: string[]): Promise<string | null> {
  for (const filePath of filePaths) {
    if (await fileExists(filePath)) return filePath;
  }

  return null;
}

async function encodeWebp(data: Buffer, animated: boolean): Promise<Buffer> {
  const webpOptions = animated ? animatedWebpOptions : staticWebpOptions;
  return await sharp(data, { animated }).webp(webpOptions).toBuffer();
}

export async function convertImage(
  data: Buffer,
  originalPath: string,
): Promise<StoredFile> {
  const webp = await encodeWebp(data, isAnimated(data));

  const extension = path.extname(originalPath).toLowerCase();
  const canServeOriginal = !scriptableImageExtensions.has(extension);
  const originalIsSmaller = data.length <= webp.length;

  if (canServeOriginal && originalIsSmaller) {
    return { filePath: originalPath, data };
  }

  return { filePath: withWebpExtension(originalPath), data: webp };
}

class StaticContentHandler {
  private host: string;
  private api: ApiInterface;
  private cache: Map<string, string>;

  constructor(host: string, api: ApiInterface) {
    this.host = host;
    this.api = api;
    this.cache = new Map();
  }

  private async downloadContent(url: string): Promise<string> {
    const resolvedUrl = this.resolveUrl(url);

    const cached = this.cache.get(resolvedUrl);
    if (cached) return cached;

    const urlPath = new URL(resolvedUrl).pathname;
    const directoryStructure = path.dirname(urlPath);
    const fullPath = `public/${directoryStructure}`;

    const fileName = path.basename(resolvedUrl).split("?")[0];
    const fileExtension = path.extname(fileName).toLowerCase();
    const originalPath = path.join(fullPath, fileName).replaceAll("\\", "/");

    const convertsToWebp = isImage.has(fileExtension);
    const possiblePaths = convertsToWebp
      ? [withWebpExtension(originalPath), originalPath]
      : [originalPath];

    if (fileExtension !== ".css") {
      const existingPath = await findExistingFile(possiblePaths);
      if (existingPath) return this.remember(resolvedUrl, existingPath);
    }

    await fs.mkdir(fullPath, { recursive: true });

    const data = await this.api.getRawFull(resolvedUrl);
    const stored = convertsToWebp
      ? await convertImage(data, originalPath)
      : { filePath: originalPath, data };

    await fs.writeFile(stored.filePath, stored.data);

    return this.remember(resolvedUrl, stored.filePath);
  }

  private remember(resolvedUrl: string, filePath: string): string {
    const newURL = toPublicUrl(filePath);
    this.cache.set(resolvedUrl, newURL);

    return newURL;
  }

  private resolveUrl(url: string): string {
    if (url.startsWith("//")) {
      return `https:${url}`;
    } else if (url.startsWith("/")) {
      return `${this.host}${url}`;
    } else if (url.startsWith("../../")) {
      return `${this.host}/${url}`;
    }
    return url;
  }

  // Looks for and processes static content in HTML files
  private async processHtml(content: string): Promise<string> {
    const $ = cheerio.load(content);
    const elements = $("img[src], link[href], script[src], a[href]");

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      const $el = $(element);
      const url = $el.attr("src") || $el.attr("href");
      if (!url) continue;

      const extension = path.extname(url.split("?")[0]).toLowerCase();
      if (!fileWhitelist.has(extension)) {
        continue;
      }

      const resolvedUrl = this.resolveUrl(url);

      const host = new URL(resolvedUrl).hostname;
      if (!hostWhitelist.has(host)) continue;

      const newURL = await this.downloadContent(resolvedUrl);
      if (!newURL) continue;

      if ($el.attr("src") !== undefined) {
        $el.attr("src", newURL);
      }
      if ($el.attr("href") !== undefined) {
        $el.attr("href", newURL);
      }
    }

    return $.html();
  }

  // Looks for and processes static content in CSS files
  private async processCss(content: string): Promise<string> {
    const urlRegex = /url\((?!['"]?:)['"]?([^'")]*)['"]?\)/g;
    let modifiedContent = content;

    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1];
      if (!url) continue;

      const resolvedUrl = this.resolveUrl(url);
      const newURL = await this.downloadContent(resolvedUrl);
      if (!newURL) continue;

      modifiedContent = modifiedContent.replaceAll(url, newURL);
    }

    return modifiedContent;
  }

  public async processContent(
    content: string,
    isCss: boolean = false,
  ): Promise<string> {
    if (isCss) {
      return await this.processCss(content);
    } else {
      return await this.processHtml(content);
    }
  }
}

export default StaticContentHandler;
