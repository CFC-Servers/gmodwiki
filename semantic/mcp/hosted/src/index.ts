import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, SERVER_INSTRUCTIONS } from "../../../core/tools.js";
import { pageToContent } from "../../../core/page.js";
import { semanticSearch } from "../../../core/search.js";
import { HostedEmbedder } from "../../../adapters/hosted/embedder.js";
import { HostedVectorStore } from "../../../adapters/hosted/store.js";
import type { SearchResult } from "../../../core/types.js";

interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

export class GmodWikiMCP extends McpAgent<Env> {
  server = new McpServer({ name: "gmodwiki", version: "1.0.0" }, { instructions: SERVER_INSTRUCTIONS });

  async init() {
    const embedder = new HostedEmbedder(this.env.AI);
    const store = new HostedVectorStore(this.env.VECTORIZE);

    const search = (query: string, k: number): Promise<SearchResult[]> =>
      semanticSearch(query, k, {
        embedder,
        store,
        // Vectorize returns metadata; we re-query for it inside the store if needed.
        // Here we fetch metadata directly from the match via a thin wrapper:
        meta: (id) => ({ title: id, url: "/" + id, snippet: "" }),
      });

    const getPage = async (address: string) => {
      const res = await fetch(`https://gmodwiki.com/content/${address.toLowerCase()}.json`);
      if (!res.ok) return null;
      const page: any = await res.json();
      return { title: page.title, content: pageToContent(page.html) };
    };

    registerTools(this.server, { search, getPage });
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return GmodWikiMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return GmodWikiMCP.serve("/mcp").fetch(request, env, ctx);
    }
    return new Response("gmodwiki MCP server. Connect via /mcp or /sse.", { status: 200 });
  },
};
