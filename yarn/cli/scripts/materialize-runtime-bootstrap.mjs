import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '../../..')
const packageJsonPath = join(root, 'yarn/cli/package.json')
const bundlePath = join(root, 'yarn/cli/dist/runtime/yarn.mjs')
const releasesDir = join(root, '.yarn/releases')
const bootstrapPath = join(releasesDir, 'yarn.mjs')
const manifestPath = join(releasesDir, 'raijin-runtime.json')
const assetName = 'yarn.mjs'
const packageName = '@atls/yarn-cli'

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
const bundle = await readFile(bundlePath)
const { version } = packageJson
const tagName = `${packageName}@${version}`
const sha256 = createHash('sha256').update(bundle).digest('hex')
const releaseApiUrl = `https://api.github.com/repos/atls/raijin/releases/tags/${encodeURIComponent(
  tagName
)}`

const resolveRuntimeAssetUrl = async () => {
  if (process.env.RAIJIN_RUNTIME_ASSET_URL) {
    return process.env.RAIJIN_RUNTIME_ASSET_URL
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

  if (!token) {
    throw new Error('GITHUB_TOKEN is required to resolve the Raijin runtime release asset URL')
  }

  const response = await fetch(releaseApiUrl, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'raijin-yarn-bootstrap-materializer',
      'x-github-api-version': '2022-11-28',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to resolve Raijin runtime release asset URL: HTTP ${response.status}`)
  }

  const release = await response.json()
  const asset = release.assets?.find((candidate) => candidate.name === assetName)
  const assetUrl = asset?.browser_download_url

  if (typeof assetUrl !== 'string' || assetUrl.length === 0) {
    throw new Error(`Missing Raijin runtime release asset ${assetName}`)
  }

  return assetUrl
}

const assetUrl = await resolveRuntimeAssetUrl()

const manifest = {
  schemaVersion: 1,
  packageName,
  version,
  tagName,
  assetName,
  assetUrl,
  sha256,
}
const manifestContent = JSON.stringify(manifest, null, 2)

const bootstrap = `#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { rename } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname } from 'node:path'
import { isAbsolute } from 'node:path'
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
const yarnConfigPath = join(projectRoot, '.yarnrc.yml')
const userYarnConfigPath = join(homedir(), '.yarnrc.yml')
const maxRedirects = 5
const embeddedManifest = ${manifestContent}

const readManifest = async () => embeddedManifest

const proxyEnvironmentNames = {
  'http:': ['YARN_HTTP_PROXY', 'HTTP_PROXY', 'http_proxy'],
  'https:': ['YARN_HTTPS_PROXY', 'HTTPS_PROXY', 'https_proxy'],
}

const yarnProxyConfigKeys = {
  'http:': ['httpProxy'],
  'https:': ['httpsProxy', 'httpProxy'],
}

const stripYarnInlineComment = (value) => {
  let quotedWith
  let escaped = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (escaped) {
      escaped = false

      continue
    }

    if (quotedWith === '"' && character === '\\') {
      escaped = true

      continue
    }

    if ((character === '"' || character === "'") && (!quotedWith || quotedWith === character)) {
      quotedWith = quotedWith ? undefined : character

      continue
    }

    if (!quotedWith && character === '#' && (index === 0 || value[index - 1].trim() === '')) {
      return value.slice(0, index).trimEnd()
    }
  }

  return value
}

const parseYarnScalar = (value) => {
  const trimmed = stripYarnInlineComment(value).trim()

  if (!trimmed || trimmed === 'null' || trimmed === '~') {
    return undefined
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed.slice(1, -1)
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'")
  }

  return trimmed
}

const normalizeYarnNetworkSettingsHost = (value) => {
  const host = parseYarnScalar(value)

  if (typeof host !== 'string' || host.length === 0) {
    return undefined
  }

  try {
    return new URL(host.includes('://') ? host : \`https://\${host}\`).hostname.toLowerCase()
  } catch {
    return host.toLowerCase()
  }
}

const isYarnNetworkSettingsHostMatch = (networkSettingsHost, hostname) => {
  if (networkSettingsHost === hostname) {
    return true
  }

  return networkSettingsHost.startsWith('*.') && hostname.endsWith(networkSettingsHost.slice(1))
}

const readYarnNetworkConfigurationFile = async (configurationPath, hostname) => {
  try {
    const configuration = await readFile(configurationPath, 'utf-8')
    const entries = []
    const networkEntries = []
    let inNetworkSettings = false
    let networkSettingsHost

    for (const line of configuration.split(/\\r?\\n/)) {
      const topLevelMatch = line.match(/^(httpProxy|httpsProxy|httpsCaFilePath)\\s*:\\s*(.*?)\\s*$/)

      if (topLevelMatch) {
        entries.push([topLevelMatch[1], parseYarnScalar(topLevelMatch[2])])
        inNetworkSettings = false
        networkSettingsHost = undefined

        continue
      }

      if (/^networkSettings\\s*:\\s*$/.test(line)) {
        inNetworkSettings = true
        networkSettingsHost = undefined

        continue
      }

      if (!inNetworkSettings) {
        continue
      }

      if (/^\\S/.test(line)) {
        inNetworkSettings = false
        networkSettingsHost = undefined

        continue
      }

      const hostMatch = line.match(/^\\s{2}([^\\s].*?)\\s*:\\s*$/)

      if (hostMatch) {
        networkSettingsHost = normalizeYarnNetworkSettingsHost(hostMatch[1])

        continue
      }

      const settingMatch = line.match(/^\\s{4}(httpProxy|httpsProxy|httpsCaFilePath)\\s*:\\s*(.*?)\\s*$/)

      if (
        networkSettingsHost &&
        isYarnNetworkSettingsHostMatch(networkSettingsHost, hostname) &&
        settingMatch
      ) {
        networkEntries.push([settingMatch[1], parseYarnScalar(settingMatch[2])])
      }
    }

    return {
      entries: [...entries, ...networkEntries].filter(
        ([, value]) => typeof value === 'string' && value.length > 0
      ),
      configurationDir: dirname(configurationPath),
    }
  } catch {
    return {
      entries: [],
      configurationDir: undefined,
    }
  }
}

const readYarnNetworkConfiguration = async (hostname) => {
  const userConfiguration = await readYarnNetworkConfigurationFile(userYarnConfigPath, hostname)
  const projectConfiguration = await readYarnNetworkConfigurationFile(yarnConfigPath, hostname)
  const configuration = {}
  let httpsCaFilePathBase

  for (const source of [userConfiguration, projectConfiguration]) {
    for (const [key, value] of source.entries) {
      configuration[key] = value

      if (key === 'httpsCaFilePath') {
        httpsCaFilePathBase = source.configurationDir
      }
    }
  }

  return {
    ...configuration,
    httpsCaFilePathBase,
  }
}

const yarnNetworkConfigurationByHostname = new Map()

const getYarnNetworkConfiguration = (hostname) => {
  const normalizedHostname = hostname.toLowerCase()

  if (!yarnNetworkConfigurationByHostname.has(normalizedHostname)) {
    yarnNetworkConfigurationByHostname.set(
      normalizedHostname,
      readYarnNetworkConfiguration(normalizedHostname)
    )
  }

  return yarnNetworkConfigurationByHostname.get(normalizedHostname)
}

const resolveProxyUrl = async (parsedUrl) => {
  const configuration = await getYarnNetworkConfiguration(parsedUrl.hostname)
  const proxy = proxyEnvironmentNames[parsedUrl.protocol]
    ?.map((name) => process.env[name])
    .find((value) => typeof value === 'string' && value.length > 0)
    ?? yarnProxyConfigKeys[parsedUrl.protocol]
      ?.map((name) => configuration[name])
      .find((value) => typeof value === 'string' && value.length > 0)

  return proxy ? new URL(proxy) : undefined
}

const resolveYarnPath = (path, basePath = projectRoot) =>
  isAbsolute(path) ? path : resolve(basePath ?? projectRoot, path)

const readYarnCertificateAuthority = async (parsedUrl) => {
  const configuration = await getYarnNetworkConfiguration(parsedUrl.hostname)
  const caPath = configuration.httpsCaFilePath

  if (typeof caPath !== 'string' || caPath.length === 0) {
    return undefined
  }

  return readFile(resolveYarnPath(caPath, configuration.httpsCaFilePathBase))
}

const connectSocket = (url, options) =>
  url.protocol === 'https:' ? connectTls(options) : connectNet(options)

const createProxyTunnel = async (targetUrl, proxyUrl, ca) =>
  new Promise((resolveTunnel, rejectTunnel) => {
    const proxyPort = Number(proxyUrl.port || (proxyUrl.protocol === 'https:' ? 443 : 80))
    const socket = connectSocket(proxyUrl, {
      host: proxyUrl.hostname,
      port: proxyPort,
      ca,
      servername: proxyUrl.hostname,
    })
    const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80')
    const targetHost = \`\${targetUrl.hostname}:\${targetPort}\`
    const authorization =
      proxyUrl.username || proxyUrl.password
        ? \`Proxy-Authorization: Basic \${Buffer.from(
            \`\${decodeURIComponent(proxyUrl.username)}:\${decodeURIComponent(proxyUrl.password)}\`
          ).toString('base64')}\\r\\n\`
        : ''
    const request = \`CONNECT \${targetHost} HTTP/1.1\\r\\nHost: \${targetHost}\\r\\n\${authorization}\\r\\n\`
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

      const headerEnd = buffer.indexOf('\\r\\n\\r\\n')

      if (headerEnd === -1) {
        return
      }

      const [statusLine] = buffer.slice(0, headerEnd).split('\\r\\n')

      if (!/^HTTP\\/1\\.[01] 2\\d\\d /.test(statusLine)) {
        reject(new Error(\`Proxy tunnel failed for \${targetHost}: \${statusLine}\`))

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
              ca,
              servername: targetUrl.hostname,
            })
          : socket
      )
    })
  })

const request = async (url, redirects = 0) => {
  const parsedUrl = new URL(url)
  const proxyUrl = await resolveProxyUrl(parsedUrl)
  const ca = parsedUrl.protocol === 'https:' ? await readYarnCertificateAuthority(parsedUrl) : undefined
  const proxyTunnel =
    proxyUrl && parsedUrl.protocol === 'https:' ? await createProxyTunnel(parsedUrl, proxyUrl, ca) : undefined

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
            ca,
            headers,
            createConnection: () => proxyTunnel,
          }
      : { ca, headers }

    const req = transport(parsedUrl, requestOptions, (response) => {
      const status = response.statusCode ?? 0
      const location = response.headers.location

      if (status >= 300 && status < 400 && location) {
        response.resume()

        if (redirects >= maxRedirects) {
          rejectRequest(new Error(\`Too many redirects while downloading \${url}\`))

          return
        }

        resolveRequest(request(new URL(location, parsedUrl).toString(), redirects + 1))

        return
      }

      if (status < 200 || status >= 300) {
        response.resume()
        rejectRequest(new Error(\`Request failed for \${url}: HTTP \${status}\`))

        return
      }

      resolveRequest(response)
    })

    req.on('error', rejectRequest)
    req.end()
  })
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

const resolveRuntime = async () => {
  const manifest = await readManifest()
  const runtimePath = join(cacheRoot, manifest.sha256, manifest.assetName)

  if (await isRuntimeValid(runtimePath, manifest.sha256)) {
    return runtimePath
  }

  const temporaryPath = \`\${runtimePath}.tmp-\${process.pid}\`
  const assetUrl = manifest.assetUrl

  if (typeof assetUrl !== 'string' || assetUrl.length === 0) {
    throw new Error(\`Missing Raijin runtime asset URL for \${manifest.tagName}\`)
  }

  await rm(temporaryPath, { force: true })
  await downloadFile(assetUrl, temporaryPath)

  if ((await hashFile(temporaryPath)) !== manifest.sha256) {
    await rm(temporaryPath, { force: true })
    throw new Error(\`Downloaded Raijin runtime digest mismatch for \${manifest.tagName}\`)
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
`

await mkdir(releasesDir, { recursive: true })
await writeFile(manifestPath, `${manifestContent}\n`)
await writeFile(bootstrapPath, bootstrap, { mode: 0o755 })
