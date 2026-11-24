import { afterEach, describe, expect, it, vi } from "vitest";
import { publicOrigin } from "./public_origin";

const nodeLocals = {};
const cloudflareLocals = { runtime: {} };
const untrustedUrl = new URL("http://localhost/math.ease");

function requestWith(headers: Record<string, string>): Request {
  return new Request(untrustedUrl, { headers });
}

describe("publicOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the request URL on Cloudflare and ignores forwarded headers", () => {
    const request = requestWith({ "x-forwarded-host": "evil.example" });
    const url = new URL("https://gmodwiki.com/math.ease");

    expect(publicOrigin(request, url, cloudflareLocals)).toBe("https://gmodwiki.com");
  });

  it("uses the Host header on the Node build", () => {
    const request = requestWith({ host: "wiki.example.org:8080" });

    expect(publicOrigin(request, untrustedUrl, nodeLocals)).toBe("http://wiki.example.org:8080");
  });

  it("prefers the forwarded host and protocol set by a proxy", () => {
    const request = requestWith({
      host: "internal:4321",
      "x-forwarded-host": "wiki.example.org",
      "x-forwarded-proto": "https",
    });

    expect(publicOrigin(request, untrustedUrl, nodeLocals)).toBe("https://wiki.example.org");
  });

  it("falls back to the Host header when the forwarded host is empty or invalid", () => {
    const emptyForwarded = requestWith({ host: "wiki.example.org", "x-forwarded-host": "" });
    const invalidForwarded = requestWith({ host: "wiki.example.org", "x-forwarded-host": "bad host/<x>" });

    expect(publicOrigin(emptyForwarded, untrustedUrl, nodeLocals)).toBe("http://wiki.example.org");
    expect(publicOrigin(invalidForwarded, untrustedUrl, nodeLocals)).toBe("http://wiki.example.org");
  });

  it("falls back to the request URL when no header holds a valid host", () => {
    const request = requestWith({ host: 'evil.example/"><script>' });

    expect(publicOrigin(request, untrustedUrl, nodeLocals)).toBe("http://localhost");
  });

  it("ignores a forwarded protocol other than http or https", () => {
    const request = requestWith({ host: "wiki.example.org", "x-forwarded-proto": "javascript" });

    expect(publicOrigin(request, untrustedUrl, nodeLocals)).toBe("http://wiki.example.org");
  });

  it("uses PUBLIC_ORIGIN over the request headers and strips a trailing slash", () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://configured.example/");
    const request = requestWith({ host: "evil.example", "x-forwarded-host": "evil.example" });

    expect(publicOrigin(request, untrustedUrl, nodeLocals)).toBe("https://configured.example");
  });
});
