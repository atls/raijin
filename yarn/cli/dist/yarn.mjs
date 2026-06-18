#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { rename } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

const bootstrapDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(bootstrapDir, '../..')
const cacheRoot = join(projectRoot, '.yarn/raijin/runtime')
const maxRedirects = 5
const embeddedManifest = {
  "schemaVersion": 1,
  "packageName": "@atls/yarn-cli",
  "version": "1.2.22",
  "tagName": "@atls/yarn-cli@1.2.22",
  "assetName": "yarn.mjs",
  "assetUrl": "https://github.com/atls/raijin/releases/download/%40atls%2Fyarn-cli%401.2.22/yarn.mjs",
  "sha256": "c23b49595a1e4a5a64dc209a39064bbc6f7ff2845c299b946749b4f459df5738"
}

const readManifest = async () => embeddedManifest

const request = async (url, redirects = 0) =>
  new Promise((resolveRequest, rejectRequest) => {
    const parsedUrl = new URL(url)
    const transport = parsedUrl.protocol === 'http:' ? httpRequest : httpsRequest
    const req = transport(parsedUrl, (response) => {
      const status = response.statusCode ?? 0
      const location = response.headers.location

      if (status >= 300 && status < 400 && location) {
        response.resume()

        if (redirects >= maxRedirects) {
          rejectRequest(new Error(`Too many redirects while downloading ${url}`))

          return
        }

        resolveRequest(request(new URL(location, parsedUrl).toString(), redirects + 1))

        return
      }

      if (status < 200 || status >= 300) {
        response.resume()
        rejectRequest(new Error(`Request failed for ${url}: HTTP ${status}`))

        return
      }

      resolveRequest(response)
    })

    req.on('error', rejectRequest)
    req.end()
  })

const hashFile = async (path) => {
  const hash = createHash('sha256')
  hash.update(await readFile(path))

  return hash.digest('hex')
}

const isRuntimeValid = async (path, expectedSha256) => {
  try {
    await stat(path)

    return (await hashFile(path)) === expectedSha256
  } catch {
    return false
  }
}

const downloadFile = async (url, destination) => {
  await mkdir(dirname(destination), { recursive: true })

  const response = await request(url)
  const stream = createWriteStream(destination, { mode: 0o755 })

  await new Promise((resolveDownload, rejectDownload) => {
    response.pipe(stream)
    response.on('error', rejectDownload)
    stream.on('error', rejectDownload)
    stream.on('finish', resolveDownload)
  })
}

const resolveRuntime = async () => {
  const manifest = await readManifest()
  const runtimePath = join(cacheRoot, manifest.sha256, manifest.assetName)

  if (await isRuntimeValid(runtimePath, manifest.sha256)) {
    return runtimePath
  }

  const temporaryPath = `${runtimePath}.tmp-${process.pid}`

  await rm(temporaryPath, { force: true })
  await downloadFile(manifest.assetUrl, temporaryPath)

  if ((await hashFile(temporaryPath)) !== manifest.sha256) {
    await rm(temporaryPath, { force: true })
    throw new Error(`Downloaded Raijin runtime digest mismatch for ${manifest.tagName}`)
  }

  await rename(temporaryPath, runtimePath)
  await chmod(runtimePath, 0o755)

  return runtimePath
}

const runtimePath = await resolveRuntime()
const child = spawn(process.execPath, [runtimePath, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)

    return
  }

  process.exit(code ?? 1)
})
