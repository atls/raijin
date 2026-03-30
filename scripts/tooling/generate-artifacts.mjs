import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

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

const toPosix = (value) => value.split(path.sep).join('/')

const walkFiles = (dirPath, predicate, output = []) => {
  if (!fs.existsSync(dirPath)) return output

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === '.idea' || entry.name === '.yarn' || entry.name === 'dist') {
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

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const inferPurpose = (packageName, group, language) => {
  const isRu = language === 'ru'
  const name = packageName || ''

  if (name.includes('/yarn-plugin-')) {
    const topic = name.split('/yarn-plugin-')[1] || 'custom'
    return isRu ? `Yarn-плагин для домена ${topic}` : `Yarn plugin for ${topic} domain`
  }

  if (name.includes('/yarn-cli')) {
    return isRu
      ? 'Входная точка кастомного yarn CLI и bundle-конфигурации'
      : 'Entrypoint for custom yarn CLI and bundle configuration'
  }

  if (name.includes('/yarn-')) {
    return isRu ? 'Вспомогательная утилита экосистемы yarn' : 'Utility package for yarn ecosystem'
  }

  if (name.includes('/code-')) {
    return isRu ? 'Библиотека code-утилит для инструментов raijin' : 'Code utility library used by raijin tooling'
  }

  if (name.includes('/cli-ui-')) {
    return isRu ? 'CLI UI-компонент для терминального интерфейса' : 'CLI UI component for terminal rendering'
  }

  if (group === 'config') {
    return isRu ? 'Пакет конфигурации для shared tooling' : 'Shared tooling configuration package'
  }

  if (group === 'runtime') {
    return isRu ? 'Runtime пакет для запуска инструментов' : 'Runtime package for tooling execution'
  }

  if (group === 'schematics') {
    return isRu ? 'Пакет генерации схем и шаблонов' : 'Schematics and template generation package'
  }

  if (group === 'webpack') {
    return isRu ? 'Webpack интеграция для экосистемы tools' : 'Webpack integration for tools ecosystem'
  }

  if (group === 'prettier') {
    return isRu ? 'Prettier-плагин и форматирование' : 'Prettier plugin and formatting utilities'
  }

  return isRu ? 'Назначение не описано в package.json' : 'Purpose is not described in package.json'
}

const loadWorkspacePackages = () => {
  const rootPackage = readJson('package.json')

  const workspaceRoots = [...new Set((rootPackage.workspaces || []).map((item) => item.split('/**')[0]))]

  const workspacePackageJsonFiles = workspaceRoots
    .flatMap((workspaceRoot) =>
      walkFiles(path.join(repoRoot, workspaceRoot), (filePath) => filePath.endsWith('package.json'))
    )
    .map((filePath) => toPosix(path.relative(repoRoot, filePath)))
    .sort((a, b) => a.localeCompare(b))

  return workspacePackageJsonFiles.map((relativePackageJsonPath) => {
    const packageJson = readJson(relativePackageJsonPath)
    const location = toPosix(path.dirname(relativePackageJsonPath))
    const group = location.split('/')[0]

    return {
      name: packageJson.name,
      location,
      group,
      private: Boolean(packageJson.private),
      description: typeof packageJson.description === 'string' ? packageJson.description.trim() : '',
      purposeEn: inferPurpose(packageJson.name, group, 'en'),
      purposeRu: inferPurpose(packageJson.name, group, 'ru'),
      scripts: Object.keys(packageJson.scripts || {}).sort((a, b) => a.localeCompare(b)),
      dependencyCount: Object.keys(packageJson.dependencies || {}).length,
      devDependencyCount: Object.keys(packageJson.devDependencies || {}).length,
      peerDependencyCount: Object.keys(packageJson.peerDependencies || {}).length,
    }
  })
}

const loadPluginRegistry = (bundlePlugins) => {
  const pluginDirs = fs
    .readdirSync(path.join(repoRoot, 'yarn'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('plugin-'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))

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
  const commandFiles = walkFiles(
    path.join(repoRoot, 'yarn'),
    (filePath) => /yarn\/plugin-[^/]+\/sources\/.+\.command\.(ts|tsx)$/.test(toPosix(path.relative(repoRoot, filePath)))
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
      source: relativePath,
      status: isActive ? 'active' : 'inactive',
      availabilityReason: isActive
        ? 'plugin in bundle and exported from plugin index'
        : pluginInfo.inBundle
          ? 'plugin is in bundle but not exported from plugin index'
          : 'plugin is not included in @atls/yarn-cli standard bundle',
    })
  }

  commands.sort((a, b) => {
    if (a.command !== b.command) return a.command.localeCompare(b.command)
    if (a.plugin !== b.plugin) return a.plugin.localeCompare(b.plugin)
    return a.source.localeCompare(b.source)
  })

  return commands
}

const renderQuickstart = (language) => {
  const isRu = language === 'ru'

  return [
    '# Tooling Quickstart',
    '',
    isRu
      ? 'Минимальный bootstrap для стабильной работы с кастомным yarn-бандлом `atls`'
      : 'Minimum bootstrap for stable work with the custom `atls` yarn bundle',
    '',
    '<!-- sync:preflight -->',
    '## 1. Preflight',
    '',
    '- Node.js: `22.x`',
    isRu
      ? '- Внутри `raijin` перед `yarn` командами выполняйте `source .env` и `export NODE_OPTIONS`'
      : '- Inside `raijin`, run `source .env` and `export NODE_OPTIONS` before `yarn` commands',
    '',
    '<!-- sync:bundle-install -->',
    isRu ? '## 2. Установка бандла в проект-потребитель' : '## 2. Install bundle in a consumer project',
    '',
    '- `yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs`',
    '',
    '<!-- sync:bundle-upgrade -->',
    isRu ? '## 3. Обновление установленного бандла' : '## 3. Upgrade installed bundle',
    '',
    '- `yarn set version atls`',
    '',
    '<!-- sync:verification -->',
    isRu ? '## 4. Базовая проверка' : '## 4. Basic verification',
    '',
    isRu
      ? '- `yarn check` запускает `format`, `typecheck`, `lint`'
      : '- `yarn check` runs `format`, `typecheck`, and `lint`',
    isRu
      ? '- Карта команд: `docs/tooling/commands.md` и `docs/tooling/commands.ru.md`'
      : '- Command map: `docs/tooling/commands.md` and `docs/tooling/commands.ru.md`',
    '',
  ].join('\n')
}

const renderCommandsDoc = (commands, language) => {
  const isRu = language === 'ru'
  const active = commands.filter((command) => command.status === 'active')
  const inactive = commands.filter((command) => command.status === 'inactive')

  const lines = [
    '# Tooling Commands',
    '',
    isRu
      ? 'Карта команд, извлечённая из `yarn/plugin-*` и bundle `@atls/yarn-cli`'
      : 'Command map extracted from `yarn/plugin-*` and `@atls/yarn-cli` bundle',
    '',
    '<!-- sync:active-commands -->',
    '## Active commands',
    '',
  ]

  for (const command of active) {
    lines.push(`### ${command.command}`)
    lines.push(isRu ? `- Плагин: \`${command.plugin}\`` : `- Plugin: \`${command.plugin}\``)
    lines.push(isRu ? `- Статус: \`${command.status}\`` : `- Status: \`${command.status}\``)
    lines.push(isRu ? `- Класс: \`${command.className}\`` : `- Class: \`${command.className}\``)
    lines.push(isRu ? `- Исходник: \`${command.source}\`` : `- Source: \`${command.source}\``)
    lines.push('')
  }

  lines.push('<!-- sync:inactive-commands -->')
  lines.push('## Inactive commands')
  lines.push('')

  for (const command of inactive) {
    lines.push(`### ${command.command}`)
    lines.push(isRu ? `- Плагин: \`${command.plugin}\`` : `- Plugin: \`${command.plugin}\``)
    lines.push(isRu ? `- Статус: \`${command.status}\`` : `- Status: \`${command.status}\``)
    lines.push(isRu ? `- Причина: ${command.availabilityReason}` : `- Reason: ${command.availabilityReason}`)
    lines.push(isRu ? `- Класс: \`${command.className}\`` : `- Class: \`${command.className}\``)
    lines.push(isRu ? `- Исходник: \`${command.source}\`` : `- Source: \`${command.source}\``)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

const renderPackagesDoc = (workspaces, language) => {
  const isRu = language === 'ru'

  const lines = [
    '# Tooling Packages',
    '',
    isRu
      ? 'Короткие карточки всех workspace-пакетов'
      : 'Short cards for all workspace packages',
    '',
    '<!-- sync:workspace-packages -->',
    '## Workspace packages',
    '',
  ]

  for (const workspace of workspaces) {
    lines.push(`### ${workspace.name}`)
    lines.push(isRu ? `- Локация: \`${workspace.location}\`` : `- Location: \`${workspace.location}\``)
    lines.push(isRu ? `- Группа: \`${workspace.group}\`` : `- Group: \`${workspace.group}\``)
    lines.push(
      isRu
        ? `- Видимость: \`${workspace.private ? 'private' : 'public'}\``
        : `- Visibility: \`${workspace.private ? 'private' : 'public'}\``
    )
    lines.push(
      isRu
        ? `- Назначение: ${workspace.description || workspace.purposeRu}`
        : `- Purpose: ${workspace.description || workspace.purposeEn}`
    )

    if (workspace.scripts.length > 0) {
      const scripts = workspace.scripts.map((script) => `\`${script}\``).join(', ')
      lines.push(isRu ? `- Скрипты: ${scripts}` : `- Scripts: ${scripts}`)
    } else {
      lines.push(isRu ? '- Скрипты: отсутствуют' : '- Scripts: none')
    }

    lines.push(
      isRu
        ? `- Зависимости: deps ${workspace.dependencyCount}, devDeps ${workspace.devDependencyCount}, peerDeps ${workspace.peerDependencyCount}`
        : `- Dependencies: deps ${workspace.dependencyCount}, devDeps ${workspace.devDependencyCount}, peerDeps ${workspace.peerDependencyCount}`
    )
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

const renderAgentReadme = () =>
  [
    '# Agent Adapter',
    '',
    'Thin adapter for coding agents. Source of truth is `docs/tooling`',
    '',
    '## Required read order',
    '',
    '1. `docs/tooling/quickstart.md`',
    '2. `docs/tooling/index.v1.json`',
    '3. `docs/tooling/commands.md`',
    '4. `docs/tooling/packages.md`',
    '',
    '## Routing constraints',
    '',
    '- Prefer commands with `status = active`',
    '- Treat `status = inactive` as unavailable',
    '- Validate command and plugin existence against `docs/tooling/index.v1.json`',
    '',
  ].join('\n')

const renderAgentRouting = () =>
  [
    '# Tooling Routing Rules',
    '',
    '1. Load `docs/tooling/index.v1.json`',
    '2. Match user intent to command path tokens',
    '3. Prefer `active` commands when multiple commands match',
    '4. If only `inactive` commands match, report unavailability',
    '5. For local `raijin` execution bootstrap with `source .env` and `export NODE_OPTIONS`',
    '',
  ].join('\n')

const smokeFixture = {
  version: 1,
  cases: [
    {
      id: 'check-before-pr',
      prompt: 'run check before pull request',
      expectedCommand: 'check',
      expectedStatus: 'active',
    },
    {
      id: 'files-changed-list',
      prompt: 'list changed files in workspace',
      expectedCommand: 'files changed list',
      expectedStatus: 'active',
    },
    {
      id: 'test-integration',
      prompt: 'run integration tests',
      expectedCommand: 'test integration',
      expectedStatus: 'active',
    },
    {
      id: 'test-unit',
      prompt: 'run only unit tests',
      expectedCommand: 'test unit',
      expectedStatus: 'active',
    },
    {
      id: 'service-build',
      prompt: 'build service bundle',
      expectedCommand: 'service build',
      expectedStatus: 'active',
    },
    {
      id: 'set-version-atls',
      prompt: 'run set version atls for this project',
      expectedCommand: 'set version atls',
      expectedStatus: 'active',
    },
    {
      id: 'generate-project-inactive',
      prompt: 'generate project scaffold',
      expectedCommand: 'generate project',
      expectedStatus: 'inactive',
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

const bundlePlugins = [...yarnCliPackage['@yarnpkg/builder'].bundles.standard].sort((a, b) => a.localeCompare(b))
const pluginRegistry = loadPluginRegistry(bundlePlugins)
const commands = loadCommands(pluginRegistry)
const workspaces = loadWorkspacePackages()

const activeCommands = commands.filter((command) => command.status === 'active').map((command) => command.command)
const inactiveCommands = commands.filter((command) => command.status === 'inactive').map((command) => command.command)

const activePlugins = [...pluginRegistry.values()]
  .filter((plugin) => plugin.inBundle && plugin.exported)
  .map((plugin) => plugin.packageName)
  .sort((a, b) => a.localeCompare(b))

const inactivePlugins = [...pluginRegistry.values()]
  .filter((plugin) => !plugin.inBundle || !plugin.exported)
  .map((plugin) => ({
    name: plugin.packageName,
    reason: plugin.inBundle ? 'plugin is in bundle but not exported from index' : 'plugin is not in bundle',
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

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

const indexPath = path.join(repoRoot, 'docs/tooling/index.v1.json')
let lastGenerated = new Date().toISOString()

if (fs.existsSync(indexPath)) {
  const previous = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

  if (JSON.stringify(stripLastGenerated(previous)) === JSON.stringify(stripLastGenerated(draftIndex))) {
    lastGenerated = typeof previous.lastGenerated === 'string' ? previous.lastGenerated : lastGenerated
  }
}

const index = {
  ...draftIndex,
  lastGenerated,
}

writeJson('docs/tooling/index.v1.json', index)
writeJson('docs/tooling/index.meta.v1.json', {
  schemaVersion: 1,
  generatedBy: 'scripts/tooling/generate-artifacts.mjs',
  contentSha256: crypto.createHash('sha256').update(JSON.stringify(stripLastGenerated(index))).digest('hex'),
  packageManager: rootPackage.packageManager,
  workspaceCount: workspaces.length,
  commandCount: commands.length,
  activeCommandCount: activeCommands.length,
  inactiveCommandCount: inactiveCommands.length,
  lastGenerated,
})

writeText('docs/tooling/README.md', '# Tooling Docs\n\nGenerated by `node scripts/tooling/generate-artifacts.mjs`\n')
writeText('docs/tooling/quickstart.md', renderQuickstart('en'))
writeText('docs/tooling/quickstart.ru.md', renderQuickstart('ru'))
writeText('docs/tooling/commands.md', renderCommandsDoc(commands, 'en'))
writeText('docs/tooling/commands.ru.md', renderCommandsDoc(commands, 'ru'))
writeText('docs/tooling/packages.md', renderPackagesDoc(workspaces, 'en'))
writeText('docs/tooling/packages.ru.md', renderPackagesDoc(workspaces, 'ru'))
writeJson('docs/tooling/smoke-prompts.json', smokeFixture)
writeText('.agents/README.md', renderAgentReadme())
writeText('.agents/tooling-routing.md', renderAgentRouting())

console.log(
  `Generated tooling artifacts: ${commands.length} commands, ${workspaces.length} workspace packages (${activeCommands.length} active, ${inactiveCommands.length} inactive)`
) // eslint-disable-line no-console
