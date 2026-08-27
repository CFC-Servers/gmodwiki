import type { APIRoute } from "astro";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toReqRes, toFetchResponse } from "fetch-to-node";
import { registerTools, SERVER_INSTRUCTIONS } from "../../semantic/core/tools.js";
import { pageToContent } from "../../semantic/core/page.js";
import { searchWiki } from "../lib/search.js";
import { getCustomPage } from "../lib/db.js";

/**
 * Self-hosted MCP endpoint (streamable HTTP, stateless): connect AI agents to
 * `http://<host>:<port>/mcp`. Replaces the retired Cloudflare Worker deployment.
 */

function buildServer(origin: string): McpServer {
  const server = new McpServer(
    { name: "gmodwiki", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );

  const search = (query: string, k: number) => searchWiki(query, k, origin);

  const getPage = async (address: string) => {
    // Custom pages first, straight from the database (clean HTML without UI chrome)
    try {
      const custom = await getCustomPage(address);
      if (custom) return { title: custom.title, content: pageToContent(custom.html) };
    } catch {
      // database missing is fine — official pages still work
    }

    const res = await fetch(`${origin}/content/${address.toLowerCase()}.json`);
    if (!res.ok) return null;
    const page: any = await res.json();
    return { title: page.title, content: pageToContent(page.html) };
  };

  registerTools(server, { search, getPage, baseUrl: origin });
  return server;
}

export const POST: APIRoute = async ({ request, url }) => {
  const { req, res } = toReqRes(request);

  const server = buildServer(url.origin);
  const transport = new StreamableHTTPServerTransport({
    // Stateless: every request is self-contained, no session tracking
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, await request.json());
    return await toFetchResponse(res);
  } catch (e) {
    console.error("mcp request failed:", e);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
};

// Stateless transport: no server-initiated streams, no sessions to delete.
const methodNotAllowed = () =>
  new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. POST JSON-RPC messages to this endpoint." },
      id: null,
    }),
    { status: 405, headers: { "content-type": "application/json", allow: "POST" } },
  );

export const GET: APIRoute = async () => methodNotAllowed();
export const DELETE: APIRoute = async () => methodNotAllowed();
