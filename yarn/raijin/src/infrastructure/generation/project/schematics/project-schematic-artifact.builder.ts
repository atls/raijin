import type { BuildOptions } from 'esbuild'

import type { BuildProjectSchematicArtifactOptions } from './project-schematic-artifact.builder.interfaces.js'

import { cp }                from 'node:fs/promises'
import { mkdir }             from 'node:fs/promises'
import { rm }                from 'node:fs/promises'
import { join }              from 'node:path'

import { pnpPlugin }         from '@yarnpkg/esbuild-plugin-pnp'
import esbuild               from 'esbuild'

const COLLECTION_SOURCE_PATH = join(
  'src',
  'infrastructure',
  'generation',
  'project',
  'schematics',
  'collection'
)
const COMPILED_FACTORY_PATH = join(
  'dist',
  'infrastructure',
  'generation',
  'project',
  'schematics',
  'project-schematic.factory.js'
)
const PROJECT_GENERATION_ARTIFACT_PATH = join('dist', 'generation', 'project', 'collection')
const PROJECT_SCHEMATIC_BUILD_CONDITION = 'raijin-project-schematic-build'

const createProjectSchematicBuildOptions = (
  factoryPath: string,
  outputDirectory: string
): BuildOptions => ({
  bundle: true,
  conditions: [PROJECT_SCHEMATIC_BUILD_CONDITION],
  entryPoints: [factoryPath],
  external: ['node:*'],
  format: 'cjs',
  logLevel: 'error',
  outfile: join(outputDirectory, 'project/project.factory.cjs'),
  platform: 'node',
  plugins: [pnpPlugin()],
  sourcemap: false,
  target: 'node18',
})

export const buildProjectSchematicArtifact = async ({
  packageRoot,
}: BuildProjectSchematicArtifactOptions): Promise<void> => {
  const collectionSource = join(packageRoot, COLLECTION_SOURCE_PATH)
  const factoryPath = join(packageRoot, COMPILED_FACTORY_PATH)
  const outputDirectory = join(packageRoot, PROJECT_GENERATION_ARTIFACT_PATH)

  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  await cp(collectionSource, outputDirectory, { recursive: true })
  await esbuild.build(createProjectSchematicBuildOptions(factoryPath, outputDirectory))
}
