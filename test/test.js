
"use strict"

var should = require('should')
var streamChannel = require('quiver-stream-channel')
var streamTimeout = require('../lib/stream-timeout')

var timeout = 500

describe('stream timeout test', function() {
  it('read within timeout limit should pass', function(callback) {
    var channel = streamChannel.createStreamChannel()
    var writeStream = channel.writeStream
    var readStream = streamTimeout.createReadStreamWithTimeout(channel.readStream, timeout)

    readStream.read(function(streamClosed, data) {
      should.not.exist(streamClosed)
      data.should.equal('test')
      callback()
    })

    setTimeout(function() {
      writeStream.write('test')
      writeStream.closeWrite()
    }, 100)
  })

  it('read exceed timeout limit should fail', function(callback) {
    var channel = streamChannel.createStreamChannel()
    var writeStream = channel.writeStream
    var readStream = streamTimeout.createReadStreamWithTimeout(channel.readStream, timeout)

    readStream.read(function(streamClosed, data) {
      should.exist(streamClosed)
      should.exist(streamClosed.err)
    })

    setTimeout(function() {
      readStream.isClosed().should.equal(true)

      // A read stream can't really be cancelled down the primitive stream
      // what happened with calling simpleStream.closeRead() when waiting for
      // read callback from simpleStream.read() is that it ignores the read result
      // it received from the primitive stream and then call primitiveStream.closeRead().
      // So here we the first attempt of writing will pass even though the read 
      // side has been closed.
      writeStream.write('ignored')
      
      writeStream.prepareWrite(function(streamClosed) {
        should.exist(streamClosed)
        should.exist(streamClosed.err)
        callback()
      })
    }, 1000)
  })

  it('write within timeout limit should pass', function(callback) {
    var channel = streamChannel.createStreamChannel()
    var writeStream = streamTimeout.createWriteStreamWithTimeout(channel.writeStream, timeout)
    var readStream = channel.readStream

    writeStream.prepareWrite(function(streamClosed) {
      should.not.exist(streamClosed)

      writeStream.write('test')
      writeStream.closeWrite()
    })

    setTimeout(function() {
      readStream.read(function(streamClosed, data) {
        should.not.exist(streamClosed)
        data.should.equal('test')
        callback()
      })
    }, 100)
  })


  it('write exceed timeout limit should fail', function(callback) {
    var channel = streamChannel.createStreamChannel()
    var writeStream = streamTimeout.createWriteStreamWithTimeout(channel.writeStream, timeout)
    var readStream = channel.readStream
    readStream.isClosed().should.equal(false)

    writeStream.prepareWrite(function(streamClosed) {
      should.exist(streamClosed)
      should.exist(streamClosed.err)
    })

    setTimeout(function() {
      readStream.read(function(streamClosed, data) {
        should.exist(streamClosed)
        should.exist(streamClosed.err)
        callback()
      })
    }, 1000)
  })
})

describe('pipe stream with timeout test', function() {
  it('immediate piping should succeed', function(callback) {
    var channel1 = streamChannel.createStreamChannel()
    var channel2 = streamChannel.createStreamChannel()

    var writeStream = channel1.writeStream
    var readStream = channel2.readStream

    streamTimeout.pipeStreamWithTimeout(channel1.readStream, channel2.writeStream, timeout)

    setTimeout(function() {
      writeStream.write('foo')
      
      setTimeout(function() {
        writeStream.write('bar')
        writeStream.closeWrite()
      }, 100)

    }, 100)

    readStream.read(function(streamClosed, data) {
      should.not.exist(streamClosed)
      data.should.equal('foo')

      readStream.read(function(streamClosed, data) {
        should.not.exist(streamClosed)
        data.should.equal('bar')

        readStream.read(function(streamClosed, data) {
          should.exist(streamClosed)

          callback()
        })      
      })
    })
  })

  it('timeout write should fail', function(callback) {
    var channel1 = streamChannel.createStreamChannel()
    var channel2 = streamChannel.createStreamChannel()

    var writeStream = channel1.writeStream
    var readStream = channel2.readStream

    streamTimeout.pipeStreamWithTimeout(channel1.readStream, channel2.writeStream, timeout)

    setTimeout(function() {
      writeStream.write('foo')
      
      setTimeout(function() {
        writeStream.write('bar')
        writeStream.closeWrite()
      }, 1000)
      
    }, 100)

    readStream.read(function(streamClosed, data) {
      should.not.exist(streamClosed)
      data.should.equal('foo')

      readStream.read(function(streamClosed, data) {
        should.exist(streamClosed)
        should.exist(streamClosed.err)

        callback()
      })      
    })
  })

  it('timeout read should fail', function(callback) {
    var channel1 = streamChannel.createStreamChannel()
    var channel2 = streamChannel.createStreamChannel()

    var writeStream = channel1.writeStream
    var readStream = channel2.readStream

    streamTimeout.pipeStreamWithTimeout(channel1.readStream, channel2.writeStream, timeout)

    setTimeout(function() {
      readStream.read(function(streamClosed, data) {
        should.not.exist(streamClosed)
        data.should.equal('foo')

        setTimeout(function() {
          readStream.read(function(streamClosed) {
            should.exist(streamClosed)
            should.exist(streamClosed.err)
            callback()
          })
        }, 1000)
      })
    }, 100)

    writeStream.prepareWrite(function(streamClosed) {
      should.not.exist(streamClosed)
      writeStream.write('foo')

      writeStream.prepareWrite(function(streamClosed) {
        should.exist(streamClosed)
        should.exist(streamClosed.err)
      })
    })
  })
})