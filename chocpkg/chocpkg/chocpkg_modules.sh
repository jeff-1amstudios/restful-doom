
install_module() {
    module_name=$1; shift
    . "$CHOCPKG_ROOT/chocpkg/modules/${module_name}.sh"
    ${module_name}::init "$@"
}

package_group() {
    install_module package_group "$@"
}

build_autotools() {
    install_module build_autotools "$@"
}

check_pkgconfig() {
    install_module check_pkgconfig "$@"
}

check_tool() {
    install_module check_tool "$@"
}

fetch_download() {
    install_module fetch_download "$@"
}

fetch_git() {
    install_module fetch_git "$@"
}

fetch_hg() {
    install_module fetch_hg "$@"
}

# Default implementations of functions, as fallbacks:

check_installed() {
    # Don't know - assume not, and then we'll always install.
    false
}

do_fetch() {
    error_exit "No method defined for fetching this package."
}

do_build() {
    error_exit "No method defined for building this package."
}

do_install() {
    error_exit "No method defined for installing this package."
}

