description "Scripts for generating Makefile.in files"
dependencies autoconf libtool
check_tool automake
fetch_download https://ftp.gnu.org/gnu/automake/automake-1.15.tar.gz \
               7946e945a96e28152ba5a6beb0625ca715c6e32ac55f2e353ef54def0c8ed924
build_autotools
