import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_SERVICE_ACCOUNT_KEY
const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const model = process.env.OPENAI_MODEL || process.env.OPENAI_TOOLING_MODEL || 'gpt-5.4-mini'
const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 120000)
const minimumScore = 4
const minimumStrongActiveScore = 7
const shortlistMaxItems = 6
const shortlistScoreGap = 8

if (!apiKey) {
  console.error('OPENAI_API_KEY or OPENAI_SERVICE_ACCOUNT_KEY is required')
  process.exit(1)
}

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeToken = (token) => {
  const normalized = normalize(token)
  if (normalized.length > 4 && normalized.endsWith('s')) {
    return normalized.slice(0, -1)
  }

  return normalized
}

const tokenize = (value) =>
  normalize(value)
    .split(' ')
    .map((token) => normalizeToken(token))
    .filter(Boolean)

const hasContiguousPhrase = (tokens, phraseTokens) => {
  if (phraseTokens.length === 0 || phraseTokens.length > tokens.length) return false

  for (let index = 0; index <= tokens.length - phraseTokens.length; index += 1) {
    let matched = true

    for (let offset = 0; offset < phraseTokens.length; offset += 1) {
      if (tokens[index + offset] !== phraseTokens[offset]) {
        matched = false
        break
      }
    }

    if (matched) return true
  }

  return false
}

const tokenizeSemantics = (semantics) =>
  tokenize(
    [
      semantics.purpose?.en,
      semantics.purpose?.ru,
      semantics.whenToUse?.en,
      semantics.whenToUse?.ru,
      semantics.example?.en,
      semantics.example?.ru,
      ...(semantics.groupTags || []),
    ].join(' ')
  )

const hasAnyToken = (promptTokensSet, aliases) =>
  aliases.some((alias) => {
    const token = normalizeToken(alias)
    if (!token) return false
    if (promptTokensSet.has(token)) return true

    return [...promptTokensSet].some(
      (promptToken) =>
        (promptToken.length >= 4 && token.startsWith(promptToken.slice(0, 4))) ||
        (token.length >= 4 && promptToken.startsWith(token.slice(0, 4)))
    )
  })

const resolveConflictBonus = (commandName, promptTokensSet) => {
  const wantsFiles = hasAnyToken(promptTokensSet, [
    'file',
    'files',
    'changed-file',
    'файл',
    'файлы',
  ])
  const wantsWorkspaces = hasAnyToken(promptTokensSet, [
    'workspace',
    'workspaces',
    'package',
    'packages',
    'воркспейс',
    'воркспейсы',
    'пакет',
    'пакеты',
  ])
  const wantsChecksContext = hasAnyToken(promptTokensSet, [
    'checks',
    'ci',
    'github',
    'actions',
    'runner',
    'workflow',
    'pipeline',
    'раннер',
    'экшен',
    'пайплайн',
  ])
  const wantsUnit = hasAnyToken(promptTokensSet, [
    'unit',
    'юнит',
    'module',
    'modules',
    'модуль',
    'модульный',
  ])

  if (commandName === 'files changed list') {
    if (wantsFiles) return 18
    if (wantsWorkspaces && !wantsFiles) return -6
  }

  if (commandName === 'workspaces changed list') {
    if (wantsWorkspaces && !wantsFiles) return 16
    if (wantsFiles) return -10
  }

  if (commandName === 'test unit') {
    if (wantsUnit && !wantsChecksContext) return 14
    if (wantsChecksContext) return -8
  }

  if (commandName === 'checks test unit') {
    if (wantsChecksContext) return 16
    if (wantsUnit && !wantsChecksContext) return -10
  }

  return 0
}

const scoreCandidate = (command, semantics, promptTokens, promptTokensSet) => {
  let score = 0
  const signals = []

  const pathTokens = command.pathTokens.map((token) => normalizeToken(token)).filter(Boolean)
  const groupTags = (semantics.groupTags || []).map((tag) => normalizeToken(tag)).filter(Boolean)
  const semanticTokens = tokenizeSemantics(semantics)
  const semanticTokenSet = new Set(semanticTokens)

  for (const token of pathTokens) {
    if (promptTokensSet.has(token)) {
      score += 9
      signals.push(`path:${token}`)
      continue
    }

    const prefixMatched = [...promptTokensSet].some(
      (promptToken) =>
        promptToken.length >= 4 &&
        token.length >= 4 &&
        (promptToken.startsWith(token.slice(0, 4)) || token.startsWith(promptToken.slice(0, 4)))
    )

    if (prefixMatched) {
      score += 3
      signals.push(`path-prefix:${token}`)
    }
  }

  if (hasContiguousPhrase(promptTokens, pathTokens)) {
    score += 12
    signals.push('path-phrase')
  }

  for (const tag of groupTags) {
    if (promptTokensSet.has(tag)) {
      score += 7
      signals.push(`tag:${tag}`)
    }
  }

  const semanticMatches = [...promptTokensSet].filter((token) => semanticTokenSet.has(token))

  if (semanticMatches.length > 0) {
    score += Math.min(semanticMatches.length, 8)
    signals.push(`semantic:${semanticMatches.slice(0, 4).join(',')}`)
  }

  const conflictBonus = resolveConflictBonus(command.command, promptTokensSet)
  if (conflictBonus !== 0) {
    score += conflictBonus
    signals.push(`conflict:${conflictBonus > 0 ? '+' : ''}${conflictBonus}`)
  }

  return {
    command,
    semantics,
    score,
    signals,
  }
}

const compareCandidates = (left, right) => {
  if (left.score !== right.score) {
    return right.score - left.score
  }

  if (left.command.status !== right.command.status) {
    return left.command.status === 'active' ? -1 : 1
  }

  if (left.command.pathTokens.length !== right.command.pathTokens.length) {
    return left.command.pathTokens.length - right.command.pathTokens.length
  }

  return left.command.command.localeCompare(right.command.command)
}

const buildSemanticsMap = (semantics) =>
  new Map(
    (semantics.commands || []).map((entry) => [
      entry.id,
      {
        groupTags: entry.groupTags || [],
        purpose: entry.purpose || { en: '', ru: '' },
        whenToUse: entry.whenToUse || { en: '', ru: '' },
        example: entry.example || { en: '', ru: '' },
      },
    ])
  )

const getCommandSemantics = (command, semanticsMap) =>
  semanticsMap.get(command.command) || {
    groupTags: command.pathTokens || [],
    purpose: { en: '', ru: '' },
    whenToUse: { en: '', ru: '' },
    example: { en: command.command, ru: command.command },
  }

const buildShortlist = (prompt, routingHint, commands, semanticsMap) => {
  const enrichedPrompt = [prompt, routingHint].filter(Boolean).join('\n')
  const promptTokens = tokenize(enrichedPrompt)
  const promptTokensSet = new Set(promptTokens)

  const scored = commands
    .map((command) =>
      scoreCandidate(
        command,
        getCommandSemantics(command, semanticsMap),
        promptTokens,
        promptTokensSet
      )
    )
    .filter((candidate) => candidate.score >= minimumScore)
    .sort(compareCandidates)

  if (scored.length === 0) {
    return {
      promptTokens,
      scoredCandidates: [],
      shortlist: [],
    }
  }

  const topScore = scored[0].score
  const minimumShortlistScore = Math.max(minimumScore, topScore - shortlistScoreGap)
  const shortlist = scored
    .filter((candidate) => candidate.score >= minimumShortlistScore)
    .slice(0, shortlistMaxItems)

  return {
    promptTokens,
    scoredCandidates: scored,
    shortlist,
  }
}

const toFinalStatus = (command) => (command.status === 'active' ? 'active' : 'unavailable')

const chooseDeterministicFallback = (scoredCandidates) => {
  if (scoredCandidates.length === 0) {
    return {
      command: '',
      status: 'unavailable',
      reason: 'no_candidate',
    }
  }

  const best = scoredCandidates[0]
  if (best.command.status === 'active') {
    return {
      command: best.command.command,
      status: 'active',
      reason: 'best_active',
    }
  }

  const bestActive = scoredCandidates.find((candidate) => candidate.command.status === 'active')
  if (bestActive && bestActive.score >= minimumStrongActiveScore) {
    return {
      command: bestActive.command.command,
      status: 'active',
      reason: 'prefer_active_over_inactive',
    }
  }

  return {
    command: '',
    status: 'unavailable',
    reason: 'best_inactive_without_strong_active',
  }
}

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

const truncate = (value, maxLength) => {
  const source = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (source.length <= maxLength) return source
  return `${source.slice(0, maxLength - 1)}…`
}

const formatShortlistForPrompt = (shortlist) =>
  shortlist
    .map((candidate) => {
      const tags = (candidate.semantics.groupTags || []).slice(0, 6).join(',')
      const purpose = truncate(
        candidate.semantics.purpose?.en || candidate.semantics.purpose?.ru || '',
        120
      )
      const whenToUse = truncate(
        candidate.semantics.whenToUse?.en || candidate.semantics.whenToUse?.ru || '',
        120
      )
      return `${candidate.command.command}|${candidate.command.status}|tags=${tags}|purpose=${purpose}|when=${whenToUse}`
    })
    .join('\n')

const callOpenAI = async ({ prompt, routingHint, shortlist }) => {
  const candidateLines = formatShortlistForPrompt(shortlist)

  const body = {
    model,
    temperature: 0,
    max_output_tokens: 220,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'Route prompt to one command from shortlist only. Return JSON object with keys command and status.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Shortlist commands (format: command|status|tags|purpose|when):',
              candidateLines,
              '',
              `Prompt: ${prompt}`,
              routingHint ? `Routing hint: ${routingHint}` : '',
              '',
              'Contrast rules:',
              '- "files changed list" is for file-level changes; "workspaces changed list" is for changed workspace packages',
              '- "test unit" is the default unit-test route; "checks test unit" is only for checks/CI/GitHub Actions runner context',
              '- command must be exactly one item from shortlist',
              '- return unavailable only when no shortlist command is a clear match',
              '',
              'Return exactly JSON: {"command":"...","status":"active|unavailable"}',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      },
    ],
  }

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

const normalizeModelDecision = (parsed, shortlistMap) => {
  const command = typeof parsed.command === 'string' ? parsed.command.trim() : ''
  const rawStatus = typeof parsed.status === 'string' ? parsed.status.trim() : ''
  const status = rawStatus === 'inactive' ? 'unavailable' : rawStatus

  if (!command) {
    if (status === 'unavailable') {
      return {
        valid: true,
        command: '',
        status: 'unavailable',
        reason: 'explicit_unavailable',
      }
    }

    return {
      valid: false,
      command,
      status,
      reason: 'empty_command',
    }
  }

  if (!shortlistMap.has(command)) {
    return {
      valid: false,
      command,
      status,
      reason: 'command_not_in_shortlist',
    }
  }

  const candidate = shortlistMap.get(command)
  const expectedStatus = toFinalStatus(candidate.command)

  if (status && status !== expectedStatus) {
    return {
      valid: false,
      command,
      status,
      reason: 'status_mismatch',
    }
  }

  return {
    valid: true,
    command,
    status: expectedStatus,
    reason: 'ok',
  }
}

const index = readJson('docs/raijin/index.v1.json')
const semantics = readJson('docs/raijin/semantics.v1.json')
const fixture = readJson('docs/raijin/smoke-prompts.json')
const semanticsMap = buildSemanticsMap(semantics)

const failures = []
const results = []
const llmCases = fixture.cases.filter((testCase) => !testCase.llmSkip)

for (const testCase of llmCases) {
  const { prompt, routingHint = '' } = testCase
  const shortlistBuild = buildShortlist(prompt, routingHint, index.commands, semanticsMap)
  const fallbackDecision = chooseDeterministicFallback(shortlistBuild.scoredCandidates)
  const shortlistMap = new Map(
    shortlistBuild.shortlist.map((candidate) => [candidate.command.command, candidate])
  )

  let modelDecision = {
    rawText: '',
    command: '',
    status: '',
    valid: false,
    reason: 'not_called',
  }

  let finalDecision = {
    command: fallbackDecision.command,
    status: fallbackDecision.status,
  }
  let fallbackUsed = true
  let fallbackReason = `shortlist:${fallbackDecision.reason}`
  let modelCallFailed = false

  try {
    if (shortlistBuild.shortlist.length > 0) {
      const response = await callOpenAI({
        prompt,
        routingHint,
        shortlist: shortlistBuild.shortlist,
      })
      const rawText = extractOutputText(response)
      const parsed = parseJsonObject(rawText)
      const normalized = normalizeModelDecision(parsed, shortlistMap)

      modelDecision = {
        rawText,
        command: normalized.command,
        status: normalized.status,
        valid: normalized.valid,
        reason: normalized.reason,
      }

      if (normalized.valid) {
        finalDecision = {
          command: normalized.command,
          status: normalized.status,
        }
        fallbackUsed = false
        fallbackReason = ''

        if (
          (finalDecision.status === 'unavailable' && fallbackDecision.status === 'active') ||
          (finalDecision.command &&
            shortlistMap.get(finalDecision.command)?.command.status !== 'active' &&
            fallbackDecision.status === 'active')
        ) {
          finalDecision = {
            command: fallbackDecision.command,
            status: fallbackDecision.status,
          }
          fallbackUsed = true
          fallbackReason = `prefer-deterministic-active:${fallbackDecision.reason}`
        }
      } else {
        finalDecision = {
          command: fallbackDecision.command,
          status: fallbackDecision.status,
        }
        fallbackUsed = true
        fallbackReason = `invalid-model-output:${normalized.reason}:${fallbackDecision.reason}`
      }
    }
  } catch (error) {
    modelCallFailed = true
    modelDecision = {
      rawText: '',
      command: '',
      status: '',
      valid: false,
      reason: error instanceof Error ? error.message : String(error),
    }
    finalDecision = {
      command: fallbackDecision.command,
      status: fallbackDecision.status,
    }
    fallbackUsed = true
    fallbackReason = `llm-error:${fallbackDecision.reason}`
  }

  const passed =
    !modelCallFailed &&
    (testCase.expectedStatus === 'unavailable'
      ? finalDecision.status === 'unavailable'
      : finalDecision.command === testCase.expectedCommand &&
        finalDecision.status === testCase.expectedStatus)

  results.push({
    id: testCase.id,
    prompt: testCase.prompt,
    routingHint,
    expectedCommand: testCase.expectedCommand,
    expectedStatus: testCase.expectedStatus,
    candidates: shortlistBuild.shortlist.map((candidate) => ({
      command: candidate.command.command,
      status: toFinalStatus(candidate.command),
      score: candidate.score,
      signals: candidate.signals,
    })),
    modelDecision,
    fallbackUsed,
    fallbackReason,
    finalDecision,
    passed,
  })

  if (!passed) {
    failures.push(
      modelCallFailed
        ? `${testCase.id}: LLM request failed (${modelDecision.reason})`
        : `${testCase.id}: expected ${testCase.expectedCommand}|${testCase.expectedStatus}, got ${finalDecision.command}|${finalDecision.status}`
    )
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  model,
  total: llmCases.length,
  failures: failures.length,
  results,
}

if (process.env.LLM_SMOKE_REPORT_PATH) {
  const reportPath = path.resolve(process.env.LLM_SMOKE_REPORT_PATH)
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
}

if (failures.length > 0) {
  console.error('LLM smoke failed')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }

  process.exit(1)
}

console.log(`LLM smoke passed (${llmCases.length} cases, model=${model})`)
