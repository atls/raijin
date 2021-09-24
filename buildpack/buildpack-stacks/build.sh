#!/usr/bin/env bash
set -e

ID_PREFIX="tech.atls.stacks"

DEFAULT_PREFIX=atls/stack

REPO_PREFIX=${DEFAULT_PREFIX}

STACK_DIR="${1:-node}"
DIR=$(cd $(dirname $0) && pwd)
IMAGE_DIR="${DIR}/${STACK_DIR}"
TAG=$(basename "${IMAGE_DIR}")
STACK_ID="${ID_PREFIX}.$(basename "${IMAGE_DIR}")"
BASE_IMAGE=${REPO_PREFIX}-${TAG}:base
RUN_IMAGE=${REPO_PREFIX}-${TAG}:run
BUILD_IMAGE=${REPO_PREFIX}-${TAG}:build

if [[ -d "${IMAGE_DIR}/base" ]]; then
  docker build -t "${BASE_IMAGE}" "${IMAGE_DIR}/base"
fi

echo "BUILDING ${BUILD_IMAGE}..."
docker build --build-arg "base_image=${BASE_IMAGE}" --build-arg "stack_id=${STACK_ID}" -t "${BUILD_IMAGE}"  "${IMAGE_DIR}/build"

echo "BUILDING ${RUN_IMAGE}..."
docker build --build-arg "base_image=${BASE_IMAGE}" --build-arg "stack_id=${STACK_ID}" -t "${RUN_IMAGE}" "${IMAGE_DIR}/run"

echo
echo "STACK BUILT!"
echo
echo "Stack ID: ${STACK_ID}"
echo "Images:"
for IMAGE in "${BASE_IMAGE}" "${BUILD_IMAGE}" "${RUN_IMAGE}"; do
  echo "    ${IMAGE}"
done
