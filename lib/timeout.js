
var error = require('quiver-error').error
var streamChannel = require('quiver-stream-channel').streamChannel

var pipeStreamWithReadTimeout = function(readStream, writeStream, timeout) {
  var timeoutError = false
  var triggerTimeout = function() {
    timeoutError = true
    var err = error(500, 'stream timeout')

    writeStream.closeWrite(err)
    readStream.closeRead(err)
  }

  var doPipe = function() {
    var dataReceived = false

    writeStream.prepareWrite(function(streamClosed) {
      if(streamClosed) return readStream.closeRead(streamClosed.err)

      readStream.read(function(streamClosed, data) {
        if(timeoutError) return
        dataReceived = true

        if(streamClosed) return writeStream.closeWrite(streamClosed.err)
        
        writeStream.write(data)
        doPipe()
      })

      setTimeout(function() {
        if(!dataReceived) triggerTimeout()
      }, timeout)
    })
  }
  doPipe()
}

var pipeStreamWithWriteTimeout = function(readStream, writeStream, timeout) {
  var timeoutError = false
  var triggerTimeout = function() {
    timeoutError = true
    var err = error(500, 'stream timeout')

    writeStream.closeWrite(err)
    readStream.closeRead(err)
  }

  var doPipe = function() {
    readStream.read(function(streamClosed, data) {
      if(streamClosed) return writeStream.closeWrite(streamClosed.err)

      var writerReceived = false

      writeStream.prepareWrite(function(streamClosed) {
        if(timeoutError) return

        writerReceived = true
        if(streamClosed) return readStream.closeRead(streamClosed.err)
          
        writeStream.write(data)
        doPipe()
      })

      setTimeout(function() {
        if(!writerReceived) triggerTimeout()
      }, writeTimeout)
    })
  }
  doPipe()
}

var pipeStreamWithTimeout = function(readStream, writeStream, timeout) {
  var timeoutError = false
  var triggerTimeout = function() {
    timeoutError = true
    var err = error(500, 'stream timeout')

    writeStream.closeWrite(err)
    readStream.closeRead(err)
  }

  var doPipe = function() {
    var dataReceived = false
    var writerReceived = false

    writeStream.prepareWrite(function(streamClosed) {
      if(timeoutError) return

      writerReceived = true
      if(streamClosed) return readStream.closeRead(streamClosed.err)

      readStream.read(function(streamClosed, data) {
        if(timeoutError) return
        dataReceived = true

        if(streamClosed) return writeStream.closeWrite(streamClosed.err)
        
        writeStream.write(data)
        doPipe()
      })
    })
    
    setTimeout(function() {
      if(!writerReceived && !writerReceived) triggerTimeout()
    }, writeTimeout)
  }
  doPipe()
}

var createReadStreamWithTimeout = function(readStream, timeout) {
  var channel = streamChannel.createStreamChannel()
  var writeStream = channel.writeStream
  var readStreamWithTimeout = channel.readStream


  pipeStreamWithReadTimeout(readStream, writeStream, timeout)

  return readStreamWithTimeout
}

var createWriteStreamWithTimeout = function(writeStream, timeout) {
  var channel = streamChannel.createStreamChannel()
  var writeStreamWithTimeout = channel.writeStream
  var readStreamm = channel.readStream

  var timeoutError = false
  var triggerTimeout = function() {
    timeoutError = true
    var err = error(500, 'stream timeout')

    writeStream.closeWrite(err)
    readStream.closeRead(err)
  }

  pipeStreamWithWriteTimeout(readStream, writeStream, timeout)

  return writeStreamWithTimeout
}

module.exports = {
  createReadStreamWithTimeout: createReadStreamWithTimeout,
  createWriteStreamWithTimeout: createWriteStreamWithTimeout,
  pipeStreamWithTimeout: pipeStreamWithTimeout,
  pipeStreamWithReadTimeout: pipeStreamWithReadTimeout,
  pipeStreamWithWriteTimeout: pipeStreamWithWriteTimeout
}
