// Finds and builds all individual pages for the website
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import type ApiInterface from "./api_interface.js"

function getSidebar($: any) {
    const sidebar = $("div[id='sidebar']")
    const links = sidebar.find("a")

    const sidebarLinks: string[] = []
    links.each((_: number, link: any) => {
        sidebarLinks.push($(link).attr("href"))
    })

    console.log(sidebarLinks)
}

export async function pages(api: ApiInterface) {
    const index = await api.get("/gmod")
    const $ = cheerio.load(index)

    getSidebar($)
}
