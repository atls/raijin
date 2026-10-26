import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { spawn }         from 'node:child_process'
import { once }          from 'node:events'
import { access }        from 'node:fs/promises'
import { cp }            from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { get }           from 'node:http'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import test              from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))
const runtime = join(repoRoot, '.yarn/releases/yarn.js')

const environment = (): NodeJS.ProcessEnv => {
  const env = { ...process.env }

  delete env.NODE_OPTIONS
  delete env.RAIJIN_NODE_LOADER
  delete env.RAIJIN_NODE_LOADER_REGISTRATION
  delete env.RAIJIN_REGISTERED_PNP_LOADER
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

    await run(cwd, ['add', 'react@18.3.1'])
    await writeFile(
      join(cwd, 'src/index.ts'),
      `const { default: React } = await import('react')

process.stdout.write(\`STANDALONE_READY:\${React.createElement('div').type}\\n\`)
`
    )
    await run(cwd, ['service', 'build', '--standalone'])

    const standaloneDir = await mkdtemp(join(tmpdir(), 'service-standalone-'))
    const standaloneDist = join(standaloneDir, 'dist')

    await writeFile(join(standaloneDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
    await cp(join(cwd, 'dist'), standaloneDist, { recursive: true })

    const standalone = await execute(process.execPath, ['index.js'], {
      cwd: standaloneDist,
      env: environment(),
    })

    assert.match(standalone.stdout, /STANDALONE_READY:div/)
  }
)

test(
  'starts two service workspaces with one root runtime after production focus',
  { timeout: 180_000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'service-production-'))
    const archive = join(directory, 'raijin.tgz')

    try {
      await run(repoRoot, ['workspace', '@atls/raijin', 'pack', '--out', archive])

      for await (const nodeLinker of ['pnp', 'node-modules']) {
        const cwd = join(directory, nodeLinker)
        const consumerRuntime = join(cwd, '.yarn', 'releases', 'yarn.js')
        const runConsumer = async (args: Array<string>, executionCwd = cwd) =>
          execute(process.execPath, [consumerRuntime, ...args], {
            cwd: executionCwd,
            env: environment(),
            maxBuffer: 8 * 1024 * 1024,
            timeout: 60_000,
          })

        await mkdir(join(cwd, '.yarn', 'releases'), { recursive: true })
        await cp(runtime, consumerRuntime)
        await writeFile(
          join(cwd, 'package.json'),
          JSON.stringify({
            name: 'service-platform',
            private: true,
            type: 'module',
            workspaces: ['services/*'],
            dependencies: { '@atls/raijin': `file:${archive}` },
          })
        )
        await writeFile(
          join(cwd, '.yarnrc.yml'),
          `nodeLinker: ${nodeLinker}\npnpEnableEsmLoader: true\nyarnPath: .yarn/releases/yarn.js\n`
        )

        for await (const name of ['first', 'second']) {
          const workspace = join(cwd, 'services', name)

          await mkdir(join(workspace, 'src'), { recursive: true })
          await writeFile(
            join(workspace, 'package.json'),
            JSON.stringify({
              name: `@service/${name}`,
              private: true,
              type: 'module',
              scripts: {
                build: 'yarn service build --standalone',
                start: 'yarn service start',
              },
            })
          )
          await writeFile(
            join(workspace, 'src', 'index.ts'),
            `import { createServer } from 'node:http'

const server = createServer((_request, response) => {
  response.end('${name}')
  server.close()
})

server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  process.stdout.write(\`READY:\${typeof address === 'object' && address ? address.port : 0}\\n\`)
})
`
          )
        }

        await runConsumer(['install'])

        for await (const name of ['first', 'second']) {
          await runConsumer(['workspace', `@service/${name}`, 'run', 'build'])
        }

        await runConsumer(['workspaces', 'focus', '--production', '@service/first'])
        await assert.rejects(runConsumer(['run', 'start'], join(cwd, 'services', 'first')), {
          code: 1,
        })

        for await (const name of ['first', 'second']) {
          await runConsumer([
            'workspaces',
            'focus',
            '--production',
            'service-platform',
            `@service/${name}`,
          ])

          const started = spawn(process.execPath, [consumerRuntime, 'run', 'start'], {
            cwd: join(cwd, 'services', name),
            env: environment(),
            stdio: ['ignore', 'pipe', 'pipe'],
          })
          const completed = once(started, 'close')

          try {
            const ready = await waitForMatch(started, /READY:(\d+)/)

            assert.equal(await request(Number(ready[1])), name)

            const [exitCode] = (await completed) as [number | null]

            assert.equal(exitCode, 0)
          } finally {
            if (started.exitCode === null) {
              started.kill('SIGKILL')
              await completed
            }
          }
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }
)
