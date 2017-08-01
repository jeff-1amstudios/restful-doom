description "GNOME glib core utility library"
check_pkgconfig glib
fetch_download https://www.chocolate-doom.org/depends/glib-2.47.6.tar.gz \
               da87bea88da06f60d6e7618c574c67b9fd109ee07fc78074dede473dde8f8196
dependencies libffi gettext zlib
build_autotools --with-pcre=internal
