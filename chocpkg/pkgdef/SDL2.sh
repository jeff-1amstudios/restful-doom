description "Simple DirectMedia Layer"
check_pkgconfig sdl2

variant stable fetch_download \
    https://www.libsdl.org/release/SDL2-2.0.4.tar.gz \
    da55e540bf6331824153805d58b590a29c39d2d506c6d02fa409aedeab21174b
variant latest fetch_hg https://hg.libsdl.org/SDL/

config_options=

# Many OS X systems have the Quartz X11 server installed, but
# we probably don't want to use it.
if [ $(uname) = "Darwin" ]; then
    config_options+=" --disable-video-x11"
fi

# When targeting Windows, we need to install the directx headers first.
if [ $(uname) = "Cygwin" ] || [[ "$BUILD_HOST" = *mingw* ]]; then
    dependencies directx-devel
    config_options+=" --disable-directx"
fi

# For SDL, we do an out-of-tree build in a subdirectory, since the configure
# script can complain otherwise.
AUTOTOOLS_BUILD_PATH=build-artifacts
build_autotools $config_options
