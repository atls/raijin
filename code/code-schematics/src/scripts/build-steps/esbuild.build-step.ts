import { writeFile } from 'fs/promises'
import esbuild       from 'esbuild'

const getGeneratedFileContent = (encodedContent: string): string => {
  const generatedFileContent = `// Auto-generated file
/* eslint-disable */
export const schematicFactoryCjsBase64 = "${encodedContent}";

export const writeSchematicFactory = async (path: string) => {
  const content = Buffer.from(schematicFactoryCjsBase64, "base64").toString("utf-8");
  const fs = await import('fs/promises')
  fs.writeFile(path, content);
};
`

  return generatedFileContent
}

export const esbuildBuildStep = async (): Promise<void> => {
  const result = await esbuild.build({
    logLevel: 'error',
    entryPoints: ['src/schematic/index.ts'],
    bundle: true,
    packages: 'external',
    write: false,
    outfile: 'dist/schematic.cjs',
    outbase: 'src/schematic',
    format: 'cjs',
    platform: 'node',
    sourcemap: false,
    target: 'esnext',
  })

  const cjsContent = result.outputFiles[0].text
  const encodedContent = Buffer.from(cjsContent).toString('base64')

  const generatedFileContent = getGeneratedFileContent(encodedContent)

  await writeFile('src/generated/schematic-factory-export.ts', generatedFileContent)
}
