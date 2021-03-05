/* don't remove this line */
if (typeof createGrostlModule === 'undefined') {
  createGrostlModule = Promise.reject(new Error('grostl wasm module was not available'));
}

var grostl = {
  internal: {
    module: null,
    bytesFromBuffer: function(internalBuffer, bufLen) {
      const resultView = new Uint8Array(this.module.HEAP8.buffer, internalBuffer, bufLen); // view, not a copy
      const result = new Uint8Array(resultView); // copy, not a view!
      return result;
    },

    bufferFromBytes: function(bytes) {
      var internalBuffer = this.create_buffer(bytes.length);
      this.applyBytesToBuffer(bytes, internalBuffer);
      return internalBuffer;
    },
    applyBytesToBuffer: function(bytes, internalBuffer) {
      this.module.HEAP8.set(bytes, internalBuffer);
    },
    toHex: function(bytes) {
      return Array.prototype.map.call(bytes, function(n) {
        return (n < 16 ? '0' : '') + n.toString(16)
      }).join('');
    },
    inputToBytes: function (input) {
      if (input instanceof Uint8Array)
        return input;
      else if (typeof input === 'string')
        return (new TextEncoder()).encode(input);
      else
        throw new Error('Input must be an string, Buffer or Uint8Array');
    }
  },

  /**
   * Checks if Grøstl support is ready (WASM Module loaded)
   * @return {Boolean}
   */
  isReady: function() {
    return grostl.internal.module !== null;
  },

  /**
   * Initializes a Hashing Context for Hash
   * @param {Number} digest_size the number of bits for the digest size (from 8 to 512 bits in 8 bits step). 512 is default.
   * @return {Object} the context object for this hashing session. Should only be used to hash one data source.
   */
  init: function(digest_size) {
    if (digest_size === undefined || typeof digest_size !== 'number')
      digest_size = 512;

    if (digest_size < 8 || digest_size > 512 || digest_size % 8 !== 0)
      digest_size = 512;

    return {
      'digest_size': digest_size,
      'context': grostl.internal.init(digest_size)
    };
  },

  /**
   * Update the hashing context with new input data
   * @param {Object} contextObject the context object for this hashing session
   * @param {Uint8Array} bytes an array of bytes to hash
   */
  update: function(contextObject, bytes) {
    var inputBuffer = grostl.internal.bufferFromBytes(bytes);

    grostl.internal.update(contextObject.context, inputBuffer, bytes.length * 8);

    grostl.internal.destroy_buffer(inputBuffer);
  },

  /**
   * Update the hashing context with new input data
   * @param {Object} contextObject the context object for this hashing session
   * @param {Object} value the value to use as bytes to update the hash calculation. Must be String or Uint8Array.
   */
   updateFromValue: function(contextObject, value) {
     grostl.update(contextObject, grostl.internal.inputToBytes(value));
   },

  /**
   * Finalizes the hashing session and produces digest ("hash") bytes.
   * Size of the returned array is always digest_size/8 bytes long.
   * This method does not clean up the hashing context - be sure to call cleanup(ctx) !
   * @param {Object} contextObject the context object for this hashing session
   * @return {Uint8Array} an array of bytes representing the raw digest ("hash") value.
   */
  final: function(contextObject) {
    var digestByteLen = contextObject.digest_size / 8;
    var digestBuffer = grostl.internal.create_buffer(digestByteLen);

    grostl.internal.final(contextObject.context, digestBuffer);

    var digestBytes = grostl.internal.bytesFromBuffer(digestBuffer, digestByteLen);
    grostl.internal.destroy_buffer(digestBuffer);
    return digestBytes;
  },

  /**
   * Cleans up and releases the Context object for the (now ended) hashing session.
   * @param {Object} contextObject the context object for this hashing session
   */
  cleanup: function(contextObject) {
    grostl.internal.cleanup(contextObject.context);
  },

  /**
   * Calculates the grostl message digest ("hash") for the input bytes or string
   * @param {Object} input the input value to hash - either Uint8Array or String
   * @param {Number} digest_size the number of bits for the digest size. 512 is default.
   * @return {Uint8Array} an array of bytes representing the raw digest ("hash") value.
   */
  digest: function(input, digest_size) {
    input = grostl.internal.inputToBytes(input);

    var ctx = grostl.init(digest_size);
    grostl.update(ctx, input);
    var bytes = grostl.final(ctx);
    grostl.cleanup(ctx);

    return bytes;
  },

  /**
   * Calculates the grostl message digest ("hash") for the input bytes or string
   * @param {Object} input the input value to hash - either Uint8Array or String
   * @param {Number} digest_size the number of bits for the digest size. 512 is the default
   * @return {String} a hexadecimal representation of the digest ("hash") bytes.
   */
  digestHex: function(input, digest_size) {
    var bytes = grostl.digest(input, digest_size);
    return grostl.internal.toHex(bytes);
  }
};

createGrostlModule().then(async module => {
  // Memory allocations helpers
  grostl.internal.create_buffer  = module.cwrap('malloc', 'number', ['number']);
  grostl.internal.destroy_buffer = module.cwrap('free',   '',       ['number']);

  grostl.internal.init    = module.cwrap('grostl_init',    'number', ['number']);
  grostl.internal.update  = module.cwrap('grostl_update',  '',       ['number','number','number']);
  grostl.internal.final   = module.cwrap('grostl_final',   '',       ['number','number']);
  grostl.internal.cleanup = module.cwrap('grostl_cleanup', '',       ['number']);
  grostl.internal.module  = module;
});

