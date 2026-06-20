export const getEncodedContent = (cjsContent: string): string => {
  const encodedContent = Buffer.from(cjsContent).toString('base64')
  return encodedContent
}
