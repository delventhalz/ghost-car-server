'use strict'

const r = require('rethinkdb')

const DB_HOST = process.env.DOCKERO_HOST || process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 28015
const DB_NAME = process.env.DB_NAME || 'car_simulator'
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.RETHINKDB_PASSWORD || process.env.DB_PASS

const RETRY_WAIT = 2000
const MAX_RETRIES = 30
let connection = null

const getInt = (obj, key, def = 0) => {
  const parsed = parseInt(obj[key])
  return Number.isNaN(parsed) ? def : parsed
}

const parseIfInt = val => {
  const parsed = parseInt(val)
  return Number.isNaN(parsed) ? val : parsed
}

const connect = (tries = 0) => {
  const info = { host: DB_HOST, port: DB_PORT }
  if (DB_USER) info.user = DB_USER
  if (DB_PASS) info.password = DB_PASS
  if (DB_PASS && !DB_USER) info.DB_USER = 'admin'

  return r.connect(info)
    .then(conn => {
      connection = conn
      return r.branch(
        r.dbList().contains(DB_NAME).not(),
        r.dbCreate(DB_NAME),
        null
      ).run(conn)
    })
    .then(() => {
      info.db = DB_NAME
      return r.connect(info)
    })
    .then(dbConn => { connection = dbConn })
    .catch(err => {
      if (err instanceof r.Error.ReqlDriverError) {
        if (tries >= MAX_RETRIES) {
          console.error(
            `Unable to reach RethinkDB after ${tries} tries, giving up`
          )
          throw err
        }

        console.warn('Unable to reach RethinkDB, retrying...')
        return new Promise(resolve => setTimeout(resolve, RETRY_WAIT))
          .then(() => connect(tries + 1))
      }

      throw err
    })
}

const makeTable = (name, primaryKey) => {
  return r.branch(
    r.tableList().contains(name).not(),
    r.tableCreate(name, { primaryKey }),
    null
  ).run(connection)
}

const query = table => query => {
  return query(r.table(table)).run(connection)
    .then(results => results.toArray ? results.toArray() : results)
}

const insert = table => doc => {
  doc.created = Date.now()
  return query(table)(t => t.insert(doc, { returnChanges: true }))
    .then(res => res.changes[0].new_val)
}

const list = table => (opts = {}) => {
  const start = getInt(opts, 'start')
  const limit = getInt(opts, 'limit', Number.MAX_SAFE_INTEGER)

  let sort = opts.sort
  if (sort && sort[0] === '-') sort = r.desc(sort.slice(1))

  const filters = Object.keys(opts)
    .filter(key => !['start', 'limit', 'sort'].includes(key))
    .map(key => {
      const row = r.row(key)
      if (opts[key][0] === '!') {
        return row.eq(parseIfInt(opts[key].slice(1))).not()
      }
      return row.eq(parseIfInt(opts[key]))
    })

  return query(table)(t => {
    if (filters.length) t = t.filter(r.and.apply(null, filters))
    if (sort) t = t.orderBy(sort)
    return t.slice(start, limit)
  })
}

module.exports = {
  connect,
  makeTable,
  query,
  insert,
  list
}
