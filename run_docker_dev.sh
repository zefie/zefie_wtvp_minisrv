#!/bin/bash
DIR="$(realpath "$(dirname "${0}")")"
BUILDDIR="${DIR}/docker-compose/minisrv"

docker build -f "${BUILDDIR}/Dockerfile-dev" -t minisrv-dev:latest "${BUILDDIR}"

if [ "${1}" == "env" ]; then
	shift
	docker run --rm -it -p 1600-1699:1600-1699 \
	-v "${DIR}/zefie_wtvp_minisrv:/workspace" \
	minisrv-dev:latest \
	"${@}"
else
	docker run --rm -it -p 1600-1699:1600-1699 \
	-v "${DIR}/zefie_wtvp_minisrv:/workspace" \
	minisrv-dev:latest \
	node /workspace/app.js
fi
