# RESTful-DOOM

An HTTP + JSON API hosted inside the 1993 DOOM engine!

![](http://1amstudios.com/img/restful-doom/header.jpg)

RESTful-DOOM is a version of Doom which hosts a RESTful API! The API allows you to query and manipulate various game objects with standard HTTP requests as the game runs.

There were a few challenges:

Build an HTTP+JSON RESTful API server in C.
- Run the server code inside the Doom engine, without breaking the game loop.
- Figure out what kinds of things we can manipulate in the game world, and how to interact with them in memory to achieve the desired effect!

## Base DOOM source port
RESTFul-DOOM is built on top of the awesome [chocolate-doom](https://github.com/chocolate-doom/chocolate-doom) project. I like this project because it aims to stick as close to the original experience as possible, while making it easy to compile and run on modern systems.

## API Spec

## Building

We need to build via the chocolate-doom installer, as it takes care of building and configuring dependencies like SDL.
```
git clone https://github.com/chocolate-doom/chocpkg
cd chocpkg

echo 'description "Doom hosting a RESTful api"
dependencies SDL2 SDL2_mixer SDL2_net
variant latest fetch_git \
    https://github.com/jeff-1amstudios/restful-doom.git master
build_autotools' > pkgdef/restful-doom.sh

chocpkg/chocpkg build restful-doom/latest
```

## Thanks to

