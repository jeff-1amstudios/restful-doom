
check_tool::init() {
    PACKAGE_INSTALLED_TOOL=$1
}

# Function that returns true if the package is installed.
check_installed() {
    have_tool "$PACKAGE_INSTALLED_TOOL"
}

