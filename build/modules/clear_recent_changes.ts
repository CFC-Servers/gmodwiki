import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import ApiInterface from "./api_interface.js"

const fileExists = async (path: string) => {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

// Stores a UTC timestamp of the last build
const getLastBuildTime = async () => {
  const lastBuildPath = "public/last_build.txt"
  if (!fileExists(lastBuildPath)) {
    return 0
  }

  const lastBuildTime = await fs.readFile(lastBuildPath, "utf8")
  return parseInt(lastBuildTime, 10)
}

const getURLFromRow = ($: cheerio.CheerioAPI, row: cheerio.Element) => {
  return $(row).find("div.address a").attr("href")
}

const getChangedPages = async ($: cheerio.CheerioAPI, since: number) => {
  const changedPages = new Map<string, boolean>()

  const holder = $("table.changelist tbody")
  const rows = holder.find("tr")

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowClass = row.attribs.class

    if (rowClass === "entry") {
      const timeHolder = $(row).find("div.address a")
      const rowTime = timeHolder.attr("title")

      if (!rowTime) {
        console.error("No time found", $(row).html())
        continue
      }

      const parsedTime = new Date(rowTime).getTime()
      if (parsedTime < since) {
        console.log(`Found all updated page, stopping before: '${rowTime}'`)
        break
      }

      // If we're at an entry, add it to our list
      const url = getURLFromRow($, row)

      if (url) {
        changedPages.set(url, true)
      } else {
        console.error("No url found", $(row).html())
      }
    }
  }

  return Array.from(changedPages.keys())
}

const urlPathToFile = (url: string) => {
  return `./build/cache${url}.json`
}

const convertURLsToFiles = (urls: string[]) => {
  return urls.map(urlPathToFile)
}

const deleteFiles = async (files: string[]) => {
  let successful = 0

  for (const filePath of files) {
    if (!await fileExists(filePath)) {
      continue
    }

    try {
      await fs.unlink(filePath)
      console.log("Deleted", filePath)
      successful++
    } catch (e) {
      console.error(e)
    }
  }

  return successful
}

const saveDeletedFiles = async (files: string[]) => {
  const content = JSON.stringify(files, null)
  await fs.writeFile("deleted_files.json", content)
}

(async () => {
  const lastBuildTime = await getLastBuildTime()
  if (lastBuildTime === 0) {
    console.error("No last build time found - skipping deletion of recent changes")
    return
  }

  console.log("Last build time: ", lastBuildTime)

  const siteURL = "https://wiki.facepunch.com"
  const api = new ApiInterface(siteURL)

  // Skip the cache but still use the API interface
  const rawPage = await api._get(`${siteURL}/gmod/~recentchanges`)
  const pageContent = await rawPage.text()
  const $ = cheerio.load(pageContent)

  const changes = await getChangedPages($, lastBuildTime)
  const changedPaths = convertURLsToFiles(changes)
  await saveDeletedFiles(changedPaths)
  
  const deletedCount = await deleteFiles(changedPaths)
  console.log("Deleted", deletedCount, "cached files that were changed since", lastBuildTime)
})()
