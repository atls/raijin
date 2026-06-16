import { arch } from 'node:os'

const DEFAULT_BUILDER_TAG = '24'
const DEFAULT_BUILDPACK_VERSION = '0.1.3'
const DEFAULT_BUILDER_IMAGE = 'atlantislab/builder-base'
const DEFAULT_BUILDPACK_IMAGE = 'ghcr.io/atls/buildpack-yarn-workspace-start'
const DEFAULT_MATERIALIZATION_OS = 'linux'

export interface ImagePackConfiguration {
  buildpack?: string
  buildpackImage?: string
  buildpackVersion?: string
  builder?: string
  builderImage?: string
  builderTag?: string
  require?: Array<string>
}

export const getDefaultMaterializationPlatform = (): string =>
  `${DEFAULT_MATERIALIZATION_OS}/${arch()}`

export const resolveBuildpackReference = ({
  buildpack,
  buildpackImage,
  buildpackVersion,
}: ImagePackConfiguration): string => {
  if (buildpack) {
    return buildpack
  }

  return `${buildpackImage ?? DEFAULT_BUILDPACK_IMAGE}:${
    buildpackVersion ?? DEFAULT_BUILDPACK_VERSION
  }`
}

export const resolveBuilderReference = ({
  builder,
  builderImage,
  builderTag,
}: ImagePackConfiguration): string => {
  if (builder) {
    return builder
  }

  return `${builderImage ?? DEFAULT_BUILDER_IMAGE}:${builderTag ?? DEFAULT_BUILDER_TAG}`
}
