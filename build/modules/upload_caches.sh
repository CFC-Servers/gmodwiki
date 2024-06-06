# Used to seed the R2 cache with the result of a local build (for when we need to clear out R2)
zip --recurse-paths -9 --quiet public_cache.zip ./public &
zip --recurse-paths -9 --quiet build_cache.zip ./build/cache &
wait

(npx wrangler r2 object put gmodwiki/public_cache.zip --file ./public_cache.zip && rm -v public_cache.zip) &
(npx wrangler r2 object put gmodwiki/build_cache.zip --file ./build_cache.zip && rm -v build_cache.zip) &
wait
