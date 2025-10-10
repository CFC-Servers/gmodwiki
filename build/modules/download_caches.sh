#!/bin/bash
(curl --location --remote-name https://storage.gmodwiki.com/build_cache.zip && unzip -q build_cache.zip && rm -v build_cache.zip) &
(curl --location --remote-name https://storage.gmodwiki.com/public_cache.zip && unzip -q public_cache.zip && rm -v public_cache.zip) &
wait
