description "Library for high quality audio resampling"
check_pkgconfig samplerate
fetch_download http://www.mega-nerd.com/SRC/libsamplerate-0.1.8.tar.gz \
               93b54bdf46d5e6d2354b7034395fe329c222a966790de34520702bb9642f1c06
build_autotools
