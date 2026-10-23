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
if(MSVC)
 # Tauri does not discover runtime dependencies of externally built /MD DLLs.
 # Stage the matching, redistributable release CRT from the selected toolset.
 set(CMAKE_INSTALL_SYSTEM_RUNTIME_LIBS_SKIP TRUE)
 include(InstallRequiredSystemLibraries)
 if(NOT CMAKE_INSTALL_SYSTEM_RUNTIME_LIBS)
  message(FATAL_ERROR "MSVC redistributable runtime libraries were not found")
 endif()
 file(WRITE "${CMAKE_BINARY_DIR}/windows-runtime-libraries.txt" "")
 foreach(runtime IN LISTS CMAKE_INSTALL_SYSTEM_RUNTIME_LIBS)
  get_filename_component(name "${runtime}" NAME)
  configure_file("${runtime}" "${CMAKE_BINARY_DIR}/${name}" COPYONLY)
  file(APPEND "${CMAKE_BINARY_DIR}/windows-runtime-libraries.txt" "${name}\n")
 endforeach()
 # Keep a tool path for checking actual imports rather than assuming the list.
 get_filename_component(compiler_dir "${CMAKE_CXX_COMPILER}" DIRECTORY)
 file(WRITE "${CMAKE_BINARY_DIR}/dumpbin-path.txt" "${compiler_dir}/dumpbin.exe")
endif()
add_executable(ultra-diagnostic src-tauri/native/diagnostic.cpp)
target_link_libraries(ultra-diagnostic PRIVATE ultra_native)
set_target_properties(ultra-diagnostic PROPERTIES BUILD_RPATH "$ORIGIN" INSTALL_RPATH "$ORIGIN")


# A real executable test on each native runner, including libc++/MSVC parsing.
add_executable(ultra-parser-test tests/portable_parser_test.cpp)
set_target_properties(ultra-parser-test PROPERTIES
 RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/$<0:>")
if(MSVC)
 target_compile_options(ultra-parser-test PRIVATE /UNDEBUG)
else()
 target_compile_options(ultra-parser-test PRIVATE -UNDEBUG)
endif()
