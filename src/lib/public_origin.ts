import type { APIContext } from "astro";
import { runsOnCloudflare } from "./runtime";

const hostPattern = /^([a-z0-9.-]+|\[[0-9a-f:]+\])(:\d+)?$/i;
const allowedProtocols = new Set(["http", "https"]);

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

export function publicOrigin(
  request: Request,
  url: URL,
  locals: APIContext["locals"],
): string {
  if (runsOnCloudflare(locals)) return url.origin;

  return configuredOrigin() ?? originFromRequestHeaders(request, url);
}
