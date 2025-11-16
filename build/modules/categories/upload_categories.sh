#!/bin/bash

upload() {
  npx wrangler r2 object put "gmodwiki/categories/$1" --file "./public/categories/$1"
}

# Manifests
for file in ./public/categories/manifests/*.json; do
  name=$(basename $file)
  echo "Uploading 'manifests/$name'"
  upload "manifests/$name" 
done
wait

# Contents
for file in ./public/categories/contents/*.json; do
  name=$(basename $file)
  echo "Uploading 'contents/$name'"
  upload "contents/$name"
done
wait

# Parsed
for file in ./public/categories/parsed/*.json; do
  name=$(basename $file)
  echo "Uploading 'parsed/$name'"
  upload "parsed/$name"
done
wait

zip --recurse-paths -9 --quiet --junk-paths manifests.zip ./public/categories/manifests &
zip --recurse-paths -9 --quiet --junk-paths contents.zip ./public/categories/contents &
zip --recurse-paths -9 --quiet --junk-paths parsed.zip ./public/categories/parsed &
wait

(npx wrangler r2 object put gmodwiki/categories/manifests/all.zip --remote --file ./manifests.zip && rm -v ./manifests.zip) &
(npx wrangler r2 object put gmodwiki/categories/contents/all.zip --remote --file ./contents.zip && rm -v ./contents.zip) &
(npx wrangler r2 object put gmodwiki/categories/parsed/all.zip --remote --file ./parsed.zip && rm -v ./parsed.zip) &
wait
