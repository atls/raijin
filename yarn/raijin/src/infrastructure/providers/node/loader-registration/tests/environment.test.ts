import assert                                 from 'node:assert/strict'
import { execFile }                           from 'node:child_process'
import { mkdtemp }                            from 'node:fs/promises'
import { rm }                                 from 'node:fs/promises'
import { writeFile }                          from 'node:fs/promises'
import { tmpdir }                             from 'node:os'
import { join }                               from 'node:path'
import { test }                               from 'node:test'
import { pathToFileURL }                      from 'node:url'
import { promisify }                          from 'node:util'

import { LOADER }                             from '../environment.js'
import { REGISTRATION }                       from '../environment.js'
import { REGISTERED_PNP_LOADER }              from '../environment.js'
import { create as createRegistrationImport } from '../bootstrap.js'
import { applyManagedNodeLoader }             from '../environment.js'
import { isManagedNodeEnvironmentName }       from '../environment.js'
import { removeEnvironmentMarkers }           from '../environment.js'
import { removeAppliedLoaderRegistration }    from '../environment.js'

const execFileAsync = promisify(execFile)

const createLoader = async (directory: string, name: string): Promise<string> => {
  const path = join(directory, name)

  await writeFile(
    path,
    [
      'export const resolve = async (specifier, context, next) => next(specifier, context)',
      'export const load = async (url, context, next) => next(url, context)',
      '',
    ].join('\n')
  )

  return pathToFileURL(path).href
}

const registration = (loader: string): string => createRegistrationImport([loader])

test('should keep one self-owned registration when the managed loader is applied repeatedly', () => {
  const loader = 'file:///tmp/managed-loader.mjs'
  const environment: NodeJS.ProcessEnv = {
    [LOADER]: loader,
    NODE_OPTIONS: '--trace-warnings',
  }

  applyManagedNodeLoader(environment)
  applyManagedNodeLoader(environment)

  assert.equal(environment.NODE_OPTIONS, `--trace-warnings --import ${registration(loader)}`)
  assert.equal(environment[REGISTRATION], `--import ${registration(loader)}`)
})

test('should replace the previous self-owned registration and preserve foreign registrations', () => {
  const oldLoader = 'file:///tmp/old-loader.mjs'
  const newLoader = 'file:///tmp/new-loader.mjs'
  const foreignLoader = 'file:///tmp/foreign-loader.mjs'
  const environment: NodeJS.ProcessEnv = {
    [LOADER]: oldLoader,
    NODE_OPTIONS: `--import ${registration(foreignLoader)}`,
  }

  applyManagedNodeLoader(environment)
  environment[LOADER] = newLoader
  applyManagedNodeLoader(environment)

  assert.equal(
    environment.NODE_OPTIONS,
    `--import ${registration(foreignLoader)} --import ${registration(newLoader)}`
  )
  assert.equal(environment[REGISTRATION], `--import ${registration(newLoader)}`)
  assert.ok(!environment.NODE_OPTIONS.includes(encodeURIComponent(oldLoader)))
})

test('should preserve caller node options byte-for-byte while rotating its owned registration', () => {
  const oldLoader = 'file:///tmp/old-loader.mjs'
  const newLoader = 'file:///tmp/new-loader.mjs'
  const foreignLoader = 'file:///tmp/foreign-loader.mjs'
  const callerNodeOptions = `--title="caller  value"   --trace-warnings='kept value'  --import=${registration(foreignLoader)}`
  const environment: NodeJS.ProcessEnv = {
    [LOADER]: oldLoader,
    NODE_OPTIONS: callerNodeOptions,
  }

  applyManagedNodeLoader(environment)
  environment.NODE_OPTIONS = `${environment.NODE_OPTIONS}  --conditions=yarn`
  environment[LOADER] = newLoader
  applyManagedNodeLoader(environment)

  assert.equal(
    environment.NODE_OPTIONS,
    `${callerNodeOptions}  --conditions=yarn --import ${registration(newLoader)}`
  )
})

test('should preserve an identical caller-owned registration', () => {
  const loader = 'file:///tmp/shared-loader.mjs'
  const callerNodeOptions = `--import ${registration(loader)}`
  const environment: NodeJS.ProcessEnv = {
    [LOADER]: loader,
    NODE_OPTIONS: callerNodeOptions,
  }

  applyManagedNodeLoader(environment)
  Reflect.deleteProperty(environment, LOADER)
  applyManagedNodeLoader(environment)

  assert.deepEqual(environment, { NODE_OPTIONS: callerNodeOptions })
})

test('should remove a previous self-owned registration when the managed loader is cleared', () => {
  const loader = 'file:///tmp/managed-loader.mjs'
  const environment: NodeJS.ProcessEnv = {
    [LOADER]: loader,
    NODE_OPTIONS: '--trace-warnings',
  }

  applyManagedNodeLoader(environment)
  Reflect.deleteProperty(environment, LOADER)
  applyManagedNodeLoader(environment)

  assert.deepEqual(environment, { NODE_OPTIONS: '--trace-warnings' })
})

test('should canonicalize and replace mixed-case Windows managed loader state', () => {
  const oldLoader = 'file:///C:/temp/old-loader.mjs'
  const newLoader = 'file:///C:/temp/new-loader.mjs'
  const environment = {
    RAIJIN_NODE_LOADER: oldLoader,
    Raijin_Node_Loader: newLoader,
    Raijin_Node_Loader_Registration: `--import ${registration(oldLoader)}`,
    Node_Options: `--trace-warnings --import ${registration(oldLoader)}`,
  }

  applyManagedNodeLoader(environment, 'win32')

  assert.deepEqual(environment, {
    NODE_OPTIONS: `--trace-warnings --import ${registration(newLoader)}`,
    RAIJIN_NODE_LOADER: newLoader,
    RAIJIN_NODE_LOADER_REGISTRATION: `--import ${registration(newLoader)}`,
  })
})

test('should match managed environment names using platform semantics', () => {
  assert.equal(isManagedNodeEnvironmentName('Raijin_Node_Loader', 'win32'), true)
  assert.equal(isManagedNodeEnvironmentName('Raijin_Node_Loader', 'linux'), false)
  assert.equal(isManagedNodeEnvironmentName(LOADER, 'linux'), true)
})

test('should remove only managed loader environment markers', () => {
  const environment = {
    [LOADER]: 'file:///tmp/loader.mjs',
    [REGISTRATION]: '--import registration',
    [REGISTERED_PNP_LOADER]: 'file:///tmp/.pnp.loader.mjs',
    NODE_OPTIONS: '--trace-warnings',
    OTHER_VALUE: 'preserved',
  }

  removeEnvironmentMarkers(environment)

  assert.deepEqual(environment, {
    NODE_OPTIONS: '--trace-warnings',
    OTHER_VALUE: 'preserved',
  })
})

test('should remove only exact applied loader registration state', () => {
  const appliedRegistration = '--import file:///tmp/raijin-registration.mjs'
  const foreignRegistration = '--import file:///tmp/foreign-registration.mjs'
  const environment = {
    [LOADER]: 'file:///tmp/loader.mjs',
    [REGISTRATION]: appliedRegistration,
    [REGISTERED_PNP_LOADER]: 'file:///tmp/.pnp.loader.mjs',
    NODE_OPTIONS: `${appliedRegistration}\t--trace-warnings ${foreignRegistration}`,
  }

  removeAppliedLoaderRegistration(environment)

  assert.deepEqual(environment, {
    [LOADER]: 'file:///tmp/loader.mjs',
    NODE_OPTIONS: `--trace-warnings ${foreignRegistration}`,
  })
})

test('should preserve an unrecorded registration', () => {
  const nodeOptions = '--import file:///tmp/foreign-registration.mjs'
  const environment = { NODE_OPTIONS: nodeOptions }

  removeAppliedLoaderRegistration(environment)

  assert.deepEqual(environment, { NODE_OPTIONS: nodeOptions })
})

test('should start Node after rotating away from a removed loader file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'raijin-loader-transition-'))
  const environment: NodeJS.ProcessEnv = {}

  try {
    const oldLoader = await createLoader(directory, 'old-loader.mjs')
    const newLoader = await createLoader(directory, 'new-loader.mjs')

    environment[LOADER] = oldLoader
    applyManagedNodeLoader(environment)
    await rm(join(directory, 'old-loader.mjs'))
    environment[LOADER] = newLoader
    applyManagedNodeLoader(environment)

    const { stdout } = await execFileAsync(
      process.execPath,
      ['-e', "process.stdout.write('ready')"],
      {
        encoding: 'utf8',
        env: { ...process.env, ...environment },
      }
    )

    assert.equal(stdout, 'ready')
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
})
