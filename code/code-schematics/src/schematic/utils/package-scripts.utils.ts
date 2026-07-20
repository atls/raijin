import type { Rule }             from '@angular-devkit/schematics'
import type { SchematicContext } from '@angular-devkit/schematics'
import type { Tree }             from '@angular-devkit/schematics'

import stripJsonComments         from 'strip-json-comments'

const PACKAGE_JSON = 'package.json'
const SERVICE_BUILD_SCRIPT = 'yarn service build'
const SERVICE_DEV_SCRIPT = 'yarn service dev'
const RENDERER_BUILD_SCRIPT = 'yarn renderer build'
const RENDERER_DEV_SCRIPT = 'yarn renderer dev'
const LEGACY_SERVICE_START_SCRIPT = 'yarn node dist/index.js'
const SERVICE_START_SCRIPT = 'yarn service start'
const RENDERER_START_SCRIPT = 'yarn renderer start'

interface PackageJson {
  scripts?: Record<string, string>
}

const serializeJson = (json: unknown): string => `${JSON.stringify(json, null, 2)}\n`

const readPackageJson = (host: Tree, path: string): PackageJson => {
  const buffer = host.read(path)

  if (!buffer) {
    throw new Error(`Cannot find ${path}`)
  }

  return JSON.parse(stripJsonComments(buffer.toString('utf-8'))) as PackageJson
}

const isServiceWorkspaceManifest = (manifest: PackageJson): boolean =>
  manifest.scripts?.build === SERVICE_BUILD_SCRIPT && manifest.scripts.dev === SERVICE_DEV_SCRIPT

const isRendererWorkspaceManifest = (manifest: PackageJson): boolean =>
  manifest.scripts?.build === RENDERER_BUILD_SCRIPT && manifest.scripts.dev === RENDERER_DEV_SCRIPT

const shouldUpdateServiceStartScript = (manifest: PackageJson): boolean =>
  isServiceWorkspaceManifest(manifest) && manifest.scripts?.start === LEGACY_SERVICE_START_SCRIPT

const shouldUpdateRendererStartScript = (manifest: PackageJson): boolean =>
  isRendererWorkspaceManifest(manifest) && manifest.scripts?.start === LEGACY_SERVICE_START_SCRIPT

const updateServiceStartScript = (manifest: PackageJson): PackageJson => ({
  ...manifest,
  scripts: {
    ...manifest.scripts,
    start: SERVICE_START_SCRIPT,
  },
})

const updateRendererStartScript = (manifest: PackageJson): PackageJson => ({
  ...manifest,
  scripts: {
    ...manifest.scripts,
    start: RENDERER_START_SCRIPT,
  },
})

export const updateServiceStartScripts = (): Rule =>
  (host: Tree, context: SchematicContext): Tree => {
    host.visit((path) => {
      if (!path.endsWith(PACKAGE_JSON)) {
        return
      }

      const manifest = readPackageJson(host, path)

      if (!shouldUpdateServiceStartScript(manifest)) {
        if (!shouldUpdateRendererStartScript(manifest)) {
          return
        }

        context.logger.info(`Updating ${path} renderer start script`)
        host.overwrite(path, serializeJson(updateRendererStartScript(manifest)))

        return
      }

      context.logger.info(`Updating ${path} service start script`)
      host.overwrite(path, serializeJson(updateServiceStartScript(manifest)))
    })

    return host
  }
