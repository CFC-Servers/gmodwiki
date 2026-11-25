import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platform } from "./node";

const page = { title: "math.ease", description: "Easing", html: "<p>content</p>", footer: "1 view<br>" };

describe("loadPage", () => {
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

  it("reads the page from the content directory", async () => {
    expect(await platform.loadPage("math.ease")).toEqual({ status: "found", page });
  });

  it("reports a page with no content file as missing", async () => {
    expect(await platform.loadPage("not_a_page")).toEqual({ status: "missing" });
  });

  it("refuses slugs that climb out of the content directory", async () => {
    expect(await platform.loadPage("../secret")).toEqual({ status: "missing" });
    expect(await platform.loadPage("..\\secret")).toEqual({ status: "missing" });
    expect(await platform.loadPage("nested/../../secret")).toEqual({ status: "missing" });
  });

  it("reports slugs the filesystem cannot open as missing", async () => {
    const overlongSlug = "a".repeat(300);

    expect(await platform.loadPage(overlongSlug)).toEqual({ status: "missing" });
    expect(await platform.loadPage("math.ease.json/child")).toEqual({ status: "missing" });
  });
});

const untrustedUrl = new URL("http://localhost/math.ease");

function requestWith(headers: Record<string, string>): Request {
  return new Request(untrustedUrl, { headers });
}

describe("publicOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the Host header", () => {
    const request = requestWith({ host: "wiki.example.org:8080" });

    expect(platform.publicOrigin(request, untrustedUrl)).toBe("http://wiki.example.org:8080");
  });

  it("prefers the forwarded host and protocol set by a proxy", () => {
    const request = requestWith({
      host: "internal:4321",
      "x-forwarded-host": "wiki.example.org",
      "x-forwarded-proto": "https",
    });

    expect(platform.publicOrigin(request, untrustedUrl)).toBe("https://wiki.example.org");
  });

  it("falls back to the Host header when the forwarded host is empty or invalid", () => {
    const emptyForwarded = requestWith({ host: "wiki.example.org", "x-forwarded-host": "" });
    const invalidForwarded = requestWith({ host: "wiki.example.org", "x-forwarded-host": "bad host/<x>" });

    expect(platform.publicOrigin(emptyForwarded, untrustedUrl)).toBe("http://wiki.example.org");
    expect(platform.publicOrigin(invalidForwarded, untrustedUrl)).toBe("http://wiki.example.org");
  });

  it("falls back to the request URL when no header holds a valid host", () => {
    const request = requestWith({ host: 'evil.example/"><script>' });

    expect(platform.publicOrigin(request, untrustedUrl)).toBe("http://localhost");
  });

  it("ignores a forwarded protocol other than http or https", () => {
    const request = requestWith({ host: "wiki.example.org", "x-forwarded-proto": "javascript" });

    expect(platform.publicOrigin(request, untrustedUrl)).toBe("http://wiki.example.org");
  });

  it("uses PUBLIC_ORIGIN over the request headers and strips a trailing slash", () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://configured.example/");
    const request = requestWith({ host: "evil.example", "x-forwarded-host": "evil.example" });

    expect(platform.publicOrigin(request, untrustedUrl)).toBe("https://configured.example");
  });
});
