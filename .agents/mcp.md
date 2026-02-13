# MCP

## Рекомендуемые серверы

```toml
[mcp_servers.figma-desktop]
url = "http://127.0.0.1:3845/mcp"
enabled = false

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"

[mcp_servers.astro-docs]
command = "npx"
args = ["-y", "mcp-remote", "https://mcp.docs.astro.build/mcp"]

[mcp_servers.sentry]
command = "npx"
args = ["-y", "mcp-remote@latest", "https://mcp.sentry.dev/mcp"]

[mcp_servers.next-devtools]
command = "npx"
args = ["-y", "next-devtools-mcp@latest"]
```
