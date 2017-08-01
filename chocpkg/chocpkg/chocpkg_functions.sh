# Determine if a given program is in the PATH.
have_tool() {
    tool=$1

    result=1
    SAVE_IFS=$IFS
    IFS=:

    for dir in $PATH; do
        if [ -e $dir/$tool ]; then
            #echo $dir/$tool
            result=0
            break
        fi
    done

    IFS=$SAVE_IFS

    return $result
}

error_exit() {
    (echo
     for line in "$@"; do
         echo "$line"
     done) >&2
    exit 1
}

sha256() {
    if have_tool shasum; then
        shasum -a 256 "$@"
    elif have_tool sha256sum; then
        sha256sum "$@"
    else
        error_exit "No sha256 tool installed."
    fi
}

sha256_digest() {
    sha256 -b "$@" | while read digest rest; do
        echo "$digest"
    done
}

