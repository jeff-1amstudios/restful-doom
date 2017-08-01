description "Library for reading .ogg container files"
check_pkgconfig ogg
fetch_download http://downloads.xiph.org/releases/ogg/libogg-1.3.2.tar.gz \
               e19ee34711d7af328cb26287f4137e70630e7261b17cbe3cd41011d73a654692
build_autotools
