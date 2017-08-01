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

### Building dependencies (needs to be run once)

`chocpkg` is the installer made by chocolate-doom, we use it to take care of building and configuring dependencies like SDL.
```
cd chocpkg
chocpkg/chocpkg build restful-doom
```

### Compiling

Run `make` from the root directory. A `restful-doom` binary will be created in the same location.

## Running

The DOOM engine is open source, but assets (art, maps etc) are not. You'll need to download an appropriate [WAD file](https://en.wikipedia.org/wiki/Doom_WAD) separately.

To run restful-doom on port 6666:
```
./restful-doom -iwad <path/to/doom1.wad> -apiport 6666 ...
```

## Thanks to
[chocolate-doom](https://github.com/chocolate-doom/chocolate-doom) team  
[cJSON](https://github.com/DaveGamble/cJSON) - JSON parsing / generation  
[yuarel](https://github.com/jacketizer/libyuarel/) - URL parsing  
