import { z } from "zod";
import type { PageGetter, SearchResult } from "./types.js";

export const SERVER_INSTRUCTIONS = `Semantic search over the Garry's Mod Lua API wiki (gmodwiki.com), a mirror of Facepunch's official GMod developer documentation.

Use this to answer questions about GMod Lua scripting — functions, hooks, classes, methods, enums, structs, and libraries.

Workflow:
1. Call \`search_wiki\` with a natural-language description of what you're trying to do (e.g. "make a player take damage") to discover relevant pages.
2. Each result has an \`address\` — pass it to \`get_page\` to read the full documentation (arguments, return values, examples).

Page addresses look like: \`Player:Say\` (a method on the Player class), \`Global.print\` (a global function), \`GM:PlayerSpawn\` (a gamemode hook), \`Entity\` (a class), or \`ENUM_NAME\` (an enum). Prefer searching to find the right address rather than guessing it.`;

export function registerTools(
  server: { tool: (name: string, description: string, schema: any, handler: any) => void },
  deps: {
    search: (query: string, k: number) => Promise<SearchResult[]>;
    getPage: PageGetter;
  },
): void {
  server.tool(
    "search_wiki",
    "Semantically search the Garry's Mod Lua API wiki for functions, hooks, classes, methods, enums, and libraries. Best with a natural-language description of the task (e.g. \"make a player say something in chat\"). Returns ranked pages, each with an `address` (pass to get_page for full docs), `title`, `url`, and a `snippet`.",
    {
      query: z.string().describe("Natural-language description of what you want to do, or a keyword (e.g. 'damage a player', 'PlayerSpawn hook')"),
      k: z.number().min(1).max(50).default(8).describe("Number of results to return"),
    },
    async ({ query, k }: { query: string; k: number }) => {
      const results = await deps.search(query, k);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  server.tool(
    "get_page",
    "Fetch the full documentation text for a Garry's Mod wiki page by its address (arguments, return values, description, examples). Get the address from search_wiki results.",
    { address: z.string().describe("Page address from a search_wiki result, e.g. 'Player:Say', 'Global.print', 'GM:PlayerSpawn'") },
    async ({ address }: { address: string }) => {
      const page = await deps.getPage(address);
      if (!page) {
        return { content: [{ type: "text", text: `No page found for '${address}'` }], isError: true };
      }
      return { content: [{ type: "text", text: `# ${page.title}\n\n${page.content}` }] };
    },
  );
}
