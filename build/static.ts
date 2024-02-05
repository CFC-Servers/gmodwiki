// Finds, acquires, writes, and stubs any static content found in a given html file
import path from "path"
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import type ApiInterface from "./api_interface.js"

class StaticContentHandler {
    private host: string
    private basePath: string
    private api: ApiInterface
    private cache: Map<string, string>

    constructor(host: string, basePath: string, api: ApiInterface) {
        this.host = host
        this.api = api
        this.cache = new Map()
        this.basePath = basePath
    }

    private async downloadContent(url: string): Promise<string> {
        const resolvedUrl = this.resolveUrl(url)
        console.log(`Downloading static ${resolvedUrl}`)
        if (this.cache.has(resolvedUrl)) {
            return this.cache.get(resolvedUrl)!
        }

        const data = await this.api.getRawFull(resolvedUrl)

        const urlPath = new URL(resolvedUrl).pathname;
        const directoryStructure = path.dirname(urlPath);
        const fullPath = path.join(this.basePath, directoryStructure);
        
        console.log(`Making directory ${fullPath} for static content ${resolvedUrl}`)
        await fs.mkdir(fullPath, { recursive: true });

        const fileName = path.basename(resolvedUrl);
        const filePath = path.join(fullPath, fileName);
        console.log(`Writing static ${fileName} - ${filePath}`)

        await fs.writeFile(filePath, data);

        this.cache.set(resolvedUrl, filePath);
        return filePath;
    }

    private resolveUrl(url: string): string {
        if (url.startsWith('//')) {
            return `https:${url}`
        } else if (url.startsWith('/')) {
            return `${this.host}${url}`
        }
        return url
    }

    private async processHtml(content: string): Promise<string> {
        const $ = cheerio.load(content)

        const promises = $('img[src], link[href], script[src]').map(async (_, element) => {
            const $el = $(element)
            const url = $el.attr('src') || $el.attr('href')
            if (!url) return

            const resolvedUrl = this.resolveUrl(url)
            const localPath = await this.downloadContent(resolvedUrl)
            if (!localPath) return

            const attr = $el.is('link') ? 'href' : 'src'
            $el.attr(attr, path.relative(this.basePath, localPath))
        }).get()

        await Promise.all(promises)
        return $.html()
    }

    private async processCss(content: string): Promise<string> {
        const urlRegex = /url\((?!['"]?:)['"]?([^'")]*)['"]?\)/g
        let modifiedContent = content

        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            const url = match[1]
            if (!url) continue

            const resolvedUrl = this.resolveUrl(url);
            const localPath = await this.downloadContent(resolvedUrl)
            if (!localPath) continue

            modifiedContent = modifiedContent.replace(url, path.relative(this.basePath, localPath))
        }

        return modifiedContent
    }

    public async processContent(content: string, isCss: boolean = false): Promise<string> {
        return isCss ? this.processCss(content) : this.processHtml(content)
    }
}

export default StaticContentHandler
