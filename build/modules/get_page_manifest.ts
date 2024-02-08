// Finds all individual pages for the website
import type ApiInterface from "./api_interface.js"

interface PageResponse {
    address: string;
    updateCount: number;
    viewCount: number;
}

export async function getAllPageLinks(api: ApiInterface): Promise<string[]> {
    const pageList: PageResponse[] = await api.getJSON("/gmod/~pagelist")
    return pageList.map((page) => page.address)
}
