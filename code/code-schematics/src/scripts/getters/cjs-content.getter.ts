import type { BuildResult } from 'esbuild'

export const getCjsContent = (buildResult: BuildResult): string => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const cjsContent = buildResult.outputFiles![0].text
  return cjsContent
}
