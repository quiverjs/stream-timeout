
"use strict"

var error = require('quiver-error').error
var streamChannel = require('quiver-stream-channel')

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
      if(!writerReceived || !dataReceived) triggerTimeout()
    }, timeout)
  }
  doPipe()
}

var createReadStreamWithTimeout = function(originalReadStream, timeout) {
  var readStream = Object.create(originalReadStream)

  readStream.read = function(callback) {
    var timeoutError = false
    var dataReceived = false

    originalReadStream.read(function(streamClosed, data) {
      if(timeoutError) return

      dataReceived = true
      callback(streamClosed, data)
    })

    setTimeout(function() {
      if(dataReceived) return

      timeoutError = true
      var err = error(500, 'stream timeout')
      
      originalReadStream.closeRead(err)
      callback({err: err})
    }, timeout)
  }

  return readStream
}

var createWriteStreamWithTimeout = function(originalWriteStream, timeout) {
  var writeStream = Object.create(originalWriteStream)
  
  writeStream.prepareWrite = function(callback) {
    var timeoutError = false
    var writerReceived = false

    originalWriteStream.prepareWrite(function(streamClosed, writer) {
      if(timeoutError) return

      writerReceived = true
      callback(streamClosed, writer)
    })

    setTimeout(function() {
      if(writerReceived) return

      timeoutError = true
      var err = error(500, 'stream timeout')

      originalWriteStream.closeWrite(err)
      callback({err: err})
    }, timeout)
  }

  return writeStream
}

module.exports = {
  createReadStreamWithTimeout: createReadStreamWithTimeout,
  createWriteStreamWithTimeout: createWriteStreamWithTimeout,
  pipeStreamWithTimeout: pipeStreamWithTimeout
}
