
fetch_hg::init() {
    HG_URL=$1
    if [ $# -gt 1 ]; then
        HG_BRANCH=$2
    else
        HG_BRANCH=default
    fi
}

do_fetch() {
    if [ -e "$PACKAGE_BUILD_DIR/.hg" ]; then
        cd "$PACKAGE_BUILD_DIR"
        hg pull -b "$HG_BRANCH"
    else
        hg clone -b "$HG_BRANCH" "$HG_URL" "$PACKAGE_BUILD_DIR"
    fi
}

