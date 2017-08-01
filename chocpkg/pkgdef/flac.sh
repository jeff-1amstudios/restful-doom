description "Library for encoding/decoding .flac lossless audio files"
check_pkgconfig flac
# We use a repacked mirror since flac is released as .xz rather than .gz:
fetch_download https://www.chocolate-doom.org/depends/flac-1.3.1.tar.gz \
               4ae2c8ee48b3ae52635e543b1e64b58f5dcb8d69e1e18257da82f800cb754861

# Compile problems :(
build_autotools --disable-asm-optimizations
