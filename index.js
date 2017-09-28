'use strict'
const path = require('path')
const grpc = require('grpc')
const co = require('co')
const delay = require('delay')
const Lock = require('./lock')

const LOCK_PROTO_PATH = path.join(__dirname, './proto/v3lock.proto')
const RPC_PROTO_PATH = path.join(__dirname, './proto/rpc.proto')
const LockProto = grpc.load(LOCK_PROTO_PATH).v3lockpb
const RpcProto = grpc.load(RPC_PROTO_PATH).etcdserverpb

const DEFAULT_ETCD_KEY_PREFIX = '__etcd_lock/'

class Locker {
  constructor (options = {
    address: '127.0.0.1:2379',
    defaultTimeout: 5 * 1000,
    etcdKeyPrefix: DEFAULT_ETCD_KEY_PREFIX,
    rootCerts: null,
    privateKey: null,
    certChain: null
  }) {
    let { address, defaultTimeout, etcdKeyPrefix, rootCerts, privateKey, certChain } = options

    this.defaultTimeout = defaultTimeout || 5 * 1000
    this.address = address || '127.0.0.1:2379'
    this.etcdKeyPrefix = etcdKeyPrefix || DEFAULT_ETCD_KEY_PREFIX

    let credentials
    if (rootCerts) {
      let sslOptions = [rootCerts]
      if (privateKey && certChain) sslOptions.concat(Buffer.from(privateKey), Buffer.from(certChain))
      credentials = grpc.credentials.createSsl(...sslOptions)
    } else {
      credentials = grpc.credentials.createInsecure()
    }

    this.locker = new LockProto.Lock(this.address, credentials)
    this.leaser = new RpcProto.Lease(this.address, credentials)
    this.kv = new RpcProto.KV(this.address, credentials)
  }

  lock (keyName, timeout = this.defaultTimeout) {
    return co(function * () {
      if (!keyName || !keyName.length) throw new Error('empty keyName')

      let count = 0
      while (true) {
        count++
        try {
          const { key } = yield this._promisify('locker', 'lock', {
            name: Buffer.from(this._assembleKeyName(keyName)),
            lease: (yield this._grantLease(timeout)).ID
          })

          return new Lock(this, key)
        } catch (error) {
          // Retry when the etcd server is too busy to handle transactions.
          if (count <= 3 && error.message && error.message.includes('too many requests')) {
            yield delay(count * 500)
            continue
          }

          throw error
        }
      }
    }.bind(this))
  }

  isLocked (keyName) {
    return co(function * () {
      if (!keyName || !keyName.length) throw new Error('empty keyName')

      const key = Buffer.from(this._assembleKeyName(keyName))

      const { count } = yield this._promisify('kv', 'range', {
        key,
        range_end: this._getPrefixEndRange(key),
        count_only: true
      })

      return Number(count) !== 0
    }.bind(this))
  }

  _getPrefixEndRange (keyBuffer) {
    let end = Buffer.from(keyBuffer)

    for (let i = end.length - 1; i >= 0; i--) {
      if (end[i] < 0xff) {
        end[i] = end[i] + 1
        end = end.slice(0, i + 1)
        return end
      }
    }

    // Buffer <00>
    return Buffer.alloc(1)
  }

  _assembleKeyName (keyName) {
    return `${this.etcdKeyPrefix}${keyName}`
  }

  _unlock (key) {
    return co(function * () {
      yield this._promisify('locker', 'unlock', { key })

      return null
    }.bind(this))
  }

  _grantLease (timeout = this.defaultTimeout) {
    return this._promisify('leaser', 'leaseGrant', { TTL: timeout / 1000 })
  }

  _promisify (stub, method, args) {
    return new Promise((resolve, reject) => {
      this[stub][method](args, function (err, response) {
        if (err) return reject(err)
        return resolve(response)
      })
    })
  }
}

module.exports = Locker
