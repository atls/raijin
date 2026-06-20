import { spawn }                       from 'node:child_process'

import { CodeRuntimeCommandException } from '../exceptions/index.js'

const YARN_EXECUTABLE = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'
const CODE_RUNTIME_PACKAGE = '@atls/code-runtime'
const WRITE_FILES_SCRIPT = `
const { writeFiles } = await import('${CODE_RUNTIME_PACKAGE}')
const [baseDir] = process.argv.slice(1)

await writeFiles(baseDir)
`
const COMPILER_OPTIONS_SCRIPT = `
const { tsConfig } = await import('${CODE_RUNTIME_PACKAGE}')

process.stdout.write(JSON.stringify(tsConfig.compilerOptions))
`

const createProjectEnvironment = (): NodeJS.ProcessEnv => {
  const environment = { ...process.env }

  delete environment.NODE_OPTIONS
  delete environment.YARN_IGNORE_PATH

  return environment
}

const runCodeRuntimeScript = async (cwd: string, script: string, args: Array<string> = []) => {
  const child = spawn(YARN_EXECUTABLE, ['node', '--input-type=module', '-e', script, ...args], {
    cwd,
    env: createProjectEnvironment(),
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const stdoutChunks: Array<Buffer> = []
  const stderrChunks: Array<Buffer> = []

  child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
  child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })

  const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
  const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim()

  if (exitCode !== 0) {
    throw new CodeRuntimeCommandException(stderr || `exit code ${exitCode}`)
  }

  return stdout
}

export const writeCodeRuntimeFiles = async (cwd: string, baseDir: string): Promise<void> => {
  await runCodeRuntimeScript(cwd, WRITE_FILES_SCRIPT, [baseDir])
}

export const getCodeRuntimeCompilerOptions = async (cwd: string): Promise<object> =>
  JSON.parse(await runCodeRuntimeScript(cwd, COMPILER_OPTIONS_SCRIPT)) as object
