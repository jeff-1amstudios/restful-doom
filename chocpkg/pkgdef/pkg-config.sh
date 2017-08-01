description "Development tool for locating installed packages and libraries"
check_tool pkg-config
fetch_download https://pkgconfig.freedesktop.org/releases/pkg-config-0.28.tar.gz \
               6b6eb31c6ec4421174578652c7e141fdaae2dabad1021f420d8713206ac1f845
build_autotools --with-internal-glib

