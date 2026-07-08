import assert         from 'node:assert/strict'
import { mkdir }      from 'node:fs/promises'
import { mkdtemp }    from 'node:fs/promises'
import { writeFile }  from 'node:fs/promises'
import { tmpdir }     from 'node:os'
import { join }       from 'node:path'
import { test }       from 'node:test'

import { ts }         from '@atls/raijin/typescript'

import { TypeScript } from './typescript.js'

const createProject = async (
  files: Record<string, string>,
  manifest: Record<string, unknown> = {}
): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typescript-'))

  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify({ type: 'module', ...manifest }, null, 2)}\n`
  )

  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      const target = join(cwd, path)

      await mkdir(join(target, '..'), { recursive: true })
      await writeFile(target, source)
    })
  )

  return cwd
}

test('should preserve project module resolution options during typecheck', async () => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'bundler',
        },
        include: ['src/**/*.ts'],
      },
      null,
      2
    ),
    'src/lib.ts': 'export const value = 1\n',
    'src/index.ts': "import { value } from './lib'\n\nexport { value }\n",
  })

  const diagnostics = await new TypeScript(ts, cwd).check(['src/index.ts'])

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === 2835),
    false
  )
})

test('should preserve inherited tsconfig scope during typecheck', async () => {
  const cwd = await createProject({
    'tsconfig.base.json': JSON.stringify(
      {
        include: ['src/**/*.ts'],
      },
      null,
      2
    ),
    'tsconfig.json': JSON.stringify(
      {
        extends: './tsconfig.base.json',
      },
      null,
      2
    ),
    'src/index.ts': 'export const value = 1\n',
    'packages/broken.ts': 'export const broken = missing.value\n',
  })
  const typescript = new TypeScript(ts, cwd)
  let files: Array<string> = []

  typescript.on('start', ({ files: nextFiles }: { files: Array<string> }) => {
    files = nextFiles
  })

  const diagnostics = await typescript.check()

  assert.equal(diagnostics.length, 0)
  assert.equal(
    files.some((file) => file.endsWith('/src/index.ts')),
    true
  )
  assert.equal(
    files.some((file) => file.endsWith('/packages/broken.ts')),
    false
  )
})

test('should replace file-list tsconfig scope for explicit targets', async () => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify(
      {
        files: [],
      },
      null,
      2
    ),
    'src/index.ts': 'export const value = 1\n',
  })
  const typescript = new TypeScript(ts, cwd)
  let files: Array<string> = []

  typescript.on('start', ({ files: nextFiles }: { files: Array<string> }) => {
    files = nextFiles
  })

  const diagnostics = await typescript.check(['src/index.ts'])

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === 18002),
    false
  )
  assert.equal(
    files.some((file) => file.endsWith('/src/index.ts')),
    true
  )
})

test('should preserve project manifest options with workspace tsconfig', async () => {
  const cwd = await createProject(
    {
      'packages/app/package.json': JSON.stringify(
        {
          name: '@scope/app',
          type: 'module',
        },
        null,
        2
      ),
      'packages/app/tsconfig.json': JSON.stringify(
        {
          include: ['src/**/*.ts', 'generated/**/*.ts', 'types/**/*.d.ts'],
        },
        null,
        2
      ),
      'packages/app/src/index.ts':
        "import type { MissingType } from '../types/problem.js'\n\nexport type Value = MissingType\n",
      'packages/app/generated/broken.ts': 'export const broken = missing.value\n',
      'packages/app/types/problem.d.ts':
        "import type { MissingType } from 'missing-package'\n\nexport type { MissingType }\n",
    },
    {
      typecheckIgnorePatterns: ['generated/**/*.ts'],
      typecheckSkipLibCheck: true,
    }
  )
  const workspaceCwd = join(cwd, 'packages/app')
  const diagnostics = await new TypeScript(ts, workspaceCwd, {
    manifestCwds: [cwd, workspaceCwd],
  }).check()

  assert.equal(diagnostics.length, 0)
})

test('should prefer workspace manifest skipLibCheck option over project manifest', async () => {
  const cwd = await createProject(
    {
      'packages/app/package.json': JSON.stringify(
        {
          name: '@scope/app',
          type: 'module',
          typecheckSkipLibCheck: false,
        },
        null,
        2
      ),
      'packages/app/tsconfig.json': JSON.stringify(
        {
          include: ['src/**/*.ts', 'types/**/*.d.ts'],
        },
        null,
        2
      ),
      'packages/app/src/index.ts':
        "import type { MissingType } from '../types/problem.js'\n\nexport type Value = MissingType\n",
      'packages/app/types/problem.d.ts':
        "import type { MissingType } from 'missing-package'\n\nexport type { MissingType }\n",
    },
    {
      typecheckSkipLibCheck: true,
    }
  )
  const workspaceCwd = join(cwd, 'packages/app')
  const diagnostics = await new TypeScript(ts, workspaceCwd, {
    manifestCwds: [cwd, workspaceCwd],
  }).check()

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === 2307),
    true
  )
})

test('should import TypeScript runtime through workspace package boundary', async () => {
  const cwd = await createProject(
    {
      'node_modules/@atls/raijin/package.json': JSON.stringify(
        {
          type: 'module',
          exports: {
            './typescript': './typescript.js',
          },
        },
        null,
        2
      ),
      'node_modules/@atls/raijin/typescript.js': 'export const ts = { workspaceRuntime: true }\n',
    },
    {
      devDependencies: {
        '@atls/raijin': 'workspace:*',
      },
    }
  )

  const typescript = await TypeScript.initialize(cwd)

  assert.deepEqual(Reflect.get(typescript, 'ts'), { workspaceRuntime: true })
})

test('should import TypeScript runtime through direct Raijin workspace boundary', async () => {
  const cwd = await createProject(
    {
      'node_modules/@atls/raijin/package.json': JSON.stringify(
        {
          type: 'module',
          exports: {
            './typescript': './typescript.js',
          },
        },
        null,
        2
      ),
      'node_modules/@atls/raijin/typescript.js': 'export const ts = { workspaceRuntime: true }\n',
    },
    {
      name: '@atls/raijin',
    }
  )

  const typescript = await TypeScript.initialize(cwd)

  assert.deepEqual(Reflect.get(typescript, 'ts'), { workspaceRuntime: true })
})

test('should not import TypeScript runtime through unrelated leaf workspace boundary', async () => {
  const cwd = await createProject(
    {
      'node_modules/@atls/raijin/package.json': JSON.stringify(
        {
          type: 'module',
          exports: {
            './typescript': './typescript.js',
          },
        },
        null,
        2
      ),
      'node_modules/@atls/raijin/typescript.js': 'export const ts = { leafRuntime: true }\n',
    },
    {
      name: '@scope/internal',
    }
  )

  const typescript = await TypeScript.initialize(cwd)

  assert.notDeepEqual(Reflect.get(typescript, 'ts'), { leafRuntime: true })
})

test('should import TypeScript runtime through ancestor package boundary', async () => {
  const cwd = await createProject(
    {
      'node_modules/@atls/raijin/package.json': JSON.stringify(
        {
          type: 'module',
          exports: {
            './typescript': './typescript.js',
          },
        },
        null,
        2
      ),
      'node_modules/@atls/raijin/typescript.js': 'export const ts = { rootRuntime: true }\n',
      'packages/internal/package.json': JSON.stringify(
        {
          name: '@scope/internal',
          type: 'module',
        },
        null,
        2
      ),
    },
    {
      devDependencies: {
        '@atls/raijin': 'workspace:*',
      },
    }
  )

  const typescript = await TypeScript.initialize(join(cwd, 'packages/internal'))

  assert.deepEqual(Reflect.get(typescript, 'ts'), { rootRuntime: true })
})

test('should ignore generated artifacts during typecheck', async () => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
        },
        include: ['src/**/*.ts', 'bundles/**/*.js', 'dist/**/*.js', 'src/**/*.val.js'],
      },
      null,
      2
    ),
    'src/index.ts': 'export const value = 1\n',
    'bundles/plugin.js': 'const broken = missing.value\n',
    'dist/index.js': 'const broken = missing.value\n',
    'src/generated.val.js': 'const broken = missing.value\n',
  })

  const diagnostics = await new TypeScript(ts, cwd).check([
    'src/**/*.ts',
    'bundles/**/*.js',
    'dist/**/*.js',
    'src/**/*.val.js',
  ])

  assert.equal(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.file?.fileName.includes('/bundles/') ||
        diagnostic.file?.fileName.includes('/dist/') ||
        diagnostic.file?.fileName.endsWith('.val.js')
    ),
    false
  )
})

test('should use project skipLibCheck when manifest does not override it', async () => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          skipLibCheck: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2
    ),
    'src/index.ts':
      "import type { MissingType } from '../types/problem.js'\n\nexport type Value = MissingType\n",
    'types/problem.d.ts':
      "import type { MissingType } from 'missing-package'\n\nexport type { MissingType }\n",
  })

  const diagnostics = await new TypeScript(ts, cwd).check(['src/index.ts'])

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === 2307),
    false
  )
})
