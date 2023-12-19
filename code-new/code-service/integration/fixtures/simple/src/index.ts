// @ts-ignore
const express = require('express')

// @ts-ignore
const app = express()
// @ts-ignore
const port = 3000

app.get('/', (req, res) => res.send('Content'))

app.listen(port)
