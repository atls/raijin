import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const DOCS_DIR = 'docs/raijin'
const AGENTS_DIR = '.agents'
const SEMANTICS_PATH = `${DOCS_DIR}/semantics.v1.json`

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))

const writeText = (relativePath, content) => {
  const absolutePath = path.join(repoRoot, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, content)
}

const writeJson = (relativePath, value) => {
  writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`)
}

const formatGeneratedFiles = (paths) => {
  try {
    execFileSync('yarn', ['format', ...paths], {
      cwd: repoRoot,
      stdio: 'pipe',
    })
  } catch (error) {
    const stderr =
      typeof error?.stderr === 'string'
        ? error.stderr
        : Buffer.isBuffer(error?.stderr)
          ? error.stderr.toString()
          : ''
    const stdout =
      typeof error?.stdout === 'string'
        ? error.stdout
        : Buffer.isBuffer(error?.stdout)
          ? error.stdout.toString()
          : ''

    throw new Error(
      ['Failed to format generated files', stderr || stdout || String(error)].join('\n')
    )
  }
}

const toPosix = (value) => value.split(path.sep).join('/')

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')

const emptySemantics = {
  schemaVersion: 1,
  generatedAt: '',
  model: '',
  commands: [],
  workspaces: [],
}

const WORKSPACE_GROUP_ORDER = [
  'yarn',
  'code',
  'config',
  'runtime',
  'webpack',
  'prettier',
  'cli',
  'schematics',
]

const DETAILED_GROUPS = new Set(WORKSPACE_GROUP_ORDER.filter((group) => group !== 'cli'))

const COVER_IMAGE_URL =
  'https://user-images.githubusercontent.com/102182195/234980835-78ed0fdb-c692-4b0e-ac95-b46c8cbd17a4.png'

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

const inferPackagePurpose = (packageName, group, language) => {
  const isRu = language === 'ru'
  const name = packageName || ''

  if (name.includes('/yarn-plugin-')) {
    const topic = name.split('/yarn-plugin-')[1] || 'custom'
    return isRu ? `Yarn-плагин домена ${topic}` : `Yarn plugin for ${topic} domain`
  }

  if (name.includes('/yarn-cli')) {
    return isRu
      ? 'Входная точка кастомного Yarn CLI и bundle-конфигурации'
      : 'Entrypoint for custom Yarn CLI and bundle configuration'
  }

  if (name.includes('/yarn-')) {
    return isRu ? 'Утилита экосистемы Yarn' : 'Utility package for Yarn ecosystem'
  }

  if (name.includes('/code-')) {
    return isRu
      ? 'Библиотека code-утилит для raijin-сценариев'
      : 'Code utility library for raijin workflows'
  }

  if (name.includes('/cli-ui-')) {
    return isRu
      ? 'CLI UI-компонент для терминального интерфейса'
      : 'CLI UI component for terminal rendering'
  }

  if (group === 'config') {
    return isRu ? 'Конфигурационный пакет shared-raijin' : 'Shared raijin configuration package'
  }

  if (group === 'runtime') {
    return isRu ? 'Runtime-пакет запуска инструментов' : 'Runtime package for raijin execution'
  }

  if (group === 'schematics') {
    return isRu ? 'Пакет схем и генераторов' : 'Schematics and template generation package'
  }

  if (group === 'webpack') {
    return isRu ? 'Webpack-интеграция инструментов' : 'Webpack integration for raijin ecosystem'
  }

  if (group === 'prettier') {
    return isRu ? 'Prettier-плагин и форматирование' : 'Prettier plugin and formatting utilities'
  }

  return isRu ? 'Назначение не описано в package.json' : 'Purpose is not described in package.json'
}

const commandDomainFromPlugin = (plugin) => {
  if (plugin.startsWith('@atls/yarn-plugin-')) {
    return plugin.replace('@atls/yarn-plugin-', '')
  }

  if (plugin.startsWith('@yarnpkg/plugin-')) {
    return `yarn-${plugin.replace('@yarnpkg/plugin-', '')}`
  }

  return plugin.replace(/^@/, '').replace(/[/.]/g, '-')
}

const domainLabel = (domain, language) => {
  if (language === 'ru') return `Домен \`${domain}\``
  return `Domain \`${domain}\``
}

const sortByLocale = (left, right) => left.localeCompare(right)

const loadWorkspacePackages = () => {
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
    const group = location.split('/')[0]

    return {
      name: packageJson.name,
      location,
      group,
      private: Boolean(packageJson.private),
      description:
        typeof packageJson.description === 'string' ? packageJson.description.trim() : '',
      purposeEn: inferPackagePurpose(packageJson.name, group, 'en'),
      purposeRu: inferPackagePurpose(packageJson.name, group, 'ru'),
      scripts: Object.keys(packageJson.scripts || {}).sort(sortByLocale),
      dependencyCount: Object.keys(packageJson.dependencies || {}).length,
      devDependencyCount: Object.keys(packageJson.devDependencies || {}).length,
      peerDependencyCount: Object.keys(packageJson.peerDependencies || {}).length,
    }
  })

  return packages.sort((left, right) => {
    if (left.group !== right.group) {
      return left.group.localeCompare(right.group)
    }

    return left.name.localeCompare(right.name)
  })
}

const loadPluginRegistry = (bundlePlugins) => {
  const pluginDirs = fs
    .readdirSync(path.join(repoRoot, 'yarn'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('plugin-'))
    .map((entry) => entry.name)
    .sort(sortByLocale)

  const registry = new Map()

  for (const pluginDir of pluginDirs) {
    const packageJsonPath = path.join(repoRoot, 'yarn', pluginDir, 'package.json')
    if (!fs.existsSync(packageJsonPath)) continue

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    const indexCandidates = [
      path.join(repoRoot, 'yarn', pluginDir, 'sources', 'index.ts'),
      path.join(repoRoot, 'yarn', pluginDir, 'src', 'index.ts'),
    ]

    let exported = false

    for (const indexCandidate of indexCandidates) {
      if (!fs.existsSync(indexCandidate)) continue

      const content = fs.readFileSync(indexCandidate, 'utf8')
      if (/^\s*export\s*\{\s*plugin\s+as\s+default\s*\}/m.test(content)) {
        exported = true
        break
      }
    }

    registry.set(pluginDir, {
      dir: pluginDir,
      packageName: packageJson.name,
      domain: commandDomainFromPlugin(packageJson.name),
      inBundle: bundlePlugins.includes(packageJson.name),
      exported,
    })
  }

  return registry
}

const parseCommandFile = (filePath) => {
  const source = fs.readFileSync(filePath, 'utf8')

  const pathsMatch = source.match(/static\s+(?:override\s+)?paths\s*=\s*\[\[(.*?)\]\]/s)
  if (!pathsMatch) return null

  const tokenMatches = [...pathsMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g)]
  const pathTokens = tokenMatches.map((match) => match[1]).filter(Boolean)
  if (pathTokens.length === 0) return null

  const classMatch = source.match(/(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/)

  return {
    className: classMatch ? classMatch[1] : 'UnknownCommandClass',
    pathTokens,
    command: pathTokens.join(' '),
  }
}

const loadCommands = (pluginRegistry) => {
  const commandFiles = walkFiles(path.join(repoRoot, 'yarn'), (filePath) =>
    /yarn\/plugin-[^/]+\/sources\/.+\.command\.(ts|tsx)$/.test(
      toPosix(path.relative(repoRoot, filePath))
    )
  )

  const commands = []

  for (const filePath of commandFiles) {
    const parsed = parseCommandFile(filePath)
    if (!parsed) continue

    const relativePath = toPosix(path.relative(repoRoot, filePath))
    const pluginDir = relativePath.split('/')[1]
    const pluginInfo = pluginRegistry.get(pluginDir)
    if (!pluginInfo) continue

    const isActive = pluginInfo.inBundle && pluginInfo.exported

    commands.push({
      command: parsed.command,
      pathTokens: parsed.pathTokens,
      className: parsed.className,
      plugin: pluginInfo.packageName,
      pluginDir,
      domain: pluginInfo.domain,
      source: relativePath,
      status: isActive ? 'active' : 'inactive',
      availabilityReason: isActive
        ? 'plugin in bundle and exported from plugin index'
        : pluginInfo.inBundle
          ? 'plugin is in bundle but not exported from plugin index'
          : 'plugin is not included in @atls/yarn-cli standard bundle',
    })
  }

  commands.sort((left, right) => {
    if (left.domain !== right.domain) return left.domain.localeCompare(right.domain)
    if (left.command !== right.command) return left.command.localeCompare(right.command)
    if (left.plugin !== right.plugin) return left.plugin.localeCompare(right.plugin)
    return left.source.localeCompare(right.source)
  })

  return commands
}

const readSemantics = () => {
  const semanticsPath = path.join(repoRoot, SEMANTICS_PATH)
  if (!fs.existsSync(semanticsPath)) return emptySemantics

  const raw = JSON.parse(fs.readFileSync(semanticsPath, 'utf8'))

  return {
    schemaVersion: Number(raw.schemaVersion) || 1,
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
    model: typeof raw.model === 'string' ? raw.model : '',
    commands: Array.isArray(raw.commands) ? raw.commands : [],
    workspaces: Array.isArray(raw.workspaces) ? raw.workspaces : [],
  }
}

const normalizeLocalePair = (value, fallbackEn, fallbackRu) => ({
  en: typeof value?.en === 'string' && value.en.trim() ? value.en.trim() : fallbackEn,
  ru: typeof value?.ru === 'string' && value.ru.trim() ? value.ru.trim() : fallbackRu,
})

const normalizeTags = (tags, fallbackTags) => {
  const unique = [...new Set((Array.isArray(tags) ? tags : []).filter(Boolean))].map((tag) =>
    String(tag).trim()
  )

  return (unique.length > 0 ? unique : fallbackTags).sort(sortByLocale)
}

const fallbackCommandSemantics = (command) => {
  const enPurpose = `Runs "${command.command}" in ${command.domain} raijin domain`
  const ruPurpose = `Запускает "${command.command}" в raijin-домене ${command.domain}`

  return {
    id: command.command,
    groupTags: [command.domain, command.status],
    purpose: { en: enPurpose, ru: ruPurpose },
    whenToUse: {
      en: `Use when you need ${command.command} in project workflow`,
      ru: `Используйте, когда в рабочем потоке нужен сценарий ${command.command}`,
    },
    example: { en: `yarn ${command.command}`, ru: `yarn ${command.command}` },
  }
}

const fallbackWorkspaceSemantics = (workspace) => ({
  id: workspace.name,
  groupTags: [workspace.group, workspace.private ? 'private' : 'public'],
  purpose: {
    en: workspace.description || workspace.purposeEn,
    ru: workspace.description || workspace.purposeRu,
  },
  whenToUse: {
    en: `Use when working with ${workspace.group} workspace package`,
    ru: `Используйте при работе с workspace-пакетом группы ${workspace.group}`,
  },
  example: {
    en:
      workspace.scripts.length > 0
        ? `yarn workspace ${workspace.name} ${workspace.scripts[0]}`
        : `yarn workspace ${workspace.name} run`,
    ru:
      workspace.scripts.length > 0
        ? `yarn workspace ${workspace.name} ${workspace.scripts[0]}`
        : `yarn workspace ${workspace.name} run`,
  },
})

const buildSemanticsLookup = (semantics) => ({
  commandById: new Map((semantics.commands || []).map((entry) => [entry.id, entry])),
  workspaceById: new Map((semantics.workspaces || []).map((entry) => [entry.id, entry])),
})

const getCommandSemantics = (command, lookup) => {
  const raw = lookup.commandById.get(command.command)
  const fallback = fallbackCommandSemantics(command)

  return {
    id: command.command,
    groupTags: normalizeTags(raw?.groupTags, fallback.groupTags),
    purpose: normalizeLocalePair(raw?.purpose, fallback.purpose.en, fallback.purpose.ru),
    whenToUse: normalizeLocalePair(raw?.whenToUse, fallback.whenToUse.en, fallback.whenToUse.ru),
    example: normalizeLocalePair(raw?.example, fallback.example.en, fallback.example.ru),
  }
}

const getWorkspaceSemantics = (workspace, lookup) => {
  const raw = lookup.workspaceById.get(workspace.name)
  const fallback = fallbackWorkspaceSemantics(workspace)

  return {
    id: workspace.name,
    groupTags: normalizeTags(raw?.groupTags, fallback.groupTags),
    purpose: normalizeLocalePair(raw?.purpose, fallback.purpose.en, fallback.purpose.ru),
    whenToUse: normalizeLocalePair(raw?.whenToUse, fallback.whenToUse.en, fallback.whenToUse.ru),
    example: normalizeLocalePair(raw?.example, fallback.example.en, fallback.example.ru),
  }
}

const languageField = (value, language) => (language === 'ru' ? value.ru : value.en)

const linkByLanguage = (basePath, language) => `${basePath}${language === 'ru' ? '.ru' : ''}.md`

const renderRootReadme = (language) => {
  const isRu = language === 'ru'
  const rootReadmeRu = 'README.md'
  const rootReadmeEn = 'README_EN.md'
  const docsRouterRu = 'docs/README.ru.md'
  const docsRouterEn = 'docs/README.md'
  const quickstartPath = linkByLanguage('docs/raijin/quickstart', language)
  const commandsPath = linkByLanguage('docs/raijin/commands', language)
  const packagesPath = linkByLanguage('docs/raijin/packages', language)
  const raijinRouterPath = linkByLanguage('docs/raijin/README', language)

  return [
    `![raijin-github-cover](${COVER_IMAGE_URL})`,
    '',
    '# Atlantis Raijin',
    '',
    `[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](${rootReadmeRu})`,
    `[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](${rootReadmeEn})`,
    '',
    '<!-- sync:root-language-default -->',
    '',
    isRu
      ? `Документация по умолчанию: [README.md](${rootReadmeRu}). Английская версия: [README_EN.md](${rootReadmeEn})`
      : `Default docs language is RU: [README.md](${rootReadmeRu}). EN version: [README_EN.md](${rootReadmeEn})`,
    '',
    '<!-- sync:root-what -->',
    '',
    isRu ? '## Что это' : '## What this is',
    '',
    isRu
      ? 'Raijin — это набор команд и пакетов для монорепозиториев, поставляемый как кастомный Yarn-бандл `atls`'
      : 'Raijin is a command and package toolkit for monorepos, shipped as the custom `atls` Yarn bundle',
    isRu
      ? 'Цель — дать единый способ запускать проверки, сборку, релиз и сервисные утилиты в разных проектах'
      : 'The goal is one consistent way to run checks, builds, release, and utility flows across projects',
    '',
    '<!-- sync:root-audience -->',
    '',
    isRu ? '## Для кого' : '## Who it is for',
    '',
    isRu
      ? '- Для команд, которые поддерживают несколько `Node.js`/`TypeScript` проектов'
      : '- Teams maintaining multiple `Node.js`/`TypeScript` projects',
    isRu
      ? '- Для разработчиков, которым нужен единый контракт команд в локальной среде и в `GitHub Actions`'
      : '- Developers who need one command contract locally and in `GitHub Actions`',
    isRu
      ? '- Для опенсорс и внутренних репозиториев, где важны предсказуемые проверки и обновления'
      : '- Open-source and internal repositories that need predictable checks and upgrades',
    '',
    '<!-- sync:root-capabilities -->',
    '',
    isRu ? '## Что умеет Raijin' : '## What Raijin can do',
    '',
    isRu
      ? '- Проверки кода: `check`, `lint`, `typecheck`, `test`, `checks *`'
      : '- Code validation: `check`, `lint`, `typecheck`, `test`, `checks *`',
    isRu
      ? '- Работа с изменениями: `files changed *`, `workspaces changed *`'
      : '- Change scope tooling: `files changed *`, `workspaces changed *`',
    isRu
      ? '- Сборка и выпуск: `service build`, `library build`, `release create`, `npm publish`'
      : '- Build and release flows: `service build`, `library build`, `release create`, `npm publish`',
    isRu
      ? '- Генераторы и служебные команды для инфраструктуры монорепозитория'
      : '- Generators and utility commands for monorepo infrastructure',
    '',
    '<!-- sync:root-quickstart -->',
    '',
    isRu ? '## Быстрый старт' : '## Quickstart',
    '',
    isRu ? '### Новый проект' : '### New project',
    '',
    '```bash',
    'yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs',
    'yarn set version atls',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- В проекте появляется/обновляется `.yarn/releases/yarn.mjs`'
      : '- `.yarn/releases/yarn.mjs` is added or updated in the project',
    isRu
      ? '- Команды `raijin` становятся доступны через `yarn`'
      : '- Raijin commands are available via `yarn`',
    '',
    isRu ? '### Обновление' : '### Upgrade',
    '',
    '```bash',
    'yarn set version atls',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu ? '- Подтягивается актуальная версия бандла' : '- The latest bundle version is installed',
    '',
    isRu ? '### Проверка' : '### Verify',
    '',
    '```bash',
    'yarn check',
    'yarn files changed list',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Команды выполняются без ошибки маршрутизации и с ожидаемым набором шагов'
      : '- Commands run with expected routing and expected validation steps',
    '',
    '<!-- sync:root-consumer-howto -->',
    '',
    isRu ? '## Как использовать в чужом проекте' : '## How to use in another project',
    '',
    isRu
      ? `1. Подключите бандл по разделу [Быстрый старт](./${quickstartPath})`
      : `1. Install the bundle using [Quickstart](./${quickstartPath})`,
    isRu
      ? '2. Зафиксируйте изменения `.yarn/releases` и `.yarnrc.yml` в системе контроля версий'
      : '2. Commit `.yarn/releases` and `.yarnrc.yml` changes to version control',
    isRu
      ? '3. Обновляйте бандл командой `yarn set version atls` по мере выхода новых версий'
      : '3. Update with `yarn set version atls` when newer bundle versions are released',
    '',
    '<!-- sync:root-read-more -->',
    '',
    isRu ? '## Где читать дальше' : '## Where to read next',
    '',
    isRu
      ? `- RU (по умолчанию): [README.md](${rootReadmeRu})`
      : `- RU (default): [README.md](${rootReadmeRu})`,
    isRu ? `- EN: [README_EN.md](${rootReadmeEn})` : `- EN: [README_EN.md](${rootReadmeEn})`,
    isRu
      ? `- Индекс документации RU: [docs/README.ru.md](${docsRouterRu})`
      : `- Docs index RU: [docs/README.ru.md](${docsRouterRu})`,
    isRu
      ? `- Индекс документации EN: [docs/README.md](${docsRouterEn})`
      : `- Docs index EN: [docs/README.md](${docsRouterEn})`,
    isRu
      ? `- Роутер раздела Raijin: [${raijinRouterPath}](${raijinRouterPath})`
      : `- Raijin section router: [${raijinRouterPath}](${raijinRouterPath})`,
    isRu
      ? `- Быстрый старт: [${quickstartPath}](${quickstartPath})`
      : `- Quickstart: [${quickstartPath}](${quickstartPath})`,
    isRu
      ? `- Карта команд: [${commandsPath}](${commandsPath})`
      : `- Commands map: [${commandsPath}](${commandsPath})`,
    isRu
      ? `- Карта пакетов: [${packagesPath}](${packagesPath})`
      : `- Packages map: [${packagesPath}](${packagesPath})`,
    '',
  ].join('\n')
}

const renderDocsRootReadme = (language) => {
  const isRu = language === 'ru'
  const raijinRouterPath = linkByLanguage('raijin/README', language)
  const quickstartPath = linkByLanguage('raijin/quickstart', language)
  const commandsPath = linkByLanguage('raijin/commands', language)
  const packagesPath = linkByLanguage('raijin/packages', language)

  return [
    '# Atlantis Raijin Docs',
    '',
    isRu
      ? 'Маршрутизатор документации по набору инструментов `Raijin`'
      : 'Documentation router for `Raijin`',
    '',
    '<!-- sync:docs-router-links -->',
    '',
    isRu ? '## Версии документации' : '## Documentation versions',
    '',
    isRu
      ? '- Русская версия: [README.ru.md](./README.ru.md)'
      : '- RU (default): [README.ru.md](./README.ru.md)',
    isRu ? '- Английская версия: [README.md](./README.md)' : '- EN: [README.md](./README.md)',
    '',
    '<!-- sync:docs-router-scenarios -->',
    '',
    isRu ? '## Куда идти по сценарию' : '## Scenario routing',
    '',
    isRu
      ? `- Нужно быстро подключить или обновить бандл в проекте: [${quickstartPath}](./${quickstartPath})`
      : `- Need to install or upgrade bundle quickly: [${quickstartPath}](./${quickstartPath})`,
    isRu
      ? `- Нужно выбрать команду под задачу: [${commandsPath}](./${commandsPath})`
      : `- Need the right command for a task: [${commandsPath}](./${commandsPath})`,
    isRu
      ? `- Нужно понять назначение workspace-пакета: [${packagesPath}](./${packagesPath})`
      : `- Need workspace package purpose and ownership: [${packagesPath}](./${packagesPath})`,
    isRu
      ? `- Нужен обзор структуры раздела Raijin: [${raijinRouterPath}](./${raijinRouterPath})`
      : `- Need a compact Raijin docs overview: [${raijinRouterPath}](./${raijinRouterPath})`,
    '',
    '<!-- sync:docs-router-read-order -->',
    '',
    isRu ? '## Порядок чтения' : '## Read order',
    '',
    `1. [${raijinRouterPath}](./${raijinRouterPath})`,
    `2. [${quickstartPath}](./${quickstartPath})`,
    `3. [${commandsPath}](./${commandsPath})`,
    `4. [${packagesPath}](./${packagesPath})`,
    '',
  ].join('\n')
}

const renderRaijinReadme = (index, language) => {
  const isRu = language === 'ru'
  const quickstartPath = linkByLanguage('quickstart', language)
  const commandsPath = linkByLanguage('commands', language)
  const packagesPath = linkByLanguage('packages', language)

  return [
    '# Raijin Docs',
    '',
    isRu
      ? 'Навигация по документации кастомного Yarn-бандла `atls`'
      : 'Navigation for custom `atls` Yarn bundle docs',
    '',
    '<!-- sync:router-scenarios -->',
    '',
    isRu ? '## Куда идти по задаче' : '## Navigate by task',
    '',
    isRu
      ? `- Подключить или обновить бандл: [${quickstartPath}](./${quickstartPath})`
      : `- Install or upgrade the bundle: [${quickstartPath}](./${quickstartPath})`,
    isRu
      ? `- Выбрать и понять команду: [${commandsPath}](./${commandsPath})`
      : `- Pick and understand a command: [${commandsPath}](./${commandsPath})`,
    isRu
      ? `- Разобраться с workspace-пакетами: [${packagesPath}](./${packagesPath})`
      : `- Understand workspace packages: [${packagesPath}](./${packagesPath})`,
    '',
    '<!-- sync:router-read-order -->',
    '',
    isRu ? '## Порядок чтения' : '## Read order',
    '',
    `1. [${quickstartPath}](./${quickstartPath})`,
    `2. [${commandsPath}](./${commandsPath})`,
    `3. [${packagesPath}](./${packagesPath})`,
    '',
    '<!-- sync:router-quick-rules -->',
    '',
    isRu ? '## Правила использования' : '## Usage rules',
    '',
    isRu
      ? '- Используйте команды только со статусом `active`'
      : '- Use only commands with `active` status',
    isRu
      ? '- `inactive` команды считаются недоступными'
      : '- `inactive` commands are treated as unavailable',
    '',
    '<!-- sync:router-generation -->',
    '',
    isRu ? '## Генерация и проверки' : '## Generation and checks',
    '',
    '- `yarn raijin:generate`',
    '- `yarn raijin:check`',
    '',
    '<!-- sync:router-coverage -->',
    '',
    isRu ? '## Покрытие текущей версии' : '## Coverage snapshot',
    '',
    isRu
      ? `- Команд: ${index.commands.length} (active: ${index.availability.activeCommands.length}, inactive: ${index.availability.inactiveCommands.length})`
      : `- Commands: ${index.commands.length} (active: ${index.availability.activeCommands.length}, inactive: ${index.availability.inactiveCommands.length})`,
    isRu
      ? `- Workspace-пакетов: ${index.workspaces.length}`
      : `- Workspace packages: ${index.workspaces.length}`,
    isRu
      ? `- Последняя генерация: ${index.lastGenerated}`
      : `- Last generated: ${index.lastGenerated}`,
    '',
  ].join('\n')
}

const renderQuickstart = (language) => {
  const isRu = language === 'ru'

  return [
    '# Raijin Quickstart',
    '',
    isRu
      ? 'Минимальный сценарий подключения и проверки кастомного Yarn-бандла `atls`'
      : 'Minimal install-and-verify flow for the custom `atls` Yarn bundle',
    '',
    '<!-- sync:preflight -->',
    isRu ? '## 1. Предпосылки' : '## 1. Prerequisites',
    '',
    isRu ? '- Node.js: `>= 22` (не ниже `22`)' : '- Node.js: `>= 22`',
    isRu ? '- Yarn: `>= 4` (не ниже `4`)' : '- Yarn: `>= 4`',
    isRu ? '- Рабочий проект с `package.json`' : '- A working project with `package.json`',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Команда `yarn --version` выполняется, и проект готов к переключению версии Yarn'
      : '- `yarn --version` works and the project can switch Yarn versions',
    '',
    '<!-- sync:new-project -->',
    isRu ? '## 2. Новый проект: подключение бандла' : '## 2. New project: install the bundle',
    '',
    '```bash',
    'yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs',
    'yarn set version atls',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- В `.yarn/releases/` появляется актуальный `yarn.mjs` из Raijin'
      : '- `.yarn/releases/` contains the current Raijin `yarn.mjs`',
    isRu
      ? '- Команды из бандла (`check`, `files changed list` и другие) становятся доступны'
      : '- Bundle commands (`check`, `files changed list`, etc.) become available',
    '',
    '<!-- sync:bundle-upgrade -->',
    isRu ? '## 3. Обновление установленного бандла' : '## 3. Upgrade installed bundle',
    '',
    '```bash',
    'yarn set version atls',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Бандл обновлён до последней доступной версии'
      : '- Bundle is upgraded to the latest available version',
    '',
    '<!-- sync:verification -->',
    isRu ? '## 4. Базовая проверка' : '## 4. Basic verification',
    '',
    '```bash',
    'yarn check',
    'yarn files changed list',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- `yarn check` завершает полный проход проверок без ошибок маршрутизации'
      : '- `yarn check` runs a complete validation pass without routing errors',
    isRu
      ? '- `yarn files changed list` возвращает список файлов или пустой список, если изменений нет'
      : '- `yarn files changed list` returns file list (or empty list if no changes)',
    '',
    '<!-- sync:consumer-howto -->',
    isRu ? '## 5. Как использовать в чужом проекте' : '## 5. How to use in an external project',
    '',
    isRu
      ? '- Подключите бандл один раз, затем поддерживайте версию через `yarn set version atls`'
      : '- Install once, then keep it current with `yarn set version atls`',
    isRu
      ? '- Коммитьте изменения `.yarn/releases` и `.yarnrc.yml` вместе с обновлением бандла'
      : '- Commit `.yarn/releases` and `.yarnrc.yml` changes together with bundle updates',
    isRu
      ? '- Для CI используйте те же команды, что и локально, чтобы избежать расхождения поведения'
      : '- Use the same commands in CI and locally to avoid behavior drift',
    '',
  ].join('\n')
}

const groupCommandsByDomain = (commands) => {
  const groups = new Map()

  for (const command of commands) {
    if (!groups.has(command.domain)) groups.set(command.domain, [])
    groups.get(command.domain).push(command)
  }

  for (const [domain, domainCommands] of groups.entries()) {
    domainCommands.sort((left, right) => left.command.localeCompare(right.command))
    groups.set(domain, domainCommands)
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
}

const renderCommandCard = (command, semantics, language) => {
  const isRu = language === 'ru'

  return [
    `<!-- sync:command-card:${slugify(command.command)} -->`,
    '',
    `#### \`${command.command}\``,
    '',
    isRu ? `- Статус: \`${command.status}\`` : `- Status: \`${command.status}\``,
    isRu
      ? `- Назначение: ${languageField(semantics.purpose, 'ru')}`
      : `- Purpose: ${languageField(semantics.purpose, 'en')}`,
    isRu
      ? `- Когда использовать: ${languageField(semantics.whenToUse, 'ru')}`
      : `- When to use: ${languageField(semantics.whenToUse, 'en')}`,
    isRu
      ? `- Пример: \`${languageField(semantics.example, 'ru')}\``
      : `- Example: \`${languageField(semantics.example, 'en')}\``,
    isRu ? `- Плагин: \`${command.plugin}\`` : `- Plugin: \`${command.plugin}\``,
    isRu ? `- Исходник: \`${command.source}\`` : `- Source: \`${command.source}\``,
  ]
}

const renderCommandsDoc = (commands, semanticsLookup, language) => {
  const isRu = language === 'ru'
  const active = commands.filter((command) => command.status === 'active')
  const inactive = commands.filter((command) => command.status === 'inactive')
  const activeGroups = groupCommandsByDomain(active)
  const inactiveGroups = groupCommandsByDomain(inactive)

  const lines = [
    '# Raijin Commands',
    '',
    isRu
      ? 'Карта команд из `yarn/plugin-*` и bundle `@atls/yarn-cli`'
      : 'Command map extracted from `yarn/plugin-*` and `@atls/yarn-cli` bundle',
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

    if (domain === 'checks') {
      lines.push(
        isRu
          ? '> Важно: `checks` рассчитан на запуск в раннерах GitHub Actions, требует `GITHUB_TOKEN` и контекст проверки (`context.repo`, `GITHUB_SHA`)'
          : '> Important: `checks` targets GitHub Actions runners, requires `GITHUB_TOKEN`, and relies on check context (`context.repo`, `GITHUB_SHA`)'
      )
      lines.push('')
    }

    for (const command of domainCommands) {
      const semantics = getCommandSemantics(command, semanticsLookup)
      lines.push(...renderCommandCard(command, semantics, language))
      lines.push('')
    }

    lines.push('</details>')
    lines.push('')
  }

  lines.push('<!-- sync:commands-inactive -->')
  lines.push('')
  lines.push(isRu ? '## Inactive (не маршрутизировать)' : '## Inactive (do not route)')
  lines.push('')

  if (inactiveGroups.length === 0) {
    lines.push(isRu ? '_Нет inactive-команд_' : '_No inactive commands_')
    lines.push('')
  } else {
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
        const semantics = getCommandSemantics(command, semanticsLookup)
        lines.push(...renderCommandCard(command, semantics, language))
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

const orderedWorkspaceGroups = (workspaces) => {
  const known = [...WORKSPACE_GROUP_ORDER]
  const extra = [...new Set(workspaces.map((workspace) => workspace.group))]
    .filter((group) => !known.includes(group))
    .sort(sortByLocale)

  return [...known, ...extra]
}

const workspaceGroupIntro = (group, language) => {
  const ru = {
    yarn: 'Пакеты кастомного Yarn CLI, плагинов и bundle-инфраструктуры',
    code: 'Базовые code-библиотеки для сборки, тестов и утилит',
    config: 'Пакеты конфигурации и shared presets',
    runtime: 'Runtime-модули и инфраструктура исполнения',
    webpack: 'Webpack-интеграции и сборочные адаптеры',
    prettier: 'Форматирование и Prettier-интеграции',
    cli: 'Компактный список CLI-пакетов и их роль',
    schematics: 'Схемы, генераторы и связанные шаблоны',
  }

  const en = {
    yarn: 'Custom Yarn CLI, plugin, and bundle infrastructure packages',
    code: 'Core code libraries for build, checks, and utilities',
    config: 'Configuration packages and shared presets',
    runtime: 'Runtime modules and execution infrastructure',
    webpack: 'Webpack integrations and build adapters',
    prettier: 'Formatting and Prettier integrations',
    cli: 'Compact list of CLI packages and their role',
    schematics: 'Schematics, generators, and related templates',
  }

  const dict = language === 'ru' ? ru : en
  return (
    dict[group] ||
    (language === 'ru' ? 'Прочая группа workspace-пакетов' : 'Other workspace packages')
  )
}

const renderWorkspaceCard = (workspace, semantics, language, compact) => {
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
        ? `- Назначение: ${languageField(semantics.purpose, 'ru')}`
        : `- Purpose: ${languageField(semantics.purpose, 'en')}`
    )
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
  lines.push(
    isRu
      ? `- Назначение: ${languageField(semantics.purpose, 'ru')}`
      : `- Purpose: ${languageField(semantics.purpose, 'en')}`
  )
  lines.push(
    isRu
      ? `- Когда использовать: ${languageField(semantics.whenToUse, 'ru')}`
      : `- When to use: ${languageField(semantics.whenToUse, 'en')}`
  )
  lines.push(
    isRu
      ? `- Пример: \`${languageField(semantics.example, 'ru')}\``
      : `- Example: \`${languageField(semantics.example, 'en')}\``
  )
  lines.push(
    isRu
      ? `- Теги: ${semantics.groupTags.map((tag) => `\`${tag}\``).join(', ')}`
      : `- Tags: ${semantics.groupTags.map((tag) => `\`${tag}\``).join(', ')}`
  )
  lines.push(
    isRu
      ? `- Скрипты: ${workspace.scripts.length > 0 ? workspace.scripts.map((script) => `\`${script}\``).join(', ') : 'отсутствуют'}`
      : `- Scripts: ${workspace.scripts.length > 0 ? workspace.scripts.map((script) => `\`${script}\``).join(', ') : 'none'}`
  )
  lines.push(
    isRu
      ? `- Зависимости: deps ${workspace.dependencyCount}, devDeps ${workspace.devDependencyCount}, peerDeps ${workspace.peerDependencyCount}`
      : `- Dependencies: deps ${workspace.dependencyCount}, devDeps ${workspace.devDependencyCount}, peerDeps ${workspace.peerDependencyCount}`
  )

  return lines
}

const renderPackagesDoc = (workspaces, semanticsLookup, language) => {
  const isRu = language === 'ru'
  const groups = new Map()

  for (const workspace of workspaces) {
    if (!groups.has(workspace.group)) groups.set(workspace.group, [])
    groups.get(workspace.group).push(workspace)
  }

  const lines = [
    '# Raijin Packages',
    '',
    isRu ? 'Сгруппированные карточки workspace-пакетов' : 'Grouped cards for workspace packages',
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
    lines.push(isRu ? 'Короткий список:' : 'Compact list:')
    lines.push('')

    for (const workspace of groupItems) {
      const semantics = getWorkspaceSemantics(workspace, semanticsLookup)
      lines.push(
        isRu
          ? `- \`${workspace.name}\` — ${languageField(semantics.purpose, 'ru')}`
          : `- \`${workspace.name}\` — ${languageField(semantics.purpose, 'en')}`
      )
    }

    lines.push('')
    lines.push('<details>')
    lines.push(
      isRu
        ? `<summary>Подробности группы \`${group}\`</summary>`
        : `<summary>Group details: \`${group}\`</summary>`
    )
    lines.push('')

    const compact = !DETAILED_GROUPS.has(group)

    if (compact) {
      lines.push(isRu ? '_Компактные карточки для этой группы_' : '_Compact cards for this group_')
      lines.push('')
    }

    for (const workspace of groupItems) {
      const semantics = getWorkspaceSemantics(workspace, semanticsLookup)
      lines.push(...renderWorkspaceCard(workspace, semantics, language, compact))
      lines.push('')
    }

    lines.push('</details>')
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

const renderAgentReadme = () =>
  [
    '# Raijin Agent Adapter',
    '',
    'Thin adapter for routing in this repository. Facts live in `docs/raijin/index.v1.json`.',
    '',
    '## Required read order',
    '',
    '1. `docs/raijin/README.ru.md` (default)',
    '2. `docs/raijin/quickstart.ru.md`',
    '3. `docs/raijin/commands.ru.md`',
    '4. `docs/raijin/packages.ru.md`',
    '5. `docs/raijin/index.v1.json`',
    '6. `docs/raijin/semantics.v1.json`',
    '',
    '## Constraints',
    '',
    '- Route only commands with `status = active`',
    '- Treat `inactive` commands as unavailable',
    '- Do not use unrelated frontend/mobile/backend instruction packs',
    '',
  ].join('\n')

const renderAgentRouting = () =>
  [
    '# Raijin Routing Rules',
    '',
    '1. Load `docs/raijin/index.v1.json` and `docs/raijin/semantics.v1.json`',
    '2. Match prompt to command path tokens and semantics tags',
    '3. Prefer `active` command entries when several routes match',
    '4. If the strongest match is `inactive`, return unavailable route',
    '5. For local execution in `raijin`, run `source .env` and `export NODE_OPTIONS` first',
    '',
  ].join('\n')

const renderAgentsMd = () =>
  [
    '# Raijin-only Agent Rules',
    '',
    '- Use only `docs/raijin/*` and `docs/raijin/index.v1.json` as routing source',
    '- Default language for routing is Russian docs (`README.ru.md` first)',
    '- Ignore non-raijin instructions outside this folder',
    '',
  ].join('\n')

const cleanupAgentsDirectory = () => {
  const root = path.join(repoRoot, AGENTS_DIR)
  if (!fs.existsSync(root)) return

  const allowed = new Set([
    `${AGENTS_DIR}/README.md`,
    `${AGENTS_DIR}/raijin-routing.md`,
    `${AGENTS_DIR}/AGENTS.md`,
  ])

  const visit = (currentPath) => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, entry.name)
      const relativePath = toPosix(path.relative(repoRoot, fullPath))

      if (entry.isDirectory()) {
        visit(fullPath)

        if (fs.existsSync(fullPath) && fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath)
        }
        continue
      }

      if (!allowed.has(relativePath)) {
        fs.rmSync(fullPath)
      }
    }
  }

  visit(root)
}

const smokeFixture = {
  version: 3,
  cases: [
    {
      id: 'check-before-pr',
      prompt: 'run check before pull request',
      expectedCommand: 'check',
      expectedStatus: 'active',
    },
    {
      id: 'files-changed-list',
      prompt: 'show changed files in workspace',
      routingHint: 'Need file-level changes list, not changed workspaces list',
      expectedCommand: 'files changed list',
      expectedStatus: 'active',
    },
    {
      id: 'run-unit-tests',
      prompt: 'run unit tests only',
      routingHint: 'Prefer plain unit test route, not checks namespace route',
      expectedCommand: 'test unit',
      expectedStatus: 'active',
    },
    {
      id: 'service-build',
      prompt: 'build service artifact',
      expectedCommand: 'service build',
      expectedStatus: 'active',
    },
    {
      id: 'set-version-atls',
      prompt: 'upgrade raijin with set version atls',
      expectedCommand: 'set version atls',
      expectedStatus: 'active',
    },
    {
      id: 'prefer-active-over-inactive',
      prompt: 'generate project and run check',
      expectedCommand: 'check',
      expectedStatus: 'active',
    },
    {
      id: 'inactive-generate-project',
      prompt: 'generate project scaffold',
      expectedCommand: '',
      expectedStatus: 'unavailable',
    },
    {
      id: 'no-route-unavailable',
      prompt: 'what is the distance to mars',
      expectedCommand: '',
      expectedStatus: 'unavailable',
      llmSkip: true,
    },
  ],
}

const stripLastGenerated = (value) => {
  const clone = JSON.parse(JSON.stringify(value))
  delete clone.lastGenerated
  return clone
}

const rootPackage = readJson('package.json')
const yarnCliPackage = readJson('yarn/cli/package.json')
const yarnRc = fs.readFileSync(path.join(repoRoot, '.yarnrc.yml'), 'utf8')

const bundlePlugins = [...yarnCliPackage['@yarnpkg/builder'].bundles.standard].sort(sortByLocale)
const pluginRegistry = loadPluginRegistry(bundlePlugins)
const commands = loadCommands(pluginRegistry)
const workspaces = loadWorkspacePackages()
const semantics = readSemantics()
const semanticsLookup = buildSemanticsLookup(semantics)

const activeCommands = commands
  .filter((command) => command.status === 'active')
  .map((command) => command.command)
const inactiveCommands = commands
  .filter((command) => command.status === 'inactive')
  .map((command) => command.command)

const activePlugins = [...pluginRegistry.values()]
  .filter((plugin) => plugin.inBundle && plugin.exported)
  .map((plugin) => plugin.packageName)
  .sort(sortByLocale)

const inactivePlugins = [...pluginRegistry.values()]
  .filter((plugin) => !plugin.inBundle || !plugin.exported)
  .map((plugin) => ({
    name: plugin.packageName,
    reason: plugin.inBundle
      ? 'plugin is in bundle but not exported from index'
      : 'plugin is not in bundle',
  }))
  .sort((left, right) => left.name.localeCompare(right.name))

const yarnPathMatch = yarnRc.match(/^\s*yarnPath:\s*(.+)\s*$/m)

const draftIndex = {
  environment: {
    nodeVersion: '22',
    requiresSourceEnv: true,
    requiredEnv: ['NODE_OPTIONS'],
    pnpEnableEsmLoader: /pnpEnableEsmLoader:\s*true/.test(yarnRc),
    yarnPath: yarnPathMatch ? yarnPathMatch[1].trim() : '',
  },
  bundle: {
    package: yarnCliPackage.name,
    bundleName: 'standard',
    pluginCount: bundlePlugins.length,
    plugins: bundlePlugins,
  },
  commands,
  workspaces,
  availability: {
    activeCommands,
    inactiveCommands,
    activePlugins,
    inactivePlugins,
  },
}

const indexPath = path.join(repoRoot, `${DOCS_DIR}/index.v1.json`)
let lastGenerated = new Date().toISOString()

if (fs.existsSync(indexPath)) {
  const previous = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

  if (
    JSON.stringify(stripLastGenerated(previous)) === JSON.stringify(stripLastGenerated(draftIndex))
  ) {
    lastGenerated =
      typeof previous.lastGenerated === 'string' ? previous.lastGenerated : lastGenerated
  }
}

const index = {
  ...draftIndex,
  lastGenerated,
}

writeJson(`${DOCS_DIR}/index.v1.json`, index)
writeJson(`${DOCS_DIR}/index.meta.v1.json`, {
  schemaVersion: 1,
  generatedBy: 'scripts/raijin/generate-artifacts.mjs',
  contentSha256: crypto
    .createHash('sha256')
    .update(JSON.stringify(stripLastGenerated(index)))
    .digest('hex'),
  packageManager: rootPackage.packageManager,
  workspaceCount: workspaces.length,
  commandCount: commands.length,
  activeCommandCount: activeCommands.length,
  inactiveCommandCount: inactiveCommands.length,
  semanticsSchemaVersion: semantics.schemaVersion,
  semanticsCommandCount: semantics.commands.length,
  semanticsWorkspaceCount: semantics.workspaces.length,
  lastGenerated,
})

writeText('README.md', `${renderRootReadme('ru')}\n`)
writeText('README_EN.md', `${renderRootReadme('en')}\n`)
writeText('docs/README.md', `${renderDocsRootReadme('en')}\n`)
writeText('docs/README.ru.md', `${renderDocsRootReadme('ru')}\n`)
writeText(`${DOCS_DIR}/README.md`, `${renderRaijinReadme(index, 'en')}\n`)
writeText(`${DOCS_DIR}/README.ru.md`, `${renderRaijinReadme(index, 'ru')}\n`)
writeText(`${DOCS_DIR}/quickstart.md`, `${renderQuickstart('en')}\n`)
writeText(`${DOCS_DIR}/quickstart.ru.md`, `${renderQuickstart('ru')}\n`)
writeText(`${DOCS_DIR}/commands.md`, renderCommandsDoc(commands, semanticsLookup, 'en'))
writeText(`${DOCS_DIR}/commands.ru.md`, renderCommandsDoc(commands, semanticsLookup, 'ru'))
writeText(`${DOCS_DIR}/packages.md`, renderPackagesDoc(workspaces, semanticsLookup, 'en'))
writeText(`${DOCS_DIR}/packages.ru.md`, renderPackagesDoc(workspaces, semanticsLookup, 'ru'))
writeJson(`${DOCS_DIR}/smoke-prompts.json`, smokeFixture)

cleanupAgentsDirectory()
writeText(`${AGENTS_DIR}/README.md`, renderAgentReadme())
writeText(`${AGENTS_DIR}/raijin-routing.md`, renderAgentRouting())
writeText(`${AGENTS_DIR}/AGENTS.md`, renderAgentsMd())

formatGeneratedFiles([
  `${DOCS_DIR}/index.v1.json`,
  `${DOCS_DIR}/index.meta.v1.json`,
  `${DOCS_DIR}/smoke-prompts.json`,
  'README.md',
  'README_EN.md',
  'docs/README.md',
  'docs/README.ru.md',
  `${DOCS_DIR}/README.md`,
  `${DOCS_DIR}/README.ru.md`,
  `${DOCS_DIR}/quickstart.md`,
  `${DOCS_DIR}/quickstart.ru.md`,
  `${DOCS_DIR}/commands.md`,
  `${DOCS_DIR}/commands.ru.md`,
  `${DOCS_DIR}/packages.md`,
  `${DOCS_DIR}/packages.ru.md`,
  `${AGENTS_DIR}/README.md`,
  `${AGENTS_DIR}/raijin-routing.md`,
  `${AGENTS_DIR}/AGENTS.md`,
])

console.log(
  [
    `Generated raijin artifacts: ${commands.length} commands`,
    `${workspaces.length} workspace packages`,
    `(active: ${activeCommands.length}, inactive: ${inactiveCommands.length})`,
    `semantics loaded: commands=${semantics.commands.length}, workspaces=${semantics.workspaces.length}`,
  ].join(' ')
)
