import type { LibraryBuildInput }  from './input.js'
import type { LibraryBuildResult } from './result.js'

import { inspectLibraryArtifact }  from './artifact.js'
import { verifyLibraryArtifact }   from './artifact.js'
import { stageLibraryArtifact }    from './staging.js'
import { emitTypeScript }          from './typescript.js'

export const buildLibrary = async (input: LibraryBuildInput): Promise<LibraryBuildResult> => {
  const staged = await stageLibraryArtifact(input.targetRoot)

  try {
    const emission = await emitTypeScript(input, staged.root)
    const { diagnostics } = emission

    if (diagnostics.some(({ category }) => category === 'error')) {
      return { diagnostics, kind: 'compilation-failed', targetRoot: input.targetRoot }
    }

    const artifact = await inspectLibraryArtifact(staged.root)
    const issues = [
      ...(emission.emitSkipped ? (['emit-skipped'] as const) : []),
      ...verifyLibraryArtifact(artifact, {
        declarationMaps: emission.declarationMaps,
        javascriptSourceMaps: emission.javascriptSourceMaps,
      }),
    ]

    if (issues.length > 0) {
      return { diagnostics, issues, kind: 'artifact-invalid', targetRoot: input.targetRoot }
    }

    await staged.commit()

    return {
      artifact: await inspectLibraryArtifact(input.targetRoot),
      diagnostics,
      kind: 'completed',
    }
  } finally {
    await staged.dispose()
  }
}
