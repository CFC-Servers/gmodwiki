#!/bin/bash

download_cache() {
    local name="$1"

    if ! curl --location --fail --show-error --silent --remote-name "https://storage.gmodwiki.com/${name}"; then
        echo "WARNING: failed to download ${name}, continuing without it"
        return 0
    fi

    # -o: overwrite files WITHOUT prompting
    # -q: quiet mode
    if ! unzip -o -q "${name}"; then
        echo "WARNING: ${name} was corrupt or incomplete, continuing without it"
    fi

    rm -f "${name}"
}

# Embeddings artifact: not bundled in the cache zips (kept out of the Cloudflare
# deploy, like search_index.json). Pull it standalone into public/ so incremental
# builds can reuse the prior vectors. Keep the files (do not delete).
download_embedding() {
    local name="$1"
    mkdir -p public

    if ! curl --location --fail --show-error --silent --output "public/${name}" "https://storage.gmodwiki.com/${name}"; then
        echo "WARNING: failed to download ${name}, continuing without it (a fresh full embed will run)"
        rm -f "public/${name}"
    fi
}

download_cache build_cache.zip &
download_cache public_cache.zip &
download_embedding embeddings.bin &
download_embedding embeddings_manifest.json &
wait
