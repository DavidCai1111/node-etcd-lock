'use strict'

class Lock {
  constructor (locker, key) {
    if (!key) throw new Error(`empty key: ${key}`)
    this.locker = locker
    this.key = key
  }

  unlock () {
    return this.locker._unlock(this.key)
  }
}

module.exports = Lock
