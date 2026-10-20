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
# Single archive for Rust/native consumers: Clockwork already produces a merged bundle.
add_custom_command(TARGET ultra_core POST_BUILD COMMAND ${CMAKE_COMMAND}
 -DCORE=$<TARGET_FILE:ultra_core> -DBUNDLE=$<TARGET_FILE:clockwork> -DGUEST=$<TARGET_FILE:ultra_hardened_guest> -DRUST=${CLOCKWORK_SOURCE}/rust/target/release/libclockwork_native.a
 -DOUTPUT=${CMAKE_CURRENT_BINARY_DIR}/libultra_core_bundle.a -DAR=${CMAKE_AR}
 -P ${CMAKE_CURRENT_SOURCE_DIR}/merge.cmake)
