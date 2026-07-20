/* eslint-disable no-await-in-loop, no-console, n/no-process-exit */

import type { PortablePath } from '@yarnpkg/fslib'

import fs                    from 'node:fs/promises'
import os                    from 'node:os'
import path                  from 'node:path'

import { prepareTmpDir }     from '../helpers/index.js'
import { runSchematic }      from '../helpers/index.js'
import { writeTmpSchematic } from '../helpers/index.js'

const requiredGeneratedFiles = [
  '.gitignore',
  '.prettierrc.mjs',
  '.github/workflows/checks.yaml',
  '.github/workflows/preview.yaml',
  '.github/workflows/release.yaml',
  'tsconfig.json',
]

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, 'utf8')) as T

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const findRepoRoot = async (startDir: string): Promise<string> => {
  let currentDir = startDir

  while (currentDir !== path.dirname(currentDir)) {
    if (await pathExists(path.join(currentDir, 'docs/raijin/index.v1.json'))) {
      return currentDir
    }

    currentDir = path.dirname(currentDir)
  }

  throw new Error('Cannot find repository root with docs/raijin/index.v1.json')
}

const writeFixturePackage = async (fixtureDir: string): Promise<void> => {
  const packageJson = {
    name: 'raijin-schematic-smoke-fixture',
    private: true,
    type: 'module',
  }

  await fs.writeFile(
    path.join(fixtureDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`
  )
  await fs.writeFile(path.join(fixtureDir, 'tsconfig.json'), `${JSON.stringify({}, null, 2)}\n`)
}

const prepareCollectionDir = async (repoRoot: string, collectionDir: string): Promise<void> => {
  const previousCwd = process.cwd()
  const collectionPortablePath = collectionDir as PortablePath

  try {
    process.chdir(repoRoot)
    await prepareTmpDir(collectionPortablePath)
  } finally {
    process.chdir(previousCwd)
  }
}

const runProjectSchematic = async ({
  collectionPath,
  fixtureDir,
}: {
  collectionPath: string
  fixtureDir: string
}): Promise<void> => {
  const previousCwd = process.cwd()

  try {
    process.chdir(fixtureDir)

    const exitCode = await runSchematic(
      'project',
      {
        type: 'project',
        cwd: fixtureDir,
      },
      collectionPath
    )

    if (exitCode !== 0) {
      throw new Error(`Schematic workflow failed with exit code ${exitCode}`)
    }
  } finally {
    process.chdir(previousCwd)
  }
}

const assertGeneratedFixture = async (fixtureDir: string): Promise<void> => {
  const missingFiles: Array<string> = []

  for (const relativePath of requiredGeneratedFiles) {
    if (!(await pathExists(path.join(fixtureDir, relativePath)))) {
      missingFiles.push(relativePath)
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Schematic smoke did not generate required files:\n${missingFiles.join('\n')}`)
  }

  const gitignore = await fs.readFile(path.join(fixtureDir, '.gitignore'), 'utf8')

  if (!gitignore.includes('node_modules') || !gitignore.includes('dist/')) {
    throw new Error('Generated .gitignore does not contain expected baseline entries')
  }

  const tsconfig = await readJson<{ compilerOptions?: unknown }>(
    path.join(fixtureDir, 'tsconfig.json')
  )

  if (!tsconfig.compilerOptions || typeof tsconfig.compilerOptions !== 'object') {
    throw new Error('Generated tsconfig.json does not contain compilerOptions')
  }
}

const runSchematicSmoke = async (): Promise<void> => {
  const repoRoot = await findRepoRoot(process.cwd())

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'raijin-schematic-smoke-'))
  const collectionDir = path.join(tmpRoot, 'collection')
  const fixtureDir = path.join(tmpRoot, 'fixture')

  try {
    await fs.mkdir(collectionDir, { recursive: true })
    await fs.mkdir(fixtureDir, { recursive: true })
    await writeFixturePackage(fixtureDir)
    console.log('Schematic smoke: writing collection')
    await writeTmpSchematic(collectionDir as PortablePath)
    console.log('Schematic smoke: preparing collection')
    await prepareCollectionDir(repoRoot, collectionDir)
    console.log('Schematic smoke: running project schematic')
    await runProjectSchematic({
      collectionPath: path.join(collectionDir, 'collection.json'),
      fixtureDir,
    })
    console.log('Schematic smoke: checking fixture')
    await assertGeneratedFixture(fixtureDir)
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true })
  }
}

const main = async (): Promise<number> => {
  try {
    await runSchematicSmoke()
    console.log('Schematic smoke passed')

    return 0
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }

    return 1
  }
}

process.exit(await main())
