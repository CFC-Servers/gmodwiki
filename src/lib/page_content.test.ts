import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPage } from "./page_content";

const nodeLocals = {};
const cloudflareLocals = { runtime: {} };
const requestUrl = new URL("https://gmodwiki.com/math.ease");
const page = { title: "math.ease", description: "Easing", html: "<p>content</p>", footer: "1 view<br>" };

describe("loadPage on the Node build", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "gmodwiki-content-"));
    const contentDir = path.join(workDir, "content");

    await fs.mkdir(contentDir);
    await fs.writeFile(path.join(contentDir, "math.ease.json"), JSON.stringify(page));
    await fs.writeFile(path.join(workDir, "secret.json"), JSON.stringify({ title: "secret" }));

    vi.stubEnv("CONTENT_DIR", contentDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(workDir, { recursive: true, force: true });
  });

  it("reads the page from the content directory, lowercasing the slug", async () => {
    expect(await loadPage("Math.Ease", requestUrl, nodeLocals)).toEqual({ status: "found", page });
  });

  it("reports a page with no content file as missing", async () => {
    expect(await loadPage("not_a_page", requestUrl, nodeLocals)).toEqual({ status: "missing" });
  });

  it("refuses slugs that climb out of the content directory", async () => {
    expect(await loadPage("../secret", requestUrl, nodeLocals)).toEqual({ status: "missing" });
    expect(await loadPage("..\\secret", requestUrl, nodeLocals)).toEqual({ status: "missing" });
    expect(await loadPage("nested/../../secret", requestUrl, nodeLocals)).toEqual({ status: "missing" });
  });

  it("reports slugs the filesystem cannot open as missing", async () => {
    const overlongSlug = "a".repeat(300);

    expect(await loadPage(overlongSlug, requestUrl, nodeLocals)).toEqual({ status: "missing" });
    expect(await loadPage("math.ease.json/child", requestUrl, nodeLocals)).toEqual({ status: "missing" });
  });
});

describe("loadPage on Cloudflare", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the content file from the request's own origin", async () => {
    const fetchMock = vi.fn(async () => Response.json(page));
    vi.stubGlobal("fetch", fetchMock);

    const lookup = await loadPage("Math.Ease", requestUrl, cloudflareLocals);

    expect(lookup).toEqual({ status: "found", page });
    expect(fetchMock).toHaveBeenCalledWith("https://gmodwiki.com/content/math.ease.json");
  });

  it("reports a 404 from the origin as missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));

    expect(await loadPage("not_a_page", requestUrl, cloudflareLocals)).toEqual({ status: "missing" });
  });
});
