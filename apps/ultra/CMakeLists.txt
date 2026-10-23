cmake_minimum_required(VERSION 3.24)
project(UltraNative LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_BUILD_RPATH_USE_ORIGIN TRUE)
add_subdirectory(core)
add_library(ultra_native SHARED src-tauri/native/backend.cpp)
find_package(Threads REQUIRED)
target_link_libraries(ultra_native PRIVATE ultra_core ${CMAKE_DL_LIBS} Threads::Threads)
# Keep native artifacts in one location for single- and multi-config generators.
set_target_properties(ultra_native PROPERTIES
 WINDOWS_EXPORT_ALL_SYMBOLS ON
 RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}"
 LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}"
 ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}")
foreach(config DEBUG RELEASE RELWITHDEBINFO MINSIZEREL)
 set_target_properties(ultra_native PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY_${config} "${CMAKE_BINARY_DIR}"
  LIBRARY_OUTPUT_DIRECTORY_${config} "${CMAKE_BINARY_DIR}"
  ARCHIVE_OUTPUT_DIRECTORY_${config} "${CMAKE_BINARY_DIR}")
endforeach()
if(APPLE)
 set_target_properties(ultra_native PROPERTIES
  INSTALL_NAME_DIR "@rpath" BUILD_WITH_INSTALL_NAME_DIR TRUE)
endif()
add_executable(ultra-diagnostic src-tauri/native/diagnostic.cpp)
target_link_libraries(ultra-diagnostic PRIVATE ultra_native)
set_target_properties(ultra-diagnostic PROPERTIES BUILD_RPATH "$ORIGIN" INSTALL_RPATH "$ORIGIN")

