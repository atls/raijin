import type { BuildResult } from 'esbuild'

export const getCjsContent = (buildResult: BuildResult): string => {
  const cjsContent = buildResult.outputFiles![0].text
  return cjsContent
}
