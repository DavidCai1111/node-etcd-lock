# node-etcd-lock
[![Build Status](https://travis-ci.org/DavidCai1993/node-etcd-lock.svg?branch=master)](https://travis-ci.org/DavidCai1993/node-etcd-lock)
[![Coverage Status](https://coveralls.io/repos/github/DavidCai1993/node-etcd-lock/badge.svg?branch=master)](https://coveralls.io/github/DavidCai1993/node-etcd-lock?branch=master)

Distributed locks powered by [etcd v3](https://github.com/coreos/etcd) for Node.js.

## Installation

```shell
npm install node-etcd-lock
```

## Usage

```js
'use strict'
const assert = require('assert')
const Locker = require('node-etcd-lock')

const locker = new Locker({ address: '127.0.0.1:2379' })

;(async function () {
  // Acquire a lock for a specified recource.
  const lock = await locker.lock('resource_key', 3 * 1000)
  // This lock will be acquired after 3000 ms.
  const anotherLock = await locker.lock('resource_key', 3 * 1000)
  // Unlock the lock manually.
  await anotherLock.unlock()

  assert((await locker.isLocked('resource_key')) === false)
})(console.error)
```

## API

## Class Locker

### new Locker({ address, defaultTimeout, rootCerts, privateKey, certChain })

- address `String`: The address of etcd(v3) server, by default is `'127.0.0.1:2379'`
- defaultTimeout `Number`: Milliseconds of lock's default timeout, by default is `5000`.
- etcdKeyPrefix `String`: Prefix of the keys of locks in etcd, by default is `'__etcd_lock/'`.
- rootCerts, privateKey, certChain `Buffer`: Options to create a GRPC SSL Credentials object, see https://grpc.io/grpc/node/src_credentials.js.html#line85.

### lock({ keyName, timeout = this.defaultTimeout })

- keyName `String`: The key of the resource to lock.
- timeout `Number`: Milliseconds of the lock's timeout.

Lock the resource with `keyName`, return a `Promise` which will be resolved with a `Lock` instance when the resource is available.

### isLocked(keyName)

- keyName `String`: The key of the resource which need to be checked.

Check whether the resource with `keyName` has already been locked.

## Class Lock

### unlock()

Unlock this lock immediately.
