#!/usr/bin/env bash
set -e

BUILDER_DIR="${1:-base}"

pack builder create "monstrs/builder-${BUILDER_DIR}:buster" --config "./${BUILDER_DIR}/builder.toml"
