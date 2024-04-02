import { CommandContext }         from '@yarnpkg/core'
import { Configuration }          from '@yarnpkg/core'
import { PluginConfiguration }    from '@yarnpkg/core'
import { TelemetryManager }       from '@yarnpkg/core'
import { YarnVersion }            from '@yarnpkg/core'
import { PortablePath }           from '@yarnpkg/fslib'
import { miscUtils }              from '@yarnpkg/core'
import { semverUtils }            from '@yarnpkg/core'
import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'

import { SpawnSyncReturns }       from 'child_process'
import { Cli }                    from 'clipanion'
import { UsageError }             from 'clipanion'
import { execFileSync }           from 'child_process'
import { isCI }                   from 'ci-info'

import { pluginCommands }         from './pluginCommands.js'
import { getPluginConfiguration } from './tools/getPluginConfiguration.js'

export type YarnCli = ReturnType<typeof getBaseCli>

function getBaseCli({
  cwd,
  pluginConfiguration,
}: {
  cwd: PortablePath
  pluginConfiguration: PluginConfiguration
}) {
  const cli = new Cli<CommandContext>({
    binaryLabel: `Yarn Package Manager`,
    binaryName: `yarn`,
    binaryVersion: YarnVersion ?? `<unknown>`,
  })

  return Object.assign(cli, {
    defaultContext: {
      ...Cli.defaultContext,
      cwd,
      plugins: pluginConfiguration,
      quiet: false,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    },
  })
}

function validateNodejsVersion(cli: YarnCli) {
  // YARN_IGNORE_NODE is special because this code needs to execute as early as possible.
  // It's not a regular core setting because Configuration.find may use functions not available
  // on older Node versions.
  const ignoreNode = miscUtils.parseOptionalBoolean(process.env.YARN_IGNORE_NODE)
  if (ignoreNode) return true

  const version = process.versions.node

  // Non-exhaustive known requirements:
  // - 18.12 is the first LTS release
  const range = `>=18.12.0`

  if (semverUtils.satisfiesWithPrereleases(version, range)) return true

  const error = new UsageError(
    `This tool requires a Node version compatible with ${range} (got ${version}). Upgrade Node, or set \`YARN_IGNORE_NODE=1\` in your environment.`
  )
  Cli.defaultContext.stdout.write(cli.error(error))

  return false
}

async function getCoreConfiguration({
  selfPath,
  pluginConfiguration,
}: {
  selfPath: PortablePath | null
  pluginConfiguration: PluginConfiguration
}) {
  // Since we only care about a few very specific settings we tolerate extra configuration key.
  // If we didn't, we wouldn't even be able to run `yarn config` (which is recommended in the invalid config error message)
  // eslint-disable-next-line no-return-await
  return await Configuration.find(npath.toPortablePath(process.cwd()), pluginConfiguration, {
    strict: false,
    usePathCheck: selfPath,
  })
}

function runYarnPath(cli: YarnCli, argv: Array<string>, { yarnPath }: { yarnPath: PortablePath }) {
  if (!xfs.existsSync(yarnPath)) {
    cli.error(
      new Error(
        `The "yarn-path" option has been set, but the specified location doesn't exist (${yarnPath}).`
      )
    )
    return 1
  }

  process.on(`SIGINT`, () => {
    // We don't want SIGINT to kill our process; we want it to kill the
    // innermost process, whose end will cause our own to exit.
  })

  const yarnPathExecOptions = {
    stdio: `inherit`,
    env: {
      ...process.env,
      YARN_IGNORE_PATH: `1`,
    },
  } as const

  try {
    execFileSync(process.execPath, [npath.fromPortablePath(yarnPath), ...argv], yarnPathExecOptions)
  } catch (err) {
    return (err as SpawnSyncReturns<void>).status ?? 1
  }

  return 0
}

function checkCwd(cli: YarnCli, argv: Array<string>) {
  let cwd: PortablePath | null = null

  let postCwdArgv = argv
  if (argv.length >= 2 && argv[0] === `--cwd`) {
    cwd = npath.toPortablePath(argv[1])
    postCwdArgv = argv.slice(2)
  } else if (argv.length >= 1 && argv[0].startsWith(`--cwd=`)) {
    cwd = npath.toPortablePath(argv[0].slice(6))
    postCwdArgv = argv.slice(1)
  } else if (argv[0] === `add` && argv[argv.length - 2] === `--cwd`) {
    // CRA adds `--cwd` at the end of the command; it's not ideal, but since
    // it's unlikely to receive more releases we can just special-case it
    // TODO v5: remove this special case
    cwd = npath.toPortablePath(argv[argv.length - 1])
    postCwdArgv = argv.slice(0, argv.length - 2)
  }

  // eslint-disable-next-line no-param-reassign
  cli.defaultContext.cwd = cwd !== null ? ppath.resolve(cwd) : ppath.cwd()

  return postCwdArgv
}

function initTelemetry(cli: YarnCli, { configuration }: { configuration: Configuration }) {
  const isTelemetryEnabled = configuration.get(`enableTelemetry`)
  if (!isTelemetryEnabled || isCI || !process.stdout.isTTY) return

  Configuration.telemetry = new TelemetryManager(
    configuration,
    `puba9cdc10ec5790a2cf4969dd413a47270`
  )

  const PLUGIN_REGEX = /^@yarnpkg\/plugin-(.*)$/

  for (const name of configuration.plugins.keys())
    if (pluginCommands.has(name.match(PLUGIN_REGEX)?.[1] ?? ``))
      Configuration.telemetry?.reportPluginName(name)

  if (cli.binaryVersion) {
    Configuration.telemetry.reportVersion(cli.binaryVersion)
  }
}

function initCommands(cli: YarnCli, { configuration }: { configuration: Configuration }) {
  for (const plugin of configuration.plugins.values()) {
    for (const command of plugin.commands || []) {
      cli.register(command)
    }
  }
}

async function run(
  cli: YarnCli,
  argv: Array<string>,
  {
    selfPath,
    pluginConfiguration,
  }: {
    selfPath: PortablePath | null
    pluginConfiguration: PluginConfiguration
  }
) {
  if (!validateNodejsVersion(cli)) return 1

  const configuration = await getCoreConfiguration({
    selfPath,
    pluginConfiguration,
  })

  const yarnPath = configuration.get(`yarnPath`)
  const ignorePath = configuration.get(`ignorePath`)

  if (yarnPath && !ignorePath) return runYarnPath(cli, argv, { yarnPath })

  delete process.env.YARN_IGNORE_PATH

  const postCwdArgv = checkCwd(cli, argv)

  initTelemetry(cli, { configuration })
  initCommands(cli, { configuration })

  const command = cli.process(postCwdArgv, cli.defaultContext)

  if (!command.help) Configuration.telemetry?.reportCommandName(command.path.join(` `))

  // eslint-disable-next-line no-return-await
  return await cli.run(command, cli.defaultContext)
}

export async function getCli({
  cwd = ppath.cwd(),
  pluginConfiguration,
}: { cwd?: PortablePath; pluginConfiguration?: PluginConfiguration } = {}) {
  const pc = pluginConfiguration ? pluginConfiguration : await getPluginConfiguration()

  const cli = getBaseCli({ cwd, pluginConfiguration: pc })

  const configuration = await getCoreConfiguration({
    pluginConfiguration: pc,
    selfPath: null,
  })

  initCommands(cli, { configuration })

  return cli
}

export async function runExit(
  argv: Array<string>,
  {
    cwd = ppath.cwd(),
    selfPath,
    pluginConfiguration,
  }: { cwd: PortablePath; selfPath: PortablePath | null; pluginConfiguration: PluginConfiguration }
) {
  const cli = getBaseCli({ cwd, pluginConfiguration })

  try {
    process.exitCode = await run(cli, argv, { selfPath, pluginConfiguration })
  } catch (error) {
    Cli.defaultContext.stdout.write(cli.error(error))
    process.exitCode = 1
  } finally {
    await xfs.rmtempPromise()
  }
}
