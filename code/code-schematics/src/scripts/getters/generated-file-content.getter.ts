const WRITE_SCHEMATIC_FACTORY_FUNCTION = `export const writeSchematicFactory = async (path: string) => {
  const content = Buffer.from(schematicFactoryCjsBase64, "base64").toString("utf-8");
  const fs = await import('fs/promises')
  await fs.writeFile(path, content);
};
`

export const getGeneratedFileContent = (encodedContent: string): string => {
  const generatedFileContent = `// Auto-generated file
/* eslint-disable */

export const schematicFactoryCjsBase64 = "${encodedContent}";

${WRITE_SCHEMATIC_FACTORY_FUNCTION}
`

  return generatedFileContent
}
