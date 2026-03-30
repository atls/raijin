import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenize = (value) => normalize(value).split(' ').filter(Boolean)

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

const scoreRoute = (promptTokens, commandTokens, commandName) => {
  let score = 0

  for (const token of commandTokens) {
    if (promptTokens.includes(token)) {
      score += 3
      continue
    }

    if (token.length >= 4 && promptTokens.some((promptToken) => promptToken.startsWith(token.slice(0, 4)))) {
      score += 1
    }
  }

  const commandNameTokens = commandName.split(' ').filter(Boolean)

  if (commandNameTokens.length === 1) {
    if (promptTokens.includes(commandNameTokens[0])) {
      score += 5
    }
  } else if (hasContiguousPhrase(promptTokens, commandNameTokens)) {
    score += 5
  }

  return score
}

const isBetterMatch = (candidate, best) => {
  if (!best) return true

  if (candidate.score !== best.score) {
    return candidate.score > best.score
  }

  if (candidate.command.pathTokens.length !== best.command.pathTokens.length) {
    return candidate.command.pathTokens.length < best.command.pathTokens.length
  }

  return candidate.command.command.localeCompare(best.command.command) < 0
}

const routePrompt = (prompt, commands) => {
  const promptTokens = tokenize(prompt)

  let best = null

  for (const command of commands) {
    const commandTokens = command.pathTokens.map((token) => normalize(token)).filter(Boolean)
    const commandName = normalize(command.command)
    const score = scoreRoute(promptTokens, commandTokens, commandName)

    if (score <= 0) continue

    const candidate = { command, score }

    if (isBetterMatch(candidate, best)) {
      best = candidate
    }
  }

  if (best && best.command.status !== 'active') {
    return {
      command: '',
      status: 'unavailable',
      availabilityReason: `Best semantic match "${best.command.command}" is inactive`,
    }
  }

  return best ? best.command : null
}

const index = readJson('docs/tooling/index.v1.json')
const fixture = readJson('docs/tooling/smoke-prompts.json')
const failures = []

for (const testCase of fixture.cases) {
  const routed = routePrompt(testCase.prompt, index.commands)

  if (!routed) {
    failures.push(`${testCase.id}: no route for prompt "${testCase.prompt}"`)
    continue
  }

  if (testCase.expectedStatus === 'unavailable') {
    if (routed.status !== 'unavailable') {
      failures.push(
        `${testCase.id}: expected status "${testCase.expectedStatus}", got "${routed.status || 'unknown'}"`
      )
      continue
    }

    if ((routed.command || '') !== testCase.expectedCommand) {
      failures.push(
        `${testCase.id}: expected command "${testCase.expectedCommand}", got "${routed.command || ''}"`
      )
    }

    continue
  }

  if (routed.command !== testCase.expectedCommand) {
    failures.push(`${testCase.id}: expected command "${testCase.expectedCommand}", got "${routed.command}"`)
    continue
  }

  if (routed.status !== testCase.expectedStatus) {
    failures.push(`${testCase.id}: expected status "${testCase.expectedStatus}", got "${routed.status}"`)
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure) // eslint-disable-line no-console
  }

  process.exit(1)
}

console.log(`Deterministic smoke passed (${fixture.cases.length} cases)`) // eslint-disable-line no-console
