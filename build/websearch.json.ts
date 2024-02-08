export async function GET({ params, request }) {
    const url = new URL(request.url)

    const query = url.searchParams.get("query")
    if (!query || query.length == 0) return new Response("No query provided", { status: 400 })
    const normalized = query.toLowerCase()

    const domain = url.host
    let indexUrl = `${url.origin}/search_index.json`
    if (domain === "gmodwiki.com") {
        indexUrl = "https://storage.gmodwiki.com/search_index.json"
    }

    const response = await fetch(indexUrl)
    const index: any = await response.json()

    const results = index[normalized]
    return new Response(JSON.stringify(results || []));
}
