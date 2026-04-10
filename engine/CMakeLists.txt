cmake_minimum_required(VERSION 3.20)
project(WASM_RPG_Engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ============================================================================
# Source Files
# ============================================================================

set(SOURCES
    src/main.cpp
    src/game.cpp
    src/renderer.cpp
    src/collision.cpp
    src/level_loader.cpp
)

# ============================================================================
# Include Directories
# ============================================================================

include_directories(include)
include_directories(.)

# ============================================================================
# Emscripten Configuration
# ============================================================================

if(EMSCRIPTEN)
    # Output configuration
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    
    # Optimization level (Release for performance)
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
    set(CMAKE_CXX_FLAGS_DEBUG "-g4 -O0")
else()
    message(WARNING "Not building with Emscripten. Are you sure? Use: emcmake cmake ...")
endif()

# ============================================================================
# Executable
# ============================================================================

add_executable(game ${SOURCES})

if(EMSCRIPTEN)
    target_compile_options(game PRIVATE
        "-sUSE_SDL=2"
        "-sUSE_SDL_IMAGE=2"
        "-sSDL2_IMAGE_FORMATS=[\"png\"]"
    )

    target_link_options(game PRIVATE
        "-sUSE_SDL=2"
        "-sUSE_SDL_IMAGE=2"
        "-sSDL2_IMAGE_FORMATS=[\"png\"]"
        "-sEXPORTED_RUNTIME_METHODS=[\"ccall\",\"cwrap\"]"
        "-sASYNCIFY"
    )
endif()

# ============================================================================
# Output Directory
# ============================================================================

set_target_properties(game PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/dist"
)

# ============================================================================
# Build Messages
# ============================================================================

message(STATUS "Building WASM-RPG Engine")
message(STATUS "Emscripten: ${EMSCRIPTEN}")
message(STATUS "Output: ${CMAKE_BINARY_DIR}/dist/game.js")
