# Run from isolated 27be at 7ff950f; /tmp/master-correction-tests contains generated saved_graphs.hpp.
python3 apps/ultra/tests/alive_session_v3_fixtures.py /tmp/master-correction-tests/saved_graphs.hpp
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread apps/ultra/tests/alive_session_v2_test.cpp apps/ultra/src-tauri/native/backend.cpp apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o /tmp/master-correction-tests/v2-preservation
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -c apps/ultra/src-tauri/native/backend.cpp -o /tmp/master-correction-tests/v3-green-backend.o
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -c apps/ultra/src-tauri/native/backend.cpp -o /tmp/master-correction-tests/v4-green-backend.o
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DCAPACITY_GUARDS -I/tmp/master-correction-tests apps/ultra/tests/alive_session_v3_test.cpp /tmp/master-correction-tests/v3-green-backend.o apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o /tmp/master-correction-tests/v3-preservation
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -I/tmp/master-correction-tests apps/ultra/tests/alive_session_v4_test.cpp /tmp/master-correction-tests/v4-green-backend.o apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o /tmp/master-correction-tests/v4-preservation
/tmp/master-correction-tests/v2-preservation
/tmp/master-correction-tests/v3-preservation
/tmp/master-correction-tests/v4-preservation
