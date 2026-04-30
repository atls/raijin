import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const indexPath = path.join(repoRoot, 'docs/raijin/index.v1.json')
const semanticsPath = path.join(repoRoot, 'docs/raijin/semantics.v1.json')

const apiKey = process.env.OPENAI_API_KEY
const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const model = process.env.OPENAI_MODEL || process.env.OPENAI_TOOLING_MODEL || 'gpt-5.4-mini'
const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 180000)
const fallbackOnly = process.argv.includes('--fallback')

const readJson = (absolutePath) => JSON.parse(fs.readFileSync(absolutePath, 'utf8'))

const normalizeTags = (tags, fallbackTags) => {
  const source = Array.isArray(tags) ? tags : []
  const value = [...new Set(source.map((tag) => String(tag).trim()).filter(Boolean))]
  return (value.length > 0 ? value : fallbackTags).sort((left, right) => left.localeCompare(right))
}

const normalizeLocalePair = (value, fallbackEn, fallbackRu) => ({
  en: typeof value?.en === 'string' && value.en.trim().length > 0 ? value.en.trim() : fallbackEn,
  ru: typeof value?.ru === 'string' && value.ru.trim().length > 0 ? value.ru.trim() : fallbackRu,
})

const extractOutputText = (response) => {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const texts = []

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') {
        texts.push(content.text)
      }
    }
  }

  return texts.join('\n').trim()
}

const parseJsonObject = (text) => {
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')

  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error(`Response does not contain JSON object: ${text}`)
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1))
}

const toRows = (items, mapper) => items.map((item) => mapper(item)).join('\n')

const chunk = (items, size) => {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

const callOpenAI = async (body) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await response.text()
      throw new Error(`OpenAI API error ${response.status}: ${payload}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

const extractEntries = (payload, key) => {
  if (Array.isArray(payload?.[key])) return payload[key]
  if (Array.isArray(payload?.entries)) return payload.entries
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const fallbackCommandEntry = (command) => ({
  id: command.command,
  groupTags: [command.domain, command.status],
  purpose: {
    en: `Runs "${command.command}" in ${command.domain} raijin domain`,
    ru: `Запускает "${command.command}" в raijin-домене ${command.domain}`,
  },
  whenToUse: {
    en: `Use when ${command.command} is needed in project workflow`,
    ru: `Используйте, когда в рабочем потоке нужен сценарий ${command.command}`,
  },
  example:
    command.status === 'inactive'
      ? {
          en: 'unavailable while inactive',
          ru: 'недоступно, пока команда inactive',
        }
      : {
          en: `yarn ${command.command}`,
          ru: `yarn ${command.command}`,
        },
})

const fallbackWorkspaceEntry = (workspace) => ({
  id: workspace.name,
  groupTags: [workspace.group, workspace.private ? 'private' : 'public'],
  purpose: {
    en:
      workspace.description ||
      workspace.purposeEn ||
      `Workspace package in ${workspace.group} group`,
    ru:
      workspace.description || workspace.purposeRu || `Workspace-пакет в группе ${workspace.group}`,
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

const normalizeCommandEntry = (raw, fallback) => ({
  id: fallback.id,
  groupTags: normalizeTags(raw?.groupTags, fallback.groupTags),
  purpose: normalizeLocalePair(raw?.purpose, fallback.purpose.en, fallback.purpose.ru),
  whenToUse: normalizeLocalePair(raw?.whenToUse, fallback.whenToUse.en, fallback.whenToUse.ru),
  example: normalizeLocalePair(raw?.example, fallback.example.en, fallback.example.ru),
})

const normalizeWorkspaceEntry = (raw, fallback) => ({
  id: fallback.id,
  groupTags: normalizeTags(raw?.groupTags, fallback.groupTags),
  purpose: normalizeLocalePair(raw?.purpose, fallback.purpose.en, fallback.purpose.ru),
  whenToUse: normalizeLocalePair(raw?.whenToUse, fallback.whenToUse.en, fallback.whenToUse.ru),
  example: normalizeLocalePair(raw?.example, fallback.example.en, fallback.example.ru),
})

const generateCommandEntries = async (commands) => {
  const rows = chunk(commands, 25)
  const output = []

  for (const batch of rows) {
    const body = {
      model,
      temperature: 0,
      max_output_tokens: 8000,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'You write short semantics for Yarn command routing docs.',
                'Return only JSON object with "commands" array.',
                'Each array item must have keys:',
                'id, groupTags, purpose, whenToUse, example',
                'purpose/whenToUse/example must be objects with {en, ru}.',
                'No markdown, no extra keys, no prose outside JSON.',
              ].join('\n'),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Generate semantics for command rows:',
                'row format: id|plugin|domain|status|source',
                toRows(batch, (entry) =>
                  [entry.command, entry.plugin, entry.domain, entry.status, entry.source].join('|')
                ),
              ].join('\n'),
            },
          ],
        },
      ],
    }

    const response = await callOpenAI(body)
    const rawText = extractOutputText(response)
    const parsed = parseJsonObject(rawText)
    output.push(...extractEntries(parsed, 'commands'))
  }

  return output
}

const generateWorkspaceEntries = async (workspaces) => {
  const rows = chunk(workspaces, 25)
  const output = []

  for (const batch of rows) {
    const body = {
      model,
      temperature: 0,
      max_output_tokens: 8000,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'You write short semantics for monorepo workspace packages.',
                'Return only JSON object with "workspaces" array.',
                'Each array item must have keys:',
                'id, groupTags, purpose, whenToUse, example',
                'purpose/whenToUse/example must be objects with {en, ru}.',
                'No markdown, no extra keys, no prose outside JSON.',
              ].join('\n'),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Generate semantics for workspace rows:',
                'row format: id|group|private|location|scripts',
                toRows(batch, (entry) =>
                  [
                    entry.name,
                    entry.group,
                    entry.private ? 'private' : 'public',
                    entry.location,
                    entry.scripts.join(','),
                  ].join('|')
                ),
              ].join('\n'),
            },
          ],
        },
      ],
    }

    const response = await callOpenAI(body)
    const rawText = extractOutputText(response)
    const parsed = parseJsonObject(rawText)
    output.push(...extractEntries(parsed, 'workspaces'))
  }

  return output
}

if (!fs.existsSync(indexPath)) {
  console.error('docs/raijin/index.v1.json is required. Run yarn raijin:generate first')
  process.exit(1)
}

if (!fallbackOnly && !apiKey) {
  console.error(
    'OPENAI_API_KEY is required for raijin semantics generation (or use --fallback for offline bootstrap)'
  )
  process.exit(1)
}

const index = readJson(indexPath)
const existing = fs.existsSync(semanticsPath)
  ? readJson(semanticsPath)
  : { commands: [], workspaces: [] }

const existingCommandMap = new Map((existing.commands || []).map((entry) => [entry.id, entry]))
const existingWorkspaceMap = new Map((existing.workspaces || []).map((entry) => [entry.id, entry]))

let llmCommandEntries = []
let llmWorkspaceEntries = []

if (fallbackOnly) {
  console.log('Generating semantics in fallback mode (no OpenAI API calls)')
} else {
  console.log(`Generating command semantics with model=${model}`)
  llmCommandEntries = await generateCommandEntries(index.commands)
  console.log(`Generating workspace semantics with model=${model}`)
  llmWorkspaceEntries = await generateWorkspaceEntries(index.workspaces)
}

const llmCommandMap = new Map((llmCommandEntries || []).map((entry) => [entry.id, entry]))
const llmWorkspaceMap = new Map((llmWorkspaceEntries || []).map((entry) => [entry.id, entry]))

const commands = index.commands
  .map((command) => {
    const fallback = fallbackCommandEntry(command)
    return normalizeCommandEntry(
      llmCommandMap.get(command.command) || existingCommandMap.get(command.command) || fallback,
      fallback
    )
  })
  .sort((left, right) => left.id.localeCompare(right.id))

const workspaces = index.workspaces
  .map((workspace) => {
    const fallback = fallbackWorkspaceEntry(workspace)
    return normalizeWorkspaceEntry(
      llmWorkspaceMap.get(workspace.name) || existingWorkspaceMap.get(workspace.name) || fallback,
      fallback
    )
  })
  .sort((left, right) => left.id.localeCompare(right.id))

const sourceDigest = crypto
  .createHash('sha256')
  .update(
    JSON.stringify({
      commandIds: index.commands.map((entry) => entry.command),
      workspaceIds: index.workspaces.map((entry) => entry.name),
    })
  )
  .digest('hex')

const semantics = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  model: fallbackOnly ? 'fallback-template' : model,
  sourceDigest,
  commands,
  workspaces,
}

fs.mkdirSync(path.dirname(semanticsPath), { recursive: true })
fs.writeFileSync(semanticsPath, `${JSON.stringify(semantics, null, 2)}\n`)

console.log(
  `Semantics generated: ${commands.length} commands, ${workspaces.length} workspaces -> docs/raijin/semantics.v1.json`
)
