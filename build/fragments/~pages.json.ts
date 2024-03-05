import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
    const url = new URL(request.url)

    const tag = url.searchParams.get("tag")
    if (!tag || tag.length == 0) return new Response("No tag provided", { status: 400 })
    const normalized = tag.toLowerCase()

    const domain = url.host
    let indexUrl = `${url.origin}/pages/tag-${normalized}.json`
    if (domain === "gmodwiki.com") {
        indexUrl = `https://storage.gmodwiki.com/pages/tag-${normalized}.json`
    }

    const response = await fetch(indexUrl)
    const results: any = await response.text()

    return new Response(results, {
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
    })
}
