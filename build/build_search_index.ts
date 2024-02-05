import { promises as fs } from "fs"
import type SearchManager from "./search.js"

const buildContent = (indexValue: string) => `
export const GET = ({ params }) => {
    const query = params.get("query");
    if (!query) return new Response("No query provided", { status: 400 });

    const normalized = query.toLowerCase();
    return new Response(JSON.stringify(index[normalized] || []));
}
`

// Given the search index, builds the search page
export async function buildSearchIndex(searchManager: SearchManager) {
    const index = searchManager.buildIndex()
    const indexValue = JSON.stringify(index)
    const content = buildContent(indexValue)
    await fs.writeFile("src/pages/gmod/websearch.json.ts", content)

    // copy build/search to src/pages/gmod/~search:[query].astro
    await fs.copyFile("build/~search:[query].astro", "src/pages/gmod/~search:[query].astro")
}
