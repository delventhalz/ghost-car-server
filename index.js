'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const db = require('./db')

const PORT = process.env.PORT || 3000
const app = express()

app.use(bodyParser.json())

db.connect().then(() => {
  const ghostRouter = require('./routes/ghosts')

  app.use('/ghosts', ghostRouter)

  app.listen(PORT, () => console.log(`Car server listening on port ${PORT}`))
})
