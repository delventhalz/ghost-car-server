'use strict'

const r = require('rethinkdb')

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || 28015
const DB_NAME = process.env.DB_NAME || 'car_simulator'

let connection = null

const getInt = (obj, key, def = 0) => {
  const parsed = parseInt(obj[key])
  return Number.isNaN(parsed) ? def : parsed
}

const connect = () => {
  return r.connect({ host: DB_HOST, port: DB_PORT })
    .then(conn => {
      connection = conn
      return r.branch(
        r.dbList().contains(DB_NAME).not(),
        r.dbCreate(DB_NAME),
        null
      ).run(conn)
    })
}

const makeTable = (name, primaryKey) => {
  return r.branch(
    r.db(DB_NAME).tableList().contains(name).not(),
    r.db(DB_NAME).tableCreate(name, { primaryKey }),
    null
  ).run(connection)
}

const query = table => query => {
  return query(r.db(DB_NAME).table(table)).run(connection)
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

  return query(table)(t => {
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
