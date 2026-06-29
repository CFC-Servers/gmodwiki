#!/bin/bash

# Used to seed the R2 cache with the result of a local build (also useful to external tools)

rm -f public_cache.zip build_cache.zip
zip --recurse-paths -9 --quiet public_cache.zip ./public &
zip --recurse-paths -9 --quiet build_cache.zip ./build/cache &
wait

(npx wrangler r2 object put gmodwiki/public_cache.zip --remote --file ./public_cache.zip && rm -v public_cache.zip) &
(npx wrangler r2 object put gmodwiki/build_cache.zip --remote --file ./build_cache.zip && rm -v build_cache.zip) &
wait

# Purge-a da cache-a 🤌
if [[ -n "$CLOUDFLARE_ZONE_ID" && -n "$CLOUDFLARE_CACHE_API_KEY" ]]; then
    echo "Purging Cloudflare edge cache for cache archives..."
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
        -H "Authorization: Bearer ${CLOUDFLARE_CACHE_API_KEY}" \
        -H "Content-Type: application/json" \
        --data '{"files":["https://storage.gmodwiki.com/public_cache.zip","https://storage.gmodwiki.com/build_cache.zip"]}'
    echo
else
    echo "WARNING: CLOUDFLARE_ZONE_ID / CLOUDFLARE_CACHE_API_KEY not set; skipping edge cache purge."
fi
