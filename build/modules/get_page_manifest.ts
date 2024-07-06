// Finds all individual pages for the website
import * as cheerio from "cheerio"
import type ApiInterface from "./api_interface.js"

interface PagelistResponse {
    address: string;
    updateCount: number;
    viewCount: number;
}

export async function getAllPageLinks(api: ApiInterface): Promise<string[]> {
    const pageList: PagelistResponse[] = await api.getJSON("/gmod/~pagelist")
    return pageList.map((page) => page.address)
}


interface PagePreviewResponse {
    status: string;
    html: string;
    title?: string;
}
export type WikiCategory = "Global" | "classfunc" | "libraryfunc" | "hook" | "panelfunc" | "enum" | "struct"

export async function getAllPagesForCategory(api: ApiInterface, category: WikiCategory, filter?: string): Promise<string[]> {
    const filterParam = filter ? `filter=${filter}`: ""
    const element = `<pagelist category="${category}" ${filterParam}></pagelist>`
    const body = { text: element, realm: "gmod" }

    const response: PagePreviewResponse = await api.postJSON("/api/page/preview", body)
    const { html } = response

    const $ = cheerio.load(html)
    const hrefs: string[] = []

    $("a[href]").each((_: number, elem: cheerio.Element) => {
        const href = $(elem).attr("href")
        if (href) {
            hrefs.push(href)
        }
    })

    return hrefs
}
