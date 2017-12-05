'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const db = require('./db')

const PORT = process.env.PORT || 3000
const app = express()

app.use(bodyParser.json())

app.use((req, res, next) => {
  console.log(`Handling ${req.method} request for ${req.url}`)
  next()
})

app.use((req, res, next) => {
  const domains = ['flintgames.com', 'ldjam.com']
  const headers = ['Content-Type', 'Origin', 'X-Request-With', 'Accept']
  res.header('Access-Control-Allow-Origin', domains.join())
  res.header('Access-Control-Allow-Headers', headers.join())
  next()
})

db.connect().then(() => {
  const ghostRouter = require('./routes/ghosts')

  app.use('/ghosts', ghostRouter)

  app.listen(PORT, () => console.log(`Car server listening on port ${PORT}`))
})
