import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { spawn }         from 'node:child_process'
import { once }          from 'node:events'
import { access }        from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { get }           from 'node:http'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import test              from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))
const runtime = join(repoRoot, '.yarn/releases/yarn.mjs')

const environment = (): NodeJS.ProcessEnv => {
  const env = { ...process.env }

  delete env.NODE_OPTIONS
  delete env.YARN_VERSION
  delete env.YARN_YARN_PATH
  env.YARN_ENABLE_IMMUTABLE_INSTALLS = 'false'

  return env
}

const run = async (cwd: string, args: Array<string>) =>
  execute(process.execPath, [runtime, ...args], {
    cwd,
    env: environment(),
    maxBuffer: 8 * 1024 * 1024,
  })

const waitForMatch = async (
  child: ReturnType<typeof spawn>,
  pattern: RegExp,
  timeoutMs = 15_000
): Promise<RegExpMatchArray> => {
  let output = ''

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for output matching ${String(pattern)}: ${output}`))
    }, timeoutMs)
    const onData = (chunk: Buffer): void => {
      output += chunk.toString()

      const match = output.match(pattern)

      if (match) {
        clearTimeout(timeout)
        child.stdout?.off('data', onData)
        resolve(match)
      }
    }

    child.stdout?.on('data', onData)
  })
}

const request = async (port: number): Promise<string> =>
  new Promise((resolve, reject) => {
    get({ host: '127.0.0.1', port }, (response) => {
      let body = ''

      response.setEncoding('utf-8')
      response.on('data', (chunk: string) => {
        body += chunk
      })
      response.on('end', () => {
        resolve(body)
      })
    }).on('error', reject)
  })

test(
  'runs build, start, and development through a disposable Yarn PnP consumer',
  { timeout: 120_000 },
  async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'service-consumer-'))
    const archive = join(cwd, 'raijin.tgz')

    await run(repoRoot, ['workspace', '@atls/raijin', 'pack', '--out', archive])

    await mkdir(join(cwd, 'src'))
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({
        name: 'service-consumer',
        private: true,
        type: 'module',
        devDependencies: { '@atls/raijin': `file:${archive}` },
      })
    )
    await writeFile(join(cwd, '.yarnrc.yml'), 'nodeLinker: pnp\npnpEnableEsmLoader: true\n')
    await writeFile(join(cwd, 'src/index.ts'), `process.stdout.write('NON_HTTP_COMPLETE\\n')\n`)

    await run(cwd, ['install'])
    await run(cwd, ['service', 'build'])

    const nonHttp = await run(cwd, ['service', 'start'])

    assert.match(nonHttp.stdout, /NON_HTTP_COMPLETE/)

    const completedArtifact = await readFile(join(cwd, 'dist', 'index.js'), 'utf-8')

    await writeFile(join(cwd, 'src/index.ts'), 'export const invalid = {\n')
    await assert.rejects(run(cwd, ['service', 'build']), { code: 1 })
    assert.equal(await readFile(join(cwd, 'dist', 'index.js'), 'utf-8'), completedArtifact)

    const preserved = await run(cwd, ['service', 'start'])

    assert.match(preserved.stdout, /NON_HTTP_COMPLETE/)

    await writeFile(join(cwd, 'src/index.ts'), `throw new Error('START_FAILURE')\n`)
    await run(cwd, ['service', 'build'])
    await assert.rejects(run(cwd, ['service', 'start']), { code: 1 })

    await writeFile(
      join(cwd, 'src/index.ts'),
      `import { createServer } from 'node:http'

const server = createServer((_request, response) => {
  response.end('HTTP_COMPLETE')
  server.close()
})

server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  process.stdout.write(\`READY:\${typeof address === 'object' && address ? address.port : 0}\\n\`)
})
`
    )
    await run(cwd, ['service', 'build'])

    const started = spawn(process.execPath, [runtime, 'service', 'start'], {
      cwd,
      env: environment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const ready = await waitForMatch(started, /READY:(\d+)/)

    assert.equal(await request(Number(ready[1])), 'HTTP_COMPLETE')

    const [httpExitCode] = (await once(started, 'close')) as [number | null]

    assert.equal(httpExitCode, 0)

    await writeFile(
      join(cwd, 'src/index.ts'),
      `process.stdout.write(JSON.stringify({ body: 'DEV_FIRST', severityNumber: 9 }) + '\\n')
setInterval(() => undefined, 1000)
`
    )

    const development = spawn(process.execPath, [runtime, 'service', 'dev'], {
      cwd,
      env: environment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    try {
      await waitForMatch(development, /DEV_FIRST/)
      await writeFile(
        join(cwd, 'src/index.ts'),
        `process.stdout.write(JSON.stringify({ body: 'DEV_SECOND', severityNumber: 9 }) + '\\n')
setInterval(() => undefined, 1000)
`
      )
      await waitForMatch(development, /DEV_SECOND/)
      development.kill('SIGINT')

      const [developmentExitCode] = (await once(development, 'close')) as [number | null]

      assert.equal(developmentExitCode, 130)
      await assert.rejects(access(join(cwd, '.raijin', 'service', 'development', 'index.js')))
    } finally {
      if (development.exitCode === null) {
        development.kill('SIGKILL')
      }
    }
  }
)
