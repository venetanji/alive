cmake_minimum_required(VERSION 3.20)
project(master_resolver_fixtures C)

foreach(case IN ITEMS old partial full bad_limits forwarded)
  if(case STREQUAL "bad_limits")
    set(exports full.def)
  else()
    set(exports ${case}.def)
  endif()
  add_library(fixture_${case} SHARED master_fixture.c ${exports})
  if(case STREQUAL "bad_limits")
    target_compile_definitions(fixture_${case} PRIVATE FIXTURE_BAD_LIMITS=1)
  else()
    target_compile_definitions(fixture_${case} PRIVATE FIXTURE_BAD_LIMITS=0)
  endif()
  set_target_properties(fixture_${case} PROPERTIES OUTPUT_NAME ultra_native
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/${case}"
    ARCHIVE_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/${case}")
endforeach()
add_library(master_forward_target SHARED master_forward_target.c forward_target.def)
set_target_properties(master_forward_target PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/forwarded"
  ARCHIVE_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/forwarded")
