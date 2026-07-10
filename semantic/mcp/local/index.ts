#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { promises as fs } from "fs";
import path from "path";
import { registerTools, SERVER_INSTRUCTIONS } from "../../core/tools.js";
import { pageToContent } from "../../core/page.js";
import { semanticSearch } from "../../core/search.js";
import { LocalEmbedder } from "../../adapters/local/embedder.js";
import { LocalVectorStore } from "../../adapters/local/store.js";

const BIN = process.env.EMBEDDINGS_BIN ?? "./public/embeddings.bin";
const MANIFEST = process.env.EMBEDDINGS_MANIFEST ?? "./public/embeddings_manifest.json";
const CONTENT_DIR = process.env.CONTENT_DIR ?? "./public/content";

async function main() {
  const embedder = new LocalEmbedder();
  const store = await LocalVectorStore.load(BIN, MANIFEST);

  const search = (query: string, k: number) =>
    semanticSearch(query, k, { embedder, store, meta: (id) => store.meta(id) });

  const getPage = async (address: string) => {
    try {
      const raw = await fs.readFile(path.join(CONTENT_DIR, `${address.toLowerCase()}.json`), "utf8");
      const page: any = JSON.parse(raw);
      return { title: page.title, content: pageToContent(page.html) };
    } catch {
      return null;
    }
  };

  const server = new McpServer({ name: "gmodwiki", version: "1.0.0" }, { instructions: SERVER_INSTRUCTIONS });
  registerTools(server, { search, getPage });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("gmodwiki MCP (local) ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
