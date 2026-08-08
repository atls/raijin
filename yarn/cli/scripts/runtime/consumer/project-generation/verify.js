import { access } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** @param {string} target */
export const verifyProjectGeneration = async (target) => {
  const requiredFiles = [
    '.config/husky/pre-commit',
    '.github/workflows/checks.yaml',
    '.github/workflows/preview.yaml',
    '.github/workflows/release.yaml',
    '.prettierrc.mjs',
    'eslint.config.mjs',
  ]

  await Promise.all(requiredFiles.map(async (path) => access(join(target, path))))

  const gitIgnore = await readFile(join(target, '.gitignore'), 'utf8')
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
  const typeScript = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8'))
  const workflows = await Promise.all(
    ['checks.yaml', 'preview.yaml', 'release.yaml'].map(async (name) =>
      readFile(join(target, '.github/workflows', name), 'utf8')
    )
  )
  const workflowContent = workflows.join('\n')

  if (gitIgnore !== 'node_modules\n.consumer-private\n') {
    throw new Error(`Project generation changed the existing .gitignore: ${gitIgnore}`)
  }

  if (manifest.scripts?.start !== 'yarn node dist/index.js') {
    throw new Error('Project generation changed existing package scripts')
  }

  if (typeScript.compilerOptions?.module !== 'NodeNext') {
    throw new Error('Project generation did not apply the TypeScript baseline')
  }

  for (const expected of [
    'actions/checkout@v6',
    'actions/setup-node@v6',
    "node-version: '24'",
    'ghcr.io',
    'packages: write',
  ]) {
    if (!workflowContent.includes(expected)) {
      throw new Error(`Generated workflows are missing ${expected}`)
    }
  }

  if (/18\.19|eu\.gcr\.io|GCR_KEYFILE|GCR_PROJECT_ID/.test(workflowContent)) {
    throw new Error('Generated workflows retain the retired Node or GCR policy')
  }
}
