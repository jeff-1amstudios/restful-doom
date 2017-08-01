description "Extra header files for compiling DirectX applications"
fetch_download https://www.libsdl.org/extras/win32/common/directx-devel.tar.gz \
               75595621b9e3da390435cbc762bd7f24f711ef06b3338a34e350622da624b360
IS_TAR_BOMB=true

do_build() {
    true
}

do_install() {
    cp -R include lib "$PACKAGE_INSTALL_DIR"
}
