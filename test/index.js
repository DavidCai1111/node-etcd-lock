/* eslint-env mocha */
'use strict'
const assert = require('power-assert')
const Locker = require('../index')

describe('node-etcd-lock tests', function () {
  this.timeout(1000 * 10)
  const client = new Locker({ endPoint: '192.168.0.21:3379' })

  describe('lock', function () {
    it('lock with a fresh key name', async function () {
      assert(Buffer.isBuffer(await client.lock('node_lock_test')))
    })
  })
})
