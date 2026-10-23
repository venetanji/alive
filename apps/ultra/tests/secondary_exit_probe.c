#include <fcntl.h>
#include <stdlib.h>
#include <unistd.h>

static void mark(const char* key) {
    const char* path = getenv(key);
    if (!path) return;
    const int descriptor = open(path, O_WRONLY | O_CREAT | O_APPEND, 0600);
    if (descriptor < 0) _Exit(90);
    if (write(descriptor, "seen\n", 5) != 5) _Exit(91);
    close(descriptor);
}

static void finalizer(void) { mark("ULTRA_TEST_EXIT_MARKER"); }

__attribute__((constructor)) static void install_probe(void) {
    mark("ULTRA_TEST_LOAD_MARKER");
    if (atexit(finalizer) != 0) _Exit(92);
}
