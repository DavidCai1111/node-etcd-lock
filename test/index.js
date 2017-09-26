/* eslint-env mocha */
'use strict'
require('co-mocha')
const assert = require('power-assert')
const Locker = require('../index')

describe('node-etcd-lock tests', function () {
  this.timeout(1000 * 10)
  const client = new Locker({ endPoint: '127.0.0.1:2379' })

  describe('lock', function () {
    it('lock with a fresh key name', function * () {
      const lock = yield client.lock('node_lock_test', 3000)
      assert(Buffer.isBuffer(lock.key))
    })
  })
})
