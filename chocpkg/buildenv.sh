
# Value passed to ./configure for the --host argument. If empty, then
# --host will not be passed. Set this if you want to cross-compile.
BUILD_HOST=

# An example of how to cross-compile to mingw32 for Windows builds:
#BUILD_HOST=i686-w64-mingw32

# If we're cross-compiling to a different platform, this should be set
# to true. We initialize this based on whether BUILD_HOST has been set.
if [ "$BUILD_HOST" != "" ]; then
  IS_CROSS_COMPILE=true
else
  IS_CROSS_COMPILE=false
fi

# Extra arguments we pass to make when building.
MAKE_OPTS=

# Uncomment to use more threads for faster builds.
#MAKE_OPTS=-j4

# By default the stable variant of packages is built unless otherwise
# requested. If a package name appears inside this array, the "latest"
# variant of that package (ie. source control HEAD) is built instead.
LATEST_PACKAGES=(restful-doom)
#LATEST_PACKAGES+=(SDL2 SDL2_image SDL2_mixer SDL2_net)

# On OS X, we must set additional options: build 32-bit binaries, and the
# target API version.
if [ $(uname) = "Darwin" ]; then
    CC="gcc -m32"
    CXX="g++ -m32"
    LDFLAGS="-lobjc ${LDFLAGS:-}"
    MACOSX_DEPLOYMENT_TARGET=10.7
    export CC CXX LDFLAGS MACOSX_DEPLOYMENT_TARGET

    # Treat this like a cross-compile, since we're building 32-bit:
    IS_CROSS_COMPILE=true
else
    # TODO: explain what this does
    LDFLAGS="-Wl,-rpath -Wl,$INSTALL_DIR/lib ${LDFLAGS:-}"
    export LDFLAGS
fi

