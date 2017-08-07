echo 'Installing dependencies, running autoconf...'
cd chocpkg
chocpkg/chocpkg install native:autotools
chocpkg/chocpkg build restful-doom
