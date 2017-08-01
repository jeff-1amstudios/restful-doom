description "Library for decoding Ogg Vorbis codec files"
dependencies libogg
check_pkgconfig vorbis
fetch_download http://downloads.xiph.org/releases/vorbis/libvorbis-1.3.5.tar.gz \
               6efbcecdd3e5dfbf090341b485da9d176eb250d893e3eb378c428a2db38301ce
build_autotools
