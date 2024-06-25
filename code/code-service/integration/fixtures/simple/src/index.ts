import { createServer } from 'node:http'

const port = 3000

createServer((req, res) => {
  res.writeHead(200)
  res.end('Content')
}).listen(port)
