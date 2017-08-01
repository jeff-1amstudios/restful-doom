description "Foreign function interface library"
check_pkgconfig libffi
fetch_download https://www.mirrorservice.org/sites/sourceware.org/pub/libffi/libffi-3.2.tar.gz \
               6b2680fbf6ae9c2381d381248705857de22e05bae191889298f8e6bfb2ded4ef
build_autotools
