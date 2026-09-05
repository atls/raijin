import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { loadRuntimeCliSurface } from './cli-surface/runtime-inventory.mjs'

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
 * @typedef {{
 *   availability: { activeCommands: Array<string>, inactiveCommands: Array<string> },
 *   commands: Array<Command>,
 *   lastGenerated: string,
 *   workspaces: Array<Workspace>,
 * }} DocumentationIndex
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

/**
 * @param {string} relativePath
 * @param {unknown} value
 */
const writeJson = (relativePath, value) => {
  writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`)
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

const COVER_IMAGE_URL =
  'https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282'

/** @type {Record<string, Array<string>>} */
const COMMAND_EXAMPLES = {
  check: ['yarn check', 'yarn check yarn/plugin-check/sources'],
}

/** @type {Record<string, { en: Array<string>, ru: Array<string> }>} */
const COMMAND_NOTES = {
  'image pack': {
    en: [
      '`packConfiguration` defaults to `ghcr.io/atls/buildpack-yarn-workspace:24`.',
      '`packConfiguration.builderTag` selects the supported Node/buildpack channel.',
      '`packConfiguration.buildpackVersion` pins an immutable buildpack tag for rollback.',
      '`packConfiguration.buildpack` overrides the full buildpack reference.',
    ],
    ru: [
      '`packConfiguration` по умолчанию использует `ghcr.io/atls/buildpack-yarn-workspace:24`.',
      '`packConfiguration.builderTag` выбирает поддерживаемый Node/buildpack-канал.',
      '`packConfiguration.buildpackVersion` фиксирует неизменяемый buildpack tag для rollback.',
      '`packConfiguration.buildpack` переопределяет полную buildpack-ссылку.',
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

/**
 * @param {string} basePath
 * @param {Language} language
 */
const linkByLanguage = (basePath, language) => `${basePath}${language === 'ru' ? '.ru' : ''}.md`

/** @param {Language} language */
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
    '<!-- sync:root-what -->',
    '',
    isRu ? '## Что это' : '## What this is',
    '',
    isRu
      ? 'Raijin — это подход к работе в едином инженерном контуре, поставляемый как кастомный Yarn-бандл `atls`'
      : 'Raijin is an engineering operating model for a unified delivery contour, shipped as the custom `atls` Yarn bundle',
    isRu
      ? 'Он объединяет команды вокруг строгих стандартов и мощных контрактов, чтобы повышать предсказуемость поставки и реальную производительность'
      : 'It aligns teams on strict standards and strong contracts to increase delivery predictability and real engineering throughput',
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
    'yarn init @atls/raijin --type project',
    '```',
    '',
    isRu
      ? 'Для библиотечного каркаса используйте `--type library`'
      : 'Use `--type library` for the library scaffold',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Создаётся каркас проекта и устанавливается версионная среда выполнения Raijin'
      : '- Project scaffold is created and the versioned Raijin runtime is installed',
    isRu
      ? '- `.yarnrc.yml` сразу указывает на стабильный файл `.yarn/releases/yarn.mjs`'
      : '- `.yarnrc.yml` points directly to the stable `.yarn/releases/yarn.mjs` file',
    isRu
      ? '- Каркас проекта и первичная синхронизация создаются автоматически'
      : '- The project scaffold and first sync are generated automatically',
    isRu
      ? '- Команды `raijin` становятся доступны через `yarn`'
      : '- Raijin commands are available via `yarn`',
    '',
    isRu ? '### Существующий проект' : '### Existing project',
    '',
    '```bash',
    'yarn dlx @atls/raijin init --type project',
    '```',
    '',
    isRu
      ? 'Для библиотечного каркаса используйте `--type library`'
      : 'Use `--type library` for the library scaffold',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Проект получает среду выполнения Raijin, каркас и первичную синхронизацию; проверки перед коммитом настраиваются отдельно'
      : '- The project gets the Raijin runtime, scaffold, and first sync; pre-commit checks are configured separately',
    '',
    isRu ? '### Перед первым коммитом' : '### Before the first commit',
    '',
    isRu
      ? `После подключения нового или существующего проекта выполните [настройку проверок перед коммитом](./${quickstartPath}#staged-checks). Raijin v2 требует явную конфигурацию lint-staged, принадлежащую проекту. Установленный hook вызывает \`yarn commit staged\`; без конфигурации коммит с подготовленными файлами завершится ошибкой.`
      : `After connecting a new or existing project, complete the [pre-commit check setup](./${quickstartPath}#staged-checks). Raijin v2 requires an explicit project-owned lint-staged configuration. The installed hook calls \`yarn commit staged\`; without configuration, a commit with staged files fails.`,
    '',
    isRu ? '### Обновление' : '### Upgrade',
    '',
    '```bash',
    'yarn set version atls',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Бандл обновляется до последней доступной версии штатным механизмом Yarn'
      : '- The bundle is upgraded to the latest available version through Yarn',
    '',
    isRu
      ? `При переходе на v2 выполните [тот же шаг настройки](./${quickstartPath}#staged-checks) до следующего коммита. Неявная конфигурация Raijin больше не используется; существующие native-конфиги lint-staged сохраняйте и проверяйте.`
      : `When upgrading to v2, complete the [same configuration step](./${quickstartPath}#staged-checks) before the next commit. Raijin no longer supplies an implicit configuration; preserve and verify existing native lint-staged configs.`,
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
      ? `2. Настройте [проверки перед коммитом](./${quickstartPath}#staged-checks) для каждого самостоятельного проекта`
      : `2. Configure [pre-commit checks](./${quickstartPath}#staged-checks) for each independent project`,
    isRu
      ? '3. Зафиксируйте конфигурацию проверок вместе с изменениями `.yarn/releases` и `.yarnrc.yml`'
      : '3. Commit the check configuration together with `.yarn/releases` and `.yarnrc.yml` changes',
    isRu
      ? '4. Обновляйте бандл командой `yarn set version atls` по мере выхода новых версий'
      : '4. Update with `yarn set version atls` when newer bundle versions are released',
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

/** @param {Language} language */
const renderDocsRootReadme = (language) => {
  const isRu = language === 'ru'
  const raijinRouterPath = linkByLanguage('raijin/README', language)
  const quickstartPath = linkByLanguage('raijin/quickstart', language)
  const commandsPath = linkByLanguage('raijin/commands', language)
  const packagesPath = linkByLanguage('raijin/packages', language)
  const verificationPath = 'raijin/verification.md'

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
      ? `- Нужно понять владельцев проверок: [${verificationPath}](./${verificationPath})`
      : `- Need repository verification ownership: [${verificationPath}](./${verificationPath})`,
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
    `5. [${verificationPath}](./${verificationPath})`,
    '',
  ].join('\n')
}

/**
 * @param {DocumentationIndex} index
 * @param {Language} language
 */
const renderRaijinReadme = (index, language) => {
  const isRu = language === 'ru'
  const quickstartPath = linkByLanguage('quickstart', language)
  const commandsPath = linkByLanguage('commands', language)
  const packagesPath = linkByLanguage('packages', language)
  const verificationPath = 'verification.md'

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
    isRu
      ? `- Разобраться с владельцами проверок: [${verificationPath}](./${verificationPath})`
      : `- Understand repository verification ownership: [${verificationPath}](./${verificationPath})`,
    '',
    '<!-- sync:router-read-order -->',
    '',
    isRu ? '## Порядок чтения' : '## Read order',
    '',
    `1. [${quickstartPath}](./${quickstartPath})`,
    `2. [${commandsPath}](./${commandsPath})`,
    `3. [${packagesPath}](./${packagesPath})`,
    `4. [${verificationPath}](./${verificationPath})`,
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

/** @param {Language} language */
const renderQuickstart = (language) => {
  const isRu = language === 'ru'

  return [
    isRu ? '# Быстрый старт Raijin' : '# Raijin Quickstart',
    '',
    isRu
      ? 'Минимальный сценарий создания или подключения проекта к Raijin'
      : 'Minimal flow for creating or connecting a project to Raijin',
    '',
    '<!-- sync:preflight -->',
    isRu ? '## 1. Предпосылки' : '## 1. Prerequisites',
    '',
    isRu ? '- Node.js: `>= 24` (не ниже `24`)' : '- Node.js: `>= 24`',
    isRu ? '- Yarn: `>= 4` (не ниже `4`)' : '- Yarn: `>= 4`',
    isRu
      ? '- Raijin поддерживает только Yarn PnP и ESM; режим `node-modules` и CommonJS не входят в контракт быстрого старта'
      : '- Raijin supports only Yarn PnP and ESM; `node-modules` and CommonJS are outside the quickstart contract',
    isRu ? '- Для нового проекта: пустая директория' : '- For a new project: an empty directory',
    isRu
      ? '- Для существующего проекта: `package.json` в корне проекта'
      : '- For an existing project: `package.json` in the project root',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu ? '- Команда `yarn --version` выполняется' : '- `yarn --version` works',
    '',
    '<!-- sync:new-project -->',
    isRu ? '## 2. Новый проект' : '## 2. New project',
    '',
    '```bash',
    'yarn init @atls/raijin --type project',
    '```',
    '',
    isRu
      ? 'Для библиотечного каркаса используйте `--type library`'
      : 'Use `--type library` for the library scaffold',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Создаётся `package.json`, если его ещё не было, а `packageManager` приводится к значению из манифеста установленной среды выполнения'
      : '- `package.json` is created when it does not exist yet, and `packageManager` is normalized to the installed runtime manifest value',
    isRu
      ? '- Среда выполнения Raijin скачивается из файла релиза GitHub, проверяется по `sha256` и сохраняется как `.yarn/releases/yarn.mjs`'
      : '- Raijin runtime is downloaded from the GitHub Release asset, verified by `sha256`, and stored as `.yarn/releases/yarn.mjs`',
    isRu
      ? '- `.yarnrc.yml` сразу получает `nodeLinker: pnp` и финальный `yarnPath` без временного файла'
      : '- `.yarnrc.yml` gets `nodeLinker: pnp` and the final `yarnPath` directly without a temporary file',
    isRu
      ? '- Проектный каркас создаётся через встроенную коллекцию Raijin'
      : '- Project scaffold is created through the embedded Raijin collection',
    isRu
      ? '- Команды из бандла (`check`, `files changed list` и другие) становятся доступны'
      : '- Bundle commands (`check`, `files changed list`, etc.) become available',
    '',
    isRu
      ? 'Перед первым коммитом обязательно выполните [настройку проверок](#staged-checks). Создание каркаса не создаёт конфигурацию lint-staged.'
      : 'Before the first commit, complete the required [check configuration](#staged-checks). Scaffolding does not create a lint-staged configuration.',
    '',
    '<!-- sync:existing-project -->',
    isRu ? '## 3. Существующий проект' : '## 3. Existing project',
    '',
    '```bash',
    'yarn dlx @atls/raijin init --type project',
    '```',
    '',
    isRu
      ? 'Для библиотечного каркаса используйте `--type library`'
      : 'Use `--type library` for the library scaffold',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Установленный проект получает публичный пакет `@atls/raijin`, среду выполнения Raijin, проектный каркас, первичную синхронизацию и значение `packageManager` из манифеста установленной среды выполнения'
      : '- Existing project gets the public `@atls/raijin` package, Raijin runtime, project scaffold, first sync, and `packageManager` from the installed runtime manifest',
    '',
    isRu
      ? 'До коммита изменений подключения выполните [настройку проверок](#staged-checks). Существующую конфигурацию lint-staged сохраняйте; заменять её примером не нужно.'
      : 'Before committing the setup changes, complete the [check configuration](#staged-checks). Preserve any existing lint-staged configuration; do not replace it with the example.',
    '',
    '<!-- sync:bundle-upgrade -->',
    isRu ? '## 4. Обновление установленного бандла' : '## 4. Upgrade installed bundle',
    '',
    '```bash',
    'yarn set version atls',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Бандл обновлён до последней доступной версии, а `packageManager` приведён к значению из манифеста установленной среды выполнения'
      : '- Bundle is upgraded to the latest available version, and `packageManager` is normalized to the installed runtime manifest value',
    '',
    isRu
      ? 'При переходе на v2 выполните следующий шаг до первого коммита с обновлённым бандлом: неявная конфигурация проверок из v1 удалена.'
      : 'When upgrading to v2, complete the following step before the first commit with the updated bundle: the implicit v1 check configuration has been removed.',
    '',
    '<!-- sync:staged-checks -->',
    '<a id="staged-checks"></a>',
    '',
    isRu ? '## 5. Проверки перед коммитом' : '## 5. Pre-commit checks',
    '',
    isRu
      ? 'Этот шаг обязателен для новых проектов, подключения существующих проектов и перехода на v2. Установленный Git hook вызывает `yarn commit staged`. Raijin не подставляет конфигурацию по умолчанию: без неё lint-staged блокирует коммит с подготовленными файлами.'
      : 'This step is required for new projects, connecting existing projects, and upgrading to v2. The installed Git hook calls `yarn commit staged`. Raijin supplies no default configuration: without one, lint-staged blocks a commit with staged files.',
    '',
    isRu
      ? 'Сначала проверьте существующие настройки. Поле `lint-staged` в `package.json`, `.lintstagedrc` в JSON/YAML и `lint-staged.config.*` остаются допустимыми native-форматами. Сохраняйте выбранный формат, команды и исключения проекта; не создавайте конкурирующую конфигурацию.'
      : "Check existing settings first. The `lint-staged` field in `package.json`, JSON/YAML `.lintstagedrc` files, and `lint-staged.config.*` remain valid native formats. Preserve the project's chosen format, commands, and exclusions; do not create a competing configuration.",
    '',
    isRu
      ? 'Если конфигурации ещё нет, для одного Raijin PnP/ESM-проекта с TypeScript и тестами `*.test.ts`/`*.spec.ts`, исполняемыми Node, создайте в корне `.lintstagedrc.json`:'
      : 'If there is no configuration yet, for a single Raijin PnP/ESM project with TypeScript and Node-run `*.test.ts`/`*.spec.ts` tests, create `.lintstagedrc.json` at its root:',
    '',
    '```json',
    '{',
    '  "*.{yml,yaml,json,graphql,md}": "yarn format",',
    '  "*.{js,mjs,cjs,jsx,ts,tsx}": ["yarn format", "yarn lint"],',
    '  "*.{ts,tsx}": "yarn typecheck",',
    '  "*.{test,spec}.{ts,tsx}": "yarn test unit"',
    '}',
    '```',
    '',
    isRu
      ? 'Каждый самостоятельный Yarn-проект внутри того же Git-репозитория задаёт конфигурацию в своём каталоге: lint-staged использует ближайшую и не объединяет её с корневой. Корневые проверки backend не должны выполнять проверки независимого клиента.'
      : 'Each independent Yarn project in the same Git repository defines its configuration in its own directory: lint-staged uses the nearest config and does not merge it with the root config. Root backend checks must not run checks for an independent client.',
    '',
    isRu
      ? 'Клиент с TypeScript и Jest использует собственный компилятор и `yarn run test`, если его script `test` запускает Jest; зависимость от Raijin ему не требуется. Для проверки всего `tsconfig.json` без добавления staged-путей используйте JS-конфигурацию lint-staged с callback, например `() => "yarn exec tsc --noEmit -p tsconfig.json"`. Конфигурации должны покрывать все обязательные проверки; отсутствие клиентского конфига не должно оставлять его файлы без проверок.'
      : 'A TypeScript/Jest client uses its own compiler and `yarn run test` when its `test` script runs Jest; it does not need a Raijin dependency. To check an entire `tsconfig.json` without appending staged paths, use a lint-staged JS configuration callback such as `() => "yarn exec tsc --noEmit -p tsconfig.json"`. Configurations must cover all required checks; a missing client config must not leave its files unchecked.',
    '',
    isRu
      ? 'После настройки добавьте конфигурацию и нужные изменения в Git index и выполните из корня репозитория:'
      : 'After configuring checks, stage the configuration and intended changes, then run from the repository root:',
    '',
    '```bash',
    'yarn commit staged',
    '```',
    '',
    isRu
      ? 'Убедитесь, что выполнены проверки каждого затронутого проекта, затем сделайте обычный коммит. Пустой staged-набор или отсутствие совпавших файлов не доказывает, что проверки настроены. Отсутствующую команду или обязательную конфигурацию исправляйте; обходить hook не нужно.'
      : 'Confirm that checks ran for every affected project, then make a normal commit. An empty staged set or no matching files does not prove that checks are configured. Fix missing commands or required configuration rather than bypassing the hook.',
    '',
    '<!-- sync:verification -->',
    isRu ? '## 6. Базовая проверка' : '## 6. Basic verification',
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
    '<!-- sync:project-generation-check -->',
    isRu ? '## 7. Локальная проверка генерации проекта' : '## 7. Local project generation check',
    '',
    '```bash',
    'yarn raijin:smoke:cli project-generation',
    '```',
    '',
    isRu ? 'Ожидаемый результат:' : 'Expected result:',
    isRu
      ? '- Временный проект создаётся через встроенную коллекцию публичного пакета `@atls/raijin`'
      : '- Temporary fixture is created through the collection embedded in public `@atls/raijin`',
    isRu
      ? '- Проверка падает, если вспомогательный код или Markdown-документация вызывают отключённую команду'
      : '- Check fails if helper or Markdown docs invoke an inactive command',
    '',
    '<!-- sync:consumer-howto -->',
    isRu ? '## 8. Как использовать в чужом проекте' : '## 8. How to use in an external project',
    '',
    isRu
      ? '- Для первого подключения используйте `yarn init @atls/raijin --type project` или `yarn dlx @atls/raijin init --type project`; для библиотеки замените тип на `library`'
      : '- Use `yarn init @atls/raijin --type project` or `yarn dlx @atls/raijin init --type project` for the first setup; use `library` for the library scaffold',
    isRu
      ? '- После первого подключения обновляйте бандл командой `yarn set version atls`'
      : '- After the first setup, keep the bundle current with `yarn set version atls`',
    isRu
      ? '- До первого коммита или коммита обновления до v2 выполните [настройку проверок](#staged-checks) и включите конфигурацию в коммит вместе с `.yarn/releases` и `.yarnrc.yml`'
      : '- Before the first commit or a v2 upgrade commit, complete the [check configuration](#staged-checks) and commit it together with `.yarn/releases` and `.yarnrc.yml`',
    isRu
      ? '- Для CI используйте те же команды, что и локально, чтобы избежать расхождения поведения'
      : '- Use the same commands in CI and locally to avoid behavior drift',
    '',
  ].join('\n')
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
      : (COMMAND_EXAMPLES[command.command] ?? [`yarn ${command.command}`])

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

    if (domain === 'checks') {
      lines.push(
        isRu
          ? '> Важно: `checks` рассчитан на запуск в раннерах GitHub Actions, требует `GITHUB_TOKEN` и контекст проверки (`context.repo`, `GITHUB_SHA`)'
          : '> Important: `checks` targets GitHub Actions runners, requires `GITHUB_TOKEN`, and relies on check context (`context.repo`, `GITHUB_SHA`)'
      )
      lines.push('')
    }

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

const smokeFixture = {
  version: 4,
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
      id: 'generate-project',
      prompt: 'generate project scaffold',
      expectedCommand: 'generate project',
      expectedStatus: 'active',
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

/** @param {Record<string, unknown>} value */
const stripLastGenerated = (value) => {
  const clone = JSON.parse(JSON.stringify(value))
  delete clone.lastGenerated
  return clone
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

const rootPackage = readJson('package.json')
const yarnCliPackage = readJson('yarn/cli/package.json')
const yarnRc = fs.readFileSync(path.join(repoRoot, '.yarnrc.yml'), 'utf8')
const runtimePath = path.join(repoRoot, '.yarn/releases/yarn.mjs')
const runtimeCliSurface = await loadRuntimeCliSurface({ cwd: repoRoot, runtimePath })
const bundlePlugins = runtimeCliSurface.plugins
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
const activePlugins = bundlePlugins.filter((plugin) => plugin.startsWith('@atls/'))
/** @type {Array<string>} */
const inactivePlugins = []

const yarnPathMatch = yarnRc.match(/^\s*yarnPath:\s*(.+)\s*$/m)

const draftIndex = {
  environment: {
    nodeVersion: '24',
    requiresSourceEnv: false,
    requiredEnv: [],
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
writeText(`${DOCS_DIR}/commands.md`, renderCommandsDoc(commands, 'en'))
writeText(`${DOCS_DIR}/commands.ru.md`, renderCommandsDoc(commands, 'ru'))
writeText(`${DOCS_DIR}/packages.md`, renderPackagesDoc(workspaces, 'en'))
writeText(`${DOCS_DIR}/packages.ru.md`, renderPackagesDoc(workspaces, 'ru'))
writeJson(`${DOCS_DIR}/smoke-prompts.json`, smokeFixture)

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
])

console.log(
  [
    `Generated raijin artifacts: ${commands.length} commands`,
    `${workspaces.length} workspace packages`,
    `(active: ${activeCommands.length}, inactive: ${inactiveCommands.length})`,
  ].join(' ')
)
