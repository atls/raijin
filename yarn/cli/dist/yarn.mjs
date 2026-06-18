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
import { connect as connectNet } from 'node:net'
import { pipeline } from 'node:stream/promises'
import { connect as connectTls } from 'node:tls'

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
  "releaseApiUrl": "https://api.github.com/repos/atls/raijin/releases/tags/%40atls%2Fyarn-cli%401.2.22",
  "sha256": "1ae689b9a7e02b31dc6ed64eda012b7cb1fc9ad27062124755190e135639a192"
}

const readManifest = async () => embeddedManifest

const proxyEnvironmentNames = {
  'http:': ['YARN_HTTP_PROXY', 'HTTP_PROXY', 'http_proxy'],
  'https:': ['YARN_HTTPS_PROXY', 'HTTPS_PROXY', 'https_proxy'],
}

const resolveProxyUrl = (parsedUrl) => {
  const proxy = proxyEnvironmentNames[parsedUrl.protocol]
    ?.map((name) => process.env[name])
    .find((value) => typeof value === 'string' && value.length > 0)

  return proxy ? new URL(proxy) : undefined
}

const connectSocket = (url, options) =>
  url.protocol === 'https:' ? connectTls(options) : connectNet(options)

const createProxyTunnel = async (targetUrl, proxyUrl) =>
  new Promise((resolveTunnel, rejectTunnel) => {
    const proxyPort = Number(proxyUrl.port || (proxyUrl.protocol === 'https:' ? 443 : 80))
    const socket = connectSocket(proxyUrl, {
      host: proxyUrl.hostname,
      port: proxyPort,
      servername: proxyUrl.hostname,
    })
    const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80')
    const targetHost = `${targetUrl.hostname}:${targetPort}`
    const authorization =
      proxyUrl.username || proxyUrl.password
        ? `Proxy-Authorization: Basic ${Buffer.from(
            `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`
          ).toString('base64')}\r\n`
        : ''
    const request = `CONNECT ${targetHost} HTTP/1.1\r\nHost: ${targetHost}\r\n${authorization}\r\n`
    let buffer = ''

    const reject = (error) => {
      socket.destroy()
      rejectTunnel(error)
    }

    socket.once('error', reject)
    socket.once('connect', () => {
      socket.write(request)
    })
    socket.on('data', (chunk) => {
      buffer += chunk.toString('latin1')

      const headerEnd = buffer.indexOf('\r\n\r\n')

      if (headerEnd === -1) {
        return
      }

      const [statusLine] = buffer.slice(0, headerEnd).split('\r\n')

      if (!/^HTTP\/1\.[01] 2\d\d /.test(statusLine)) {
        reject(new Error(`Proxy tunnel failed for ${targetHost}: ${statusLine}`))

        return
      }

      socket.removeListener('error', reject)
      socket.removeAllListeners('data')

      const rest = Buffer.from(buffer.slice(headerEnd + 4), 'latin1')

      if (rest.length > 0) {
        socket.unshift(rest)
      }

      resolveTunnel(
        targetUrl.protocol === 'https:'
          ? connectTls({
              socket,
              servername: targetUrl.hostname,
            })
          : socket
      )
    })
  })

const request = async (url, redirects = 0) => {
  const parsedUrl = new URL(url)
  const proxyUrl = resolveProxyUrl(parsedUrl)
  const proxyTunnel =
    proxyUrl && parsedUrl.protocol === 'https:' ? await createProxyTunnel(parsedUrl, proxyUrl) : undefined

  return new Promise((resolveRequest, rejectRequest) => {
    const transport = parsedUrl.protocol === 'http:' ? httpRequest : httpsRequest
    const headers =
      parsedUrl.hostname === 'api.github.com'
        ? {
            accept: 'application/vnd.github+json',
            'user-agent': 'raijin-yarn-bootstrap',
        }
        : undefined
    const requestOptions = proxyUrl
      ? parsedUrl.protocol === 'http:'
        ? {
            headers,
            host: proxyUrl.hostname,
            path: parsedUrl.toString(),
            port: Number(proxyUrl.port || (proxyUrl.protocol === 'https:' ? 443 : 80)),
            protocol: proxyUrl.protocol,
          }
        : {
            headers,
            createConnection: () => proxyTunnel,
          }
      : { headers }

    const req = transport(parsedUrl, requestOptions, (response) => {
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
}

const downloadJson = async (url) => {
  const response = await request(url)
  const chunks = []

  for await (const chunk of response) {
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

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

  await pipeline(response, createWriteStream(destination, { mode: 0o755 }))
}

const resolveAssetUrl = async (manifest) => {
  const release = await downloadJson(manifest.releaseApiUrl)
  const asset = release.assets?.find((candidate) => candidate.name === manifest.assetName)
  const assetUrl = asset?.browser_download_url

  if (typeof assetUrl !== 'string' || assetUrl.length === 0) {
    throw new Error(`Missing Raijin runtime release asset ${manifest.assetName}`)
  }

  return assetUrl
}

const resolveRuntime = async () => {
  const manifest = await readManifest()
  const runtimePath = join(cacheRoot, manifest.sha256, manifest.assetName)

  if (await isRuntimeValid(runtimePath, manifest.sha256)) {
    return runtimePath
  }

  const temporaryPath = `${runtimePath}.tmp-${process.pid}`
  const assetUrl = await resolveAssetUrl(manifest)

  await rm(temporaryPath, { force: true })
  await downloadFile(assetUrl, temporaryPath)

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
  env: {
    ...process.env,
    YARN_IGNORE_PATH: '1',
  },
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)

    return
  }

  process.exit(code ?? 1)
})
