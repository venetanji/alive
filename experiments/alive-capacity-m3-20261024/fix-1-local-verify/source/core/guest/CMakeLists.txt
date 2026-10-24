add_library(ultra_hardened_guest STATIC guest.cpp)
target_link_libraries(ultra_hardened_guest PRIVATE clockwork)
target_include_directories(ultra_hardened_guest SYSTEM PRIVATE ../../../../experiments/faust-reference/.deps/faust-2.88.0/architecture)
