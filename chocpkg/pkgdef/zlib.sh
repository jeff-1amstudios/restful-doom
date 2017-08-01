description "Library for compressing/decompressing GZIP files"
check_pkgconfig zlib
fetch_download http://zlib.net/zlib-1.2.8.tar.gz \
               36658cb768a54c1d4dec43c3116c27ed893e88b02ecfcb44f2166f9c0b7f2a0d
build_autotools

# zlib's configure script is hand-rolled and doesn't support the normal
# --host option because, well, who knows.
do_build() {
    if [ ! -z "$BUILD_HOST" ]; then
        export CC="$BUILD_HOST-gcc"
    fi
    ./configure --prefix="$PACKAGE_INSTALL_DIR" --static
    make
}

