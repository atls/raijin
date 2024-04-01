import { brotliDecompressSync } from 'zlib'

let hook

export const getContent = () => {
  if (typeof hook === `undefined`)
    hook = brotliDecompressSync(
      Buffer.from(
        'base64'
      )
    ).toString()

  return hook
}