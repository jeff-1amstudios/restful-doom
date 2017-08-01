
fetch_download::init() {
    PACKAGE_URL=$1
    PACKAGE_SHA256_DIGEST=$2
    PACKAGE_FILENAME=$(basename "$PACKAGE_URL")
    PACKAGE_DIR_NAME="${PACKAGE_FILENAME/.tar.gz/}"
    IS_TAR_BOMB=false
}

check_sha256_digest() {
    local filename="$1" dldigest
    dldigest=$(sha256_digest "$filename")
    # For development purposes only.
    if [ "$PACKAGE_SHA256_DIGEST" = "ignore-checksum" ]; then
        echo "SHA256 digest of downloaded $PACKAGE_FILENAME:"
        echo "    $dldigest"
        return
    fi
    if [ "$dldigest" != "$PACKAGE_SHA256_DIGEST" ]; then
        error_exit "sha256 checksum incorrect for $PACKAGE_FILENAME." \
                   "expected: $PACKAGE_SHA256_DIGEST" \
                   "checksum: $dldigest"
    fi
}

download_package_file() {
    local dlfile="$PACKAGES_DIR/$PACKAGE_FILENAME"
    if [ ! -e "$dlfile" ]; then
        local tmpfile="$dlfile.part"
        if ! chocurl "$PACKAGE_URL" > $tmpfile; then
            error_exit "Failed to download $PACKAGE_URL"
        fi
        check_sha256_digest "$tmpfile"
        mv "$tmpfile" "$dlfile"
    fi
}

extract_package_file() {
    local dlfile="$PACKAGES_DIR/$PACKAGE_FILENAME"
    # Well-formed tar files contain a single directory that matches their
    # filename, but we support an override for badly-formed tar files too,
    # where we extract everything into a directory with the expected name.
    if $IS_TAR_BOMB; then
        mkdir -p "$PACKAGE_BUILD_DIR"
        cd "$PACKAGE_BUILD_DIR"
    else
        local parent_dir=$(dirname "$PACKAGE_BUILD_DIR")
        cd "$parent_dir"
    fi
    (gunzip < "$dlfile" | tar -x) || (
        mv "$dlfile" "$dlfile.bad"
        error_exit "Failed to extract $PACKAGE_FILENAME: bad download?"
    )
}

do_fetch() {
    download_package_file
    extract_package_file
}

