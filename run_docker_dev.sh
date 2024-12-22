#!/bin/bash
DIR="$(realpath "$(dirname "${0}")")"
docker run --rm -it -p 1600-1699:1600-1699 \
-v "${DIR}/zefie_wtvp_minisrv:/workspace" \
node:22-alpine \
node /workspace/app.js
