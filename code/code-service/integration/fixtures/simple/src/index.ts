const express = require('express')

const app = express()
// @ts-ignore
const port = 3000

app.get('/', (req, res) => res.send('Content'))

app.listen(port)
