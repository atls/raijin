import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_SERVICE_ACCOUNT_KEY
const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const model = process.env.OPENAI_MODEL || process.env.OPENAI_TOOLING_MODEL || 'gpt-5.4-mini'
const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 120000)

if (!apiKey) {
  console.error('OPENAI_API_KEY or OPENAI_SERVICE_ACCOUNT_KEY is required')
  process.exit(1)
}

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))

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

const callOpenAI = async (prompt, commands) => {
  const commandLines = commands.map((command) => `${command.command}|${command.status}`).join('\n')

  const body = {
    model,
    temperature: 0,
    max_output_tokens: 200,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You route prompts to active command list entries. Return only JSON object with keys command and status.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Available commands (format command|status):',
              commandLines,
              '',
              `Prompt: ${prompt}`,
              '',
              'If multiple commands match semantically, prefer the best active command when it is a clear match.',
              'Return unavailable when no command matches, or when the strongest match is inactive and active matches are only weak overlaps.',
              'Return exactly JSON: {"command":"...","status":"active|unavailable"}',
            ].join('\n'),
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

const index = readJson('docs/raijin/index.v1.json')
const fixture = readJson('docs/raijin/smoke-prompts.json')

const failures = []
const results = []
const llmCases = fixture.cases.filter((testCase) => !testCase.llmSkip)

for (const testCase of llmCases) {
  try {
    const response = await callOpenAI(testCase.prompt, index.commands)
    const rawText = extractOutputText(response)
    const parsed = parseJsonObject(rawText)

    const actualCommand = typeof parsed.command === 'string' ? parsed.command.trim() : ''
    const actualStatus =
      typeof parsed.status === 'string'
        ? parsed.status.trim() === 'inactive'
          ? 'unavailable'
          : parsed.status.trim()
        : ''

    const passed =
      testCase.expectedStatus === 'unavailable'
        ? actualStatus === testCase.expectedStatus
        : actualCommand === testCase.expectedCommand && actualStatus === testCase.expectedStatus

    results.push({
      id: testCase.id,
      prompt: testCase.prompt,
      expectedCommand: testCase.expectedCommand,
      expectedStatus: testCase.expectedStatus,
      actualCommand,
      actualStatus,
      passed,
    })

    if (!passed) {
      failures.push(
        `${testCase.id}: expected ${testCase.expectedCommand}|${testCase.expectedStatus}, got ${actualCommand}|${actualStatus}`
      )
    }
  } catch (error) {
    failures.push(`${testCase.id}: ${error instanceof Error ? error.message : String(error)}`)
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
