import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { loadRuntimeCliSurface } from '../../packages/assembly/scripts/surface/inventory.js'

const repoRoot = process.cwd()

const DOCS_DIR = 'docs/raijin'

/**
 * @typedef {'en' | 'ru'} Language
 * @typedef {Awaited<ReturnType<typeof loadRuntimeCliSurface>>['commands'][number]} RuntimeCommand
 * @typedef {RuntimeCommand & {
 *   availabilityReason: string,
 *   domain: string,
 *   pluginDir: string,
 *   status: 'active' | 'inactive',
 * }} Command
 * @typedef {{
 *   description: string,
 *   group: string,
 *   location: string,
 *   name: string,
 *   private: boolean,
 *   scripts: Array<string>,
 * }} Workspace
 */

/** @param {string} relativePath */
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))

/**
 * @param {string} relativePath
 * @param {string} content
 */
const writeText = (relativePath, content) => {
  const absolutePath = path.join(repoRoot, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, content)
}

/** @param {Array<string>} paths */
const formatGeneratedFiles = (paths) => {
  try {
    execFileSync('yarn', ['format', ...paths], {
      cwd: repoRoot,
      stdio: 'pipe',
    })
  } catch (error) {
    /** @type {{ stderr?: unknown, stdout?: unknown }} */
    const processError = error && typeof error === 'object' ? error : {}
    const stderr =
      typeof processError.stderr === 'string'
        ? processError.stderr
        : Buffer.isBuffer(processError.stderr)
          ? processError.stderr.toString()
          : ''
    const stdout =
      typeof processError.stdout === 'string'
        ? processError.stdout
        : Buffer.isBuffer(processError.stdout)
          ? processError.stdout.toString()
          : ''

    throw new Error(
      ['Failed to format generated files', stderr || stdout || String(error)].join('\n')
    )
  }
}

/** @param {string} value */
const toPosix = (value) => value.split(path.sep).join('/')

/** @param {string} value */
const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')

const WORKSPACE_GROUP_ORDER = [
  'raijin',
  'yarn',
  'plugins',
  'code',
  'config',
  'runtime',
  'webpack',
  'prettier',
  'cli',
  'schematics',
]

const DETAILED_GROUPS = new Set(WORKSPACE_GROUP_ORDER.filter((group) => group !== 'cli'))

/** @param {string} location */
const workspaceGroupFromLocation = (location) => {
  const [root, artifactRole] = location.split('/')

  return root === 'packages' && artifactRole ? artifactRole : root
}

/** @type {Record<string, { en: Array<string>, ru: Array<string> }>} */
const COMMAND_NOTES = {
  'image pack': {
    en: [
      'Run the command from the selected workspace. It must have a package name and a production `start` script; a declared `build` script is run by the buildpack.',
      'The original Yarn project root is the build context. `pack` applies the root `project.toml` filters. The command does not create a standalone export project or guarantee a minimal image.',
      'Install `pack` before invoking the command. Raijin does not download it or change its global configuration.',
      '`packConfiguration` defaults to `ghcr.io/atls/buildpack-yarn-workspace:24`.',
      '`packConfiguration.builderTag` selects the supported Node/buildpack channel.',
      '`packConfiguration.buildpackVersion` pins an immutable buildpack tag for rollback.',
      '`packConfiguration.buildpack` overrides the full buildpack reference.',
      '`--tags <alias,...>` adds additional image tags to the same `pack build` invocation.',
      '`--tag-policy explicit --tags <tag,...>` uses only the supplied tags without Git or an automatic `latest` tag.',
      '`--tag-suffixes stage,production` adds `<primary>-stage` and `<primary>-production` to a computed primary tag; use it with a revision-derived policy, not `explicit`.',
      '`--json` returns provider tags and the local image ID, or the registry digest when `--publish` is explicitly requested. Local builds do not publish images.',
    ],
    ru: [
      'Запускайте команду из выбранного workspace. Ему нужны имя пакета и production-скрипт `start`; объявленный `build` выполняет buildpack.',
      'Контекстом сборки служит исходный корень Yarn-проекта. `pack` применяет фильтры корневого `project.toml`. Команда не создаёт отдельный export-проект и не гарантирует минимальный образ.',
      'Установите `pack` перед вызовом команды. Raijin не скачивает его и не меняет глобальную конфигурацию.',
      '`packConfiguration` по умолчанию использует `ghcr.io/atls/buildpack-yarn-workspace:24`.',
      '`packConfiguration.builderTag` выбирает поддерживаемый Node/buildpack-канал.',
      '`packConfiguration.buildpackVersion` фиксирует неизменяемый buildpack tag для rollback.',
      '`packConfiguration.buildpack` переопределяет полную buildpack-ссылку.',
      '`--tags <alias,...>` добавляет дополнительные image tags в тот же вызов `pack build`.',
      '`--tag-policy explicit --tags <tag,...>` использует только переданные теги без Git и автоматического тега `latest`.',
      '`--tag-suffixes stage,production` добавляет `<primary>-stage` и `<primary>-production` к вычисленному основному тегу; параметр применяется с политикой на основе ревизии, а не с `explicit`.',
      '`--json` возвращает теги провайдера и ID локального образа либо digest в registry при явном `--publish`. Локальная сборка образы не публикует.',
    ],
  },
}

/**
 * @param {string} dirPath
 * @param {(filePath: string) => boolean} predicate
 * @param {Array<string>} output
 */
const walkFiles = (dirPath, predicate, output = []) => {
  if (!fs.existsSync(dirPath)) return output

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (
        entry.name === '.git' ||
        entry.name === '.idea' ||
        entry.name === '.yarn' ||
        entry.name === 'dist'
      ) {
        continue
      }

      walkFiles(fullPath, predicate, output)
      continue
    }

    if (entry.isFile() && predicate(fullPath)) {
      output.push(fullPath)
    }
  }

  return output
}

/** @param {string} plugin */
const commandDomainFromPlugin = (plugin) => {
  if (plugin === '@atls/yarn-plugin-tools') {
    return 'raijin'
  }

  if (plugin.startsWith('@atls/yarn-plugin-')) {
    return plugin.replace('@atls/yarn-plugin-', '')
  }

  if (plugin.startsWith('@yarnpkg/plugin-')) {
    return `yarn-${plugin.replace('@yarnpkg/plugin-', '')}`
  }

  return plugin.replace(/^@/, '').replace(/[/.]/g, '-')
}

/**
 * @param {string} domain
 * @param {Language} language
 */
const domainLabel = (domain, language) => {
  if (language === 'ru') return `Домен \`${domain}\``
  return `Domain \`${domain}\``
}

/** @param {string} left @param {string} right */
const sortByLocale = (left, right) => left.localeCompare(right)

/** @returns {Array<Workspace>} */
const loadWorkspacePackages = () => {
  /** @type {{ workspaces?: Array<string> }} */
  const rootPackage = readJson('package.json')

  const workspaceRoots = [
    ...new Set((rootPackage.workspaces || []).map((item) => item.split('/**')[0])),
  ]

  const workspacePackageJsonFiles = workspaceRoots
    .flatMap((workspaceRoot) =>
      walkFiles(path.join(repoRoot, workspaceRoot), (filePath) => filePath.endsWith('package.json'))
    )
    .map((filePath) => toPosix(path.relative(repoRoot, filePath)))
    .sort(sortByLocale)

  const packages = workspacePackageJsonFiles.map((relativePackageJsonPath) => {
    const packageJson = readJson(relativePackageJsonPath)
    const location = toPosix(path.dirname(relativePackageJsonPath))
    const group = workspaceGroupFromLocation(location)

    return {
      name: packageJson.name,
      location,
      group,
      private: Boolean(packageJson.private),
      description:
        typeof packageJson.description === 'string' ? packageJson.description.trim() : '',
      scripts: Object.keys(packageJson.scripts || {}).sort(sortByLocale),
    }
  })

  return packages.sort((left, right) => {
    if (left.group !== right.group) {
      return left.group.localeCompare(right.group)
    }

    return left.name.localeCompare(right.name)
  })
}

/** @param {Array<Command>} commands */
const groupCommandsByDomain = (commands) => {
  /** @type {Map<string, Array<Command>>} */
  const groups = new Map()

  for (const command of commands) {
    const domainCommands = groups.get(command.domain) ?? []
    domainCommands.push(command)
    groups.set(command.domain, domainCommands)
  }

  for (const [domain, domainCommands] of groups.entries()) {
    domainCommands.sort((left, right) => left.command.localeCompare(right.command))
    groups.set(domain, domainCommands)
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
}

/**
 * @param {Command} command
 * @param {Language} language
 */
const renderCommandCard = (command, language) => {
  const isRu = language === 'ru'

  const lines = [
    `<!-- sync:command-card:${slugify(command.command)} -->`,
    '',
    `#### \`${command.command}\``,
    '',
    isRu ? `- Статус: \`${command.status}\`` : `- Status: \`${command.status}\``,
  ]

  lines.push(isRu ? `- Описание: ${command.description}` : `- Description: ${command.description}`)
  lines.push(isRu ? `- Использование: \`${command.usage}\`` : `- Usage: \`${command.usage}\``)

  const examples =
    command.examples.length > 0
      ? command.examples.map((example) => example.command)
      : [`yarn ${command.command}`]

  examples.forEach((example) => {
    lines.push(isRu ? `- Пример: \`${example}\`` : `- Example: \`${example}\``)
  })

  const notes = COMMAND_NOTES[command.command]?.[isRu ? 'ru' : 'en']

  notes?.forEach((note) => {
    lines.push(isRu ? `- Контракт: ${note}` : `- Contract: ${note}`)
  })

  lines.push(isRu ? `- Плагин: \`${command.plugin}\`` : `- Plugin: \`${command.plugin}\``)

  return lines
}

/**
 * @param {Array<Command>} commands
 * @param {Language} language
 */
const renderCommandsDoc = (commands, language) => {
  const isRu = language === 'ru'
  const active = commands.filter((command) => command.status === 'active')
  const inactive = commands.filter((command) => command.status === 'inactive')
  const activeGroups = groupCommandsByDomain(active)
  const inactiveGroups = groupCommandsByDomain(inactive)

  const lines = [
    '# Raijin Commands',
    '',
    isRu
      ? 'Карта команд, собранная из runtime `@atls/raijin-assembly`'
      : 'Command map assembled from the `@atls/raijin-assembly` runtime',
    '',
    '<!-- sync:commands-active -->',
    '',
    isRu ? '## Active (можно маршрутизировать)' : '## Active (safe to route)',
    '',
  ]

  if (activeGroups.length === 0) {
    lines.push(isRu ? '_Нет активных команд_' : '_No active commands_')
    lines.push('')
  }

  for (const [domain, domainCommands] of activeGroups) {
    lines.push(`### ${domainLabel(domain, language)}`)
    lines.push('')
    lines.push(
      isRu
        ? `- Команды: ${domainCommands.map((command) => `\`${command.command}\``).join(', ')}`
        : `- Commands: ${domainCommands.map((command) => `\`${command.command}\``).join(', ')}`
    )
    lines.push('')
    lines.push('<details>')
    lines.push(
      isRu
        ? `<summary>Подробности домена \`${domain}\`</summary>`
        : `<summary>Domain details: \`${domain}\`</summary>`
    )
    lines.push('')

    for (const command of domainCommands) {
      lines.push(...renderCommandCard(command, language))
      lines.push('')
    }

    lines.push('</details>')
    lines.push('')
  }

  if (inactiveGroups.length > 0) {
    lines.push('<!-- sync:commands-inactive -->')
    lines.push('')
    lines.push(isRu ? '## Inactive (не маршрутизировать)' : '## Inactive (do not route)')
    lines.push('')

    for (const [domain, domainCommands] of inactiveGroups) {
      lines.push(`### ${domainLabel(domain, language)}`)
      lines.push('')
      lines.push(
        isRu
          ? `- Команды: ${domainCommands.map((command) => `\`${command.command}\``).join(', ')}`
          : `- Commands: ${domainCommands.map((command) => `\`${command.command}\``).join(', ')}`
      )
      lines.push('')
      lines.push('<details>')
      lines.push(
        isRu
          ? `<summary>Подробности домена \`${domain}\`</summary>`
          : `<summary>Domain details: \`${domain}\`</summary>`
      )
      lines.push('')

      for (const command of domainCommands) {
        lines.push(...renderCommandCard(command, language))
        lines.push(
          isRu
            ? `- Маршрутизация: не использовать (${command.availabilityReason})`
            : `- Routing: do not use (${command.availabilityReason})`
        )
        lines.push('')
      }

      lines.push('</details>')
      lines.push('')
    }
  }

  return `${lines.join('\n')}\n`
}

/** @param {Array<Workspace>} workspaces */
const orderedWorkspaceGroups = (workspaces) => {
  const known = [...WORKSPACE_GROUP_ORDER]
  const extra = [...new Set(workspaces.map((workspace) => workspace.group))]
    .filter((group) => !known.includes(group))
    .sort(sortByLocale)

  return [...known, ...extra]
}

/**
 * @param {string} group
 * @param {Language} language
 */
const workspaceGroupIntro = (group, language) => {
  /** @type {Record<string, string>} */
  const ru = {
    raijin: 'Публичный пакет Raijin и его initializer',
    yarn: 'Пакеты кастомного Yarn CLI, плагинов и bundle-инфраструктуры',
    plugins: 'Приватные пакеты плагинов и их точки входа',
    code: 'Базовые code-библиотеки для сборки, тестов и утилит',
    config: 'Пакеты конфигурации и shared presets',
    runtime: 'Runtime-модули и инфраструктура исполнения',
    webpack: 'Webpack-интеграции и сборочные адаптеры',
    prettier: 'Форматирование и Prettier-интеграции',
    cli: 'Пакеты представления командного интерфейса',
    schematics: 'Схемы, генераторы и связанные шаблоны',
  }

  /** @type {Record<string, string>} */
  const en = {
    raijin: 'Public Raijin package and initializer',
    yarn: 'Custom Yarn CLI, plugin, and bundle infrastructure packages',
    plugins: 'Private plugin packages and their entrypoints',
    code: 'Core code libraries for build, checks, and utilities',
    config: 'Configuration packages and shared presets',
    runtime: 'Runtime modules and execution infrastructure',
    webpack: 'Webpack integrations and build adapters',
    prettier: 'Formatting and Prettier integrations',
    cli: 'Command-line interface presentation packages',
    schematics: 'Schematics, generators, and related templates',
  }

  const dict = language === 'ru' ? ru : en
  return (
    dict[group] ||
    (language === 'ru' ? 'Прочая группа workspace-пакетов' : 'Other workspace packages')
  )
}

/**
 * @param {Workspace} workspace
 * @param {Language} language
 * @param {boolean} compact
 */
const renderWorkspaceCard = (workspace, language, compact) => {
  const isRu = language === 'ru'
  const lines = [
    `<!-- sync:package-card:${slugify(workspace.name)} -->`,
    '',
    `#### \`${workspace.name}\``,
    '',
  ]

  if (compact) {
    lines.push(
      isRu
        ? `- Скрипты: ${workspace.scripts.length > 0 ? workspace.scripts.map((script) => `\`${script}\``).join(', ') : 'отсутствуют'}`
        : `- Scripts: ${workspace.scripts.length > 0 ? workspace.scripts.map((script) => `\`${script}\``).join(', ') : 'none'}`
    )
    lines.push(
      isRu ? `- Локация: \`${workspace.location}\`` : `- Location: \`${workspace.location}\``
    )
    return lines
  }

  lines.push(
    isRu ? `- Локация: \`${workspace.location}\`` : `- Location: \`${workspace.location}\``
  )
  lines.push(isRu ? `- Группа: \`${workspace.group}\`` : `- Group: \`${workspace.group}\``)
  lines.push(
    isRu
      ? `- Видимость: \`${workspace.private ? 'private' : 'public'}\``
      : `- Visibility: \`${workspace.private ? 'private' : 'public'}\``
  )
  if (workspace.description) {
    lines.push(
      isRu ? `- Описание: ${workspace.description}` : `- Description: ${workspace.description}`
    )
  }
  lines.push(
    isRu
      ? `- Скрипты: ${workspace.scripts.length > 0 ? workspace.scripts.map((script) => `\`${script}\``).join(', ') : 'отсутствуют'}`
      : `- Scripts: ${workspace.scripts.length > 0 ? workspace.scripts.map((script) => `\`${script}\``).join(', ') : 'none'}`
  )
  return lines
}

/**
 * @param {Array<Workspace>} workspaces
 * @param {Language} language
 */
const renderPackagesDoc = (workspaces, language) => {
  const isRu = language === 'ru'
  /** @type {Map<string, Array<Workspace>>} */
  const groups = new Map()
  const publicWorkspaces = workspaces.filter((workspace) => !workspace.private)

  for (const workspace of workspaces) {
    const groupWorkspaces = groups.get(workspace.group) ?? []
    groupWorkspaces.push(workspace)
    groups.set(workspace.group, groupWorkspaces)
  }

  const lines = [
    '# Raijin Packages',
    '',
    isRu ? 'Сгруппированные карточки workspace-пакетов' : 'Grouped cards for workspace packages',
    '',
    '## Public package contract',
    '',
    isRu
      ? 'Публичная поверхность Raijin публикуется как npm-пакет:'
      : 'Raijin public surface is published as npm package:',
    '',
    ...publicWorkspaces.map((workspace) => `- \`${workspace.name}\` — \`${workspace.location}\``),
    '',
    '## Internal workspace map',
    '',
    '<!-- sync:packages-groups -->',
    '',
  ]

  for (const group of orderedWorkspaceGroups(workspaces)) {
    const groupItems = groups.get(group) || []
    if (groupItems.length === 0) continue

    groupItems.sort((left, right) => left.name.localeCompare(right.name))

    lines.push('')
    lines.push(`## Group \`${group}\``)
    lines.push('')
    lines.push(workspaceGroupIntro(group, language))
    lines.push('')
    lines.push('<details>')
    lines.push(
      isRu
        ? `<summary>Подробности группы \`${group}\`</summary>`
        : `<summary>Group details: \`${group}\`</summary>`
    )
    lines.push('')

    const compact = !DETAILED_GROUPS.has(group)

    for (const workspace of groupItems) {
      lines.push(...renderWorkspaceCard(workspace, language, compact))
      lines.push('')
    }

    lines.push('</details>')
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

/**
 * @param {RuntimeCommand} command
 * @returns {Command}
 */
const describeCommand = (command) => ({
  ...command,
  availabilityReason: 'registered by the assembled @atls/raijin-assembly runtime',
  domain: commandDomainFromPlugin(command.plugin),
  pluginDir: command.plugin.replace('@atls/yarn-plugin-', 'plugin-'),
  status: 'active',
})

const runtimePath = path.join(repoRoot, '.yarn/releases/yarn.js')
const runtimeCliSurface = await loadRuntimeCliSurface({ cwd: repoRoot, runtimePath })
/** @type {Array<Command>} */
const commands = runtimeCliSurface.commands.map(describeCommand).sort((left, right) => {
  if (left.domain !== right.domain) return left.domain.localeCompare(right.domain)
  if (left.command !== right.command) return left.command.localeCompare(right.command)
  return left.plugin.localeCompare(right.plugin)
})
const workspaces = loadWorkspacePackages()

const activeCommands = commands.map((command) => command.command)
/** @type {Array<string>} */
const inactiveCommands = []

writeText(`${DOCS_DIR}/commands.md`, renderCommandsDoc(commands, 'en'))
writeText(`${DOCS_DIR}/commands.ru.md`, renderCommandsDoc(commands, 'ru'))
writeText(`${DOCS_DIR}/packages.md`, renderPackagesDoc(workspaces, 'en'))
writeText(`${DOCS_DIR}/packages.ru.md`, renderPackagesDoc(workspaces, 'ru'))
formatGeneratedFiles([
  `${DOCS_DIR}/commands.md`,
  `${DOCS_DIR}/commands.ru.md`,
  `${DOCS_DIR}/packages.md`,
  `${DOCS_DIR}/packages.ru.md`,
])

console.log(
  [
    `Generated raijin artifacts: ${commands.length} commands`,
    `${workspaces.length} workspace packages`,
    `(active: ${activeCommands.length}, inactive: ${inactiveCommands.length})`,
  ].join(' ')
)
