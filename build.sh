#!/bin/bash

# emscripten binaries need to be in your $PATH, run "source ./emsdk_env.sh" in the emscripten installation directory to do that

emcc grøstl-wasm.c hash.c -O3 -o dist/grostl.js -s MODULARIZE=1 -s 'EXPORT_NAME="createGrostlModule"' -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s EXPORTED_FUNCTIONS="['_malloc', '_free']" -s WASM=1

if [ $? == 0 ]; then
  cat dist/grostl.js wrapper/wrapper.js > dist/grostl-wasm.js ;
  rm dist/grostl.js
fi

