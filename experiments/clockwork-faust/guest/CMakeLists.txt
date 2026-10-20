add_library(ultra_research STATIC guest.cpp)
target_link_libraries(ultra_research PRIVATE clockwork)
target_include_directories(ultra_research SYSTEM PRIVATE ../../faust-reference/.deps/faust-2.88.0/architecture)
