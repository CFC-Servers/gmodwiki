// Finds all individual pages for the website
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import type ApiInterface from "./api_interface.js"

function stripTrailingSlash(url: string) {
    return url.endsWith("/") ? url.slice(0, -1) : url
}

function getSidebarLinks($: any): string[] {
    const sidebar = $("div[id='sidebar']")
    const links = sidebar.find("a")

    const sidebarLinks: string[] = []
    links.each((_: number, link: any) => {
        const href = $(link).attr("href")
        if (href) {
            sidebarLinks.push(stripTrailingSlash(href))
        }
    })

    return [...new Set(sidebarLinks)];
}

export async function getAllPageLinks(api: ApiInterface): Promise<string[]> {
    const index = await api.get("/gmod")
    const $ = cheerio.load(index)

    return getSidebarLinks($)
}
