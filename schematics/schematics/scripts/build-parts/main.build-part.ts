import { extname } from 'path'
import esbuild     from 'esbuild'

type MainBuildPartProps = {
  allFiles: Array<string>
  outDir: string
}

export const mainBuildPart = async ({ allFiles, outDir }: MainBuildPartProps) => {
  const tsJsFiles = allFiles.filter((file) => ['.ts', '.js'].includes(extname(file)))

  await esbuild.build({
    logLevel: 'error',
    entryPoints: tsJsFiles,
    outdir: outDir,
    outbase: 'src',
    format: 'cjs',
    platform: 'node',
    sourcemap: false,
    target: 'esnext',
  })
}
