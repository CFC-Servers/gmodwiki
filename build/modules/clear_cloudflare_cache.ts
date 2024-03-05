import ky from "ky"
import { promises as fs } from "fs"

// When clear_recent_changes finishes, it creates a deleted_files.json
// This is just an array with the paths of the files that were deleted (and subsequently regenerated if we built again)
// We need to convert that array to an array of URLs that we can use to clear the Cloudflare Cache
// Then we'll make a request to the Cloudflare API to clear the cache for those URLs


const readDeletedFiles = async () => {
  const content = await fs.readFile("deleted_files.json", "utf-8")
  return JSON.parse(content)
}

const translatePaths = (paths: string[]) => {
  const adjusted = paths.flatMap((path) => {
    // "./build/cache/gmod/Beginner_Tutorial_Variables.json"

    // "./build/cache/gmod/beginner_tutorial_variables.json"
    path = path.toLowerCase()

    // "beginner_tutorial_variables.json"
    path = path.replace("./build/cache/gmod/", "")

    // "beginner_tutorial_variables"
    path = path.replace(".json", "")

    // We clear both the content JSON and the page itself
    return [
      `https://gmodwiki.com/content/${path}.json`,
      `https://gmodwiki.com/${path}`,
    ]
  })

  return adjusted
}

const addStaticPaths = (paths: string[]) => {
  paths.push(
    "https://gmodwiki.com/darkmode.js",
    "https://gmodwiki.com/script.js",
    "https://gmodwiki.com/styles/gmod.css",
  )
}


const clearCache = async (urls: string[]) => {
  const zoneID = process.env.CLOUDFLARE_ZONE_ID;
  const apiKey = process.env.CLOUDFLARE_CACHE_API_KEY;

  console.log("Clearing Cloudflare Cache...");
  
  // We have to clean in batches of 30
  for (let i = 0; i < urls.length; i += 30) {
    const batch = urls.slice(i, i + 30);
    console.log(`Purging URLs from ${i} to ${i + batch.length - 1}:`, batch);

    try {
      await ky.post(`https://api.cloudflare.com/client/v4/zones/${zoneID}/purge_cache`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        json: {
          files: batch,
        },
      })

      console.log(`Purged ${batch.length} URLs successfully.`);
    } catch (error) {
      console.error("Error purging URLs:", error);
    }
  }
}

(async () => {
  console.log("Formatting deleted files...")
  const content = await readDeletedFiles()
  const adjusted = translatePaths(content)
  addStaticPaths(adjusted)

  await clearCache(adjusted)
})()
