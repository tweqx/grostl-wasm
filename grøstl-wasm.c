#include <emscripten/emscripten.h>
#include "hash.h"

EMSCRIPTEN_KEEPALIVE
hashState* grostl_init(int digest_size) {
  hashState* state = malloc(sizeof(hashState));
  if (state == NULL)
    return NULL;

  Init(state, digest_size);

  return state;
}

EMSCRIPTEN_KEEPALIVE
void grostl_update(hashState* state, const unsigned char *data, size_t len) {
  if (state == NULL)
    return;

  Update(state, data, len);
}

EMSCRIPTEN_KEEPALIVE
void grostl_final(hashState* state, unsigned char* digest) {
  if (state == NULL)
    return;

  Final(state, digest);
}

EMSCRIPTEN_KEEPALIVE
void grostl_cleanup(hashState* state) {
  if (state == NULL)
    return;

  free(state);
}

