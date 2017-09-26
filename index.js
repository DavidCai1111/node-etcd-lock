'use strict'
const path = require('path')
const grpc = require('grpc')
const co = require('co')
const Lock = require('./lock')

const LOCK_PROTO_PATH = path.join(__dirname, './proto/v3lock.proto')
const RPC_PROTO_PATH = path.join(__dirname, './proto/rpc.proto')
const LockProto = grpc.load(LOCK_PROTO_PATH).v3lockpb
const RpcProto = grpc.load(RPC_PROTO_PATH).etcdserverpb

class Locker {
  constructor (options = {
    endPoint: '127.0.0.1:2379',
    defaultTimeout: 5 * 1000,
    rootCerts: null,
    privateKey: null,
    certChain: null
  }) {
    let { endPoint, defaultTimeout, rootCerts, privateKey, certChain } = options

    this.defaultTimeout = defaultTimeout || 5 * 1000
    this.endPoint = endPoint || '127.0.0.1:2379'

    let credentials
    if (rootCerts) {
      let sslOptions = [rootCerts]
      if (privateKey && certChain) sslOptions.concat(Buffer.from(privateKey), Buffer.from(certChain))
      credentials = grpc.credentials.createSsl(...sslOptions)
    } else {
      credentials = grpc.credentials.createInsecure()
    }

    this.locker = new LockProto.Lock(endPoint, credentials)
    this.leaser = new RpcProto.Lease(endPoint, credentials)
  }

  lock (keyName, timeout = this.defaultTimeout) {
    return co(function * () {
      const { ID } = yield this._grantLease(timeout)
      const { key } = yield this._promisify('locker', 'lock', { name: keyName, lease: ID })

      return new Lock(this, key)
    }.bind(this))
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
