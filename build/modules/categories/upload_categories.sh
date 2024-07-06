#!/bin/bash

upload() {
  npx wrangler r2 object put "gmodwiki/categories/$1" --file "./public/categories/$1"
}

for file in ./public/categories/*.json; do
  name=$(basename $file)
  echo "Uploading '$name'"
  upload "$name" &
done

wait
