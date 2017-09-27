/* eslint-env mocha */
'use strict'
require('co-mocha')
const assert = require('power-assert')
const delay = require('delay')
const Locker = require('../index')
const Lock = require('../lock')

describe('node-etcd-lock tests', function () {
  this.timeout(1000 * 10)
  const client = new Locker({ endPoint: '127.0.0.1:2379' })

  describe('locker', function () {
    it('use default end point', function () {
      const { endPoint, etcdKeyPrefix } = new Locker({
        rootCerts: Buffer.from(''),
        privateKey: Buffer.from(''),
        certChain: Buffer.from('')
      })

      assert(endPoint === '127.0.0.1:2379')
      assert(etcdKeyPrefix === '__etcd_lock/')
    })

    it('lock with a empty key name', function * () {
      try {
        yield client.lock()
      } catch (error) {
        assert(error.message, 'empty keyName')
      }

      try {
        yield client.lock('')
      } catch (error) {
        assert(error.message, 'empty keyName')
      }
    })

    it('lock with a fresh key name', function * () {
      const lock = yield client.lock('node_lock_test', 3000)
      assert(Buffer.isBuffer(lock.key))
      assert(lock.locker instanceof Locker)
    })

    it('lock when specified key is locked', function * () {
      const start = new Date()
      yield client.lock('node_lock_test_2', 3000)
      const middle = new Date()
      yield client.lock('node_lock_test_2', 3000)
      const end = new Date()

      assert(middle - start < 1000)
      assert(end - middle > 3000)
    })

    it('unlock after locked', function * () {
      const lock = yield client.lock('node_lock_test_3', 3000)
      const result = yield lock.unlock()

      assert(result === null)
    })

    it('lock when specified key is locked by default timeout ', function * () {
      const start = new Date()
      yield client.lock('node_lock_test_4')
      const middle = new Date()
      yield client.lock('node_lock_test_4')
      const end = new Date()

      assert(middle - start < 1000)
      assert(end - middle > 5000)
    })

    it('lock after the key was unlocked', function * () {
      const start = new Date()
      const lock = yield client.lock('node_lock_test_5')
      const middle = new Date()
      yield lock.unlock()
      yield client.lock('node_lock_test_5')
      const end = new Date()

      assert(middle - start < 1000)
      assert(end - middle < 1000)
    })

    it('check whether is locked', function * () {
      let isLocked = yield client.isLocked('node_lock_test_6')
      assert(isLocked === false)

      yield client.lock('node_lock_test_6', 3 * 1000)
      yield client.lock('node_lock_test_7', 10 * 1000)

      isLocked = yield client.isLocked('node_lock_test_6')
      assert(isLocked === true)

      isLocked = yield client.isLocked('node_lock_test_6')
      assert(isLocked === true)

      yield delay(3500)

      isLocked = yield client.isLocked('node_lock_test_6')
      assert(isLocked === false)

      isLocked = yield client.isLocked('node_lock_test_7')
      assert(isLocked === true)
    })
  })

  describe('lock', function () {
    it('invalid locker', function () {
      assert.throws(() => new Lock(), 'invalid locker')
      assert.throws(() => new Lock(1), 'invalid locker')
    })

    it('invalid key', function () {
      assert.throws(() => new Lock(client), 'empty key')
    })
  })
})
