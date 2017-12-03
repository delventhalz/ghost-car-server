'use strict'

const express = require('express')
const db = require('../db')

const TABLE = 'ghosts'

db.makeTable(TABLE)
const insert = db.insert(TABLE)
const list = db.list(TABLE)

const router = express.Router()

router.route('')
  .post((req, res) => insert(req.body).then(inserted => res.send(inserted)))
  .get((req, res) => list(req.query).then(listed => res.send(listed)))

module.exports = router
