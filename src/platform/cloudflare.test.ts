import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platform } from "./cloudflare";

const page = { title: "math.ease", description: "Easing", html: "<p>content</p>", footer: "1 view<br>" };
const assetsFetch = vi.mocked(env.ASSETS.fetch);

afterEach(() => {
  assetsFetch.mockReset();
  vi.unstubAllGlobals();
});

describe("loadPage", () => {
  it("reads the content file through the assets binding", async () => {
    assetsFetch.mockResolvedValue(Response.json(page));

    expect(await platform.loadPage("math.ease")).toEqual({ status: "found", page });
    expect(assetsFetch).toHaveBeenCalledWith("https://assets.local/content/math.ease.json");
  });

  it("percent-encodes each path segment the way the assets binding stores it", async () => {
    assetsFetch.mockResolvedValue(Response.json(page));

    await platform.loadPage("pages/player:name");

    expect(assetsFetch).toHaveBeenCalledWith("https://assets.local/content/pages/player%3Aname.json");
  });

  it("reports a 404 from the assets binding as missing", async () => {
    assetsFetch.mockResolvedValue(new Response("", { status: 404 }));

    expect(await platform.loadPage("not_a_page")).toEqual({ status: "missing" });
  });

  it("throws on any other failed response", async () => {
    assetsFetch.mockResolvedValue(new Response("", { status: 500 }));

    await expect(platform.loadPage("math.ease")).rejects.toThrow("status 500");
  });
});

describe("publicOrigin", () => {
  it("uses the request URL and ignores forwarded headers", () => {
    const url = new URL("https://gmodwiki.com/math.ease");
    const request = new Request(url, { headers: { "x-forwarded-host": "evil.example" } });

    expect(platform.publicOrigin(request, url)).toBe("https://gmodwiki.com");
  });
});

describe("loadKeywordIndex", () => {
  it("downloads the index from the storage bucket", async () => {
    const keywordIndex = { ease: [["math.ease", "easing functions"]] };
    const fetchMock = vi.fn(async () => Response.json(keywordIndex));
    vi.stubGlobal("fetch", fetchMock);

    expect(await platform.loadKeywordIndex()).toEqual(keywordIndex);
    expect(fetchMock).toHaveBeenCalledWith("https://storage.gmodwiki.com/search_index.json");
  });
});
