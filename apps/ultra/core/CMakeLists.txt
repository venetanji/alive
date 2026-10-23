cmake_minimum_required(VERSION 3.24)
project(UltraCore LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
get_filename_component(ALIVE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../.." ABSOLUTE)
set(CLOCKWORK_SOURCE "${ALIVE_ROOT}/experiments/clockwork-faust/.deps/clockwork-94b67500c96e105491682ec68741b5018560eab7" CACHE PATH "Pinned Clockwork source")
set(CLOCKWORK_DSP ultra_hardened_guest CACHE STRING "" FORCE)
set(CLOCKWORK_DSP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/guest" CACHE PATH "" FORCE)
foreach(feature DEVICE MIDI GAMEPAD OSC PLUGINS LINK STANDALONE)
 set(CLOCKWORK_${feature} OFF CACHE BOOL "" FORCE)
endforeach()
set(CLOCKWORK_SCHEDULER ON CACHE BOOL "" FORCE)
set(CLOCKWORK_COMMIT "94b67500c96e105491682ec68741b5018560eab7")
add_subdirectory("${CLOCKWORK_SOURCE}" clockwork)
add_library(ultra_core STATIC engine.cpp)
target_include_directories(ultra_core PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
target_link_libraries(ultra_core PUBLIC clockwork_bundle)
# Optional GNU archive for legacy standalone C consumers. The desktop shared
# library uses clockwork_bundle's transitive target graph on every platform.
set(_ultra_merge_default OFF)
if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
 set(_ultra_merge_default ON)
endif()
option(ULTRA_BUILD_MERGED_ARCHIVE "Build legacy GNU merged static archive" ${_ultra_merge_default})
if(ULTRA_BUILD_MERGED_ARCHIVE)
 if(NOT CMAKE_SYSTEM_NAME STREQUAL "Linux")
  message(FATAL_ERROR "The legacy merged archive requires GNU ar on Linux")
 endif()
 add_custom_command(TARGET ultra_core POST_BUILD COMMAND ${CMAKE_COMMAND}
  -DCORE=$<TARGET_FILE:ultra_core> -DBUNDLE=$<TARGET_FILE:clockwork> -DGUEST=$<TARGET_FILE:ultra_hardened_guest> -DRUST=${CLOCKWORK_SOURCE}/rust/target/release/libclockwork_native.a
  -DOUTPUT=${CMAKE_CURRENT_BINARY_DIR}/libultra_core_bundle.a -DAR=${CMAKE_AR}
  -P ${CMAKE_CURRENT_SOURCE_DIR}/merge.cmake)
endif()

option(ULTRA_BUILD_CORE_TESTS "Build real Clockwork application envelope tests" OFF)
if(ULTRA_BUILD_CORE_TESTS)
 enable_testing()
 add_executable(check_ultra_envelope tests/envelope.cpp
  "${ALIVE_ROOT}/experiments/clockwork-faust/instrument.cpp")
 target_link_options(check_ultra_envelope PRIVATE
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock)
 target_link_libraries(check_ultra_envelope PRIVATE ultra_core)
 target_include_directories(check_ultra_envelope SYSTEM PRIVATE
  "${ALIVE_ROOT}/experiments/faust-reference/.deps/faust-2.88.0/architecture")
 add_test(NAME app_envelope COMMAND check_ultra_envelope)
endif()

