# WebGL Cube Runner

![](http://i.imgur.com/iDoVAzt.gif)

## Introduction

This game, a version of the classic
[Cube Runner](https://itunes.apple.com/us/app/cube-runner/id284596345?mt=8),
was developed by Nate Emerson, Casey Patton, and Dylan Vassallo as a final
project for UCLA CS 174A, Intro to Computer Graphics. The project requirement
was to make something non-trivial in pure OpenGL (no higher-level frameworks)
using all the basic techniques and at least one advanced technique that we have
learned.

We implemented a WebGL version of Cube Runner that runs in modern browsers.
There are traditional keyboard controls but you can also connect your
smartphone as a controller and tilt it to steer the ship. The server component
is tested to run on Windows and Mac OS X.

## Setup instructions

1. Install [Git](http://git-scm.com/) and [Node.JS](http://nodejs.org/)
2. Get the code: `git clone git://github.com/dylanvee/webgl-cube-runner.git`
3. Go into the `CS174A` directory
4. Install the dependencies: `npm install`
5. Run the server: `node server.js`
6. A browser tab will open and the game will load. To use your smartphone as a
controller, scan the QR code on the page using a barcode scanning app.

## How to play

You are piloting a ship through a never-ending field of cubes that you must
avoid without crashing. You get a point for each cube you avoid, and the game
ends when you hit one. The pace starts slow but gets faster and faster as you
earn more points. Press Space to start the game or restart if you die. Turn
using either your smartphone (see the instructions above) or the arrow keys.

## Powered by

- [Express](http://expressjs.com/)
- [Faye](http://faye.jcoglan.com/)
- [Bootstrap](http://twitter.github.io/bootstrap/)
- [jQuery](http://jquery.com/)
- [Underscore](http://underscorejs.org/)
- [Backbone](http://backbonejs.org/)
- [glMatrix](http://glmatrix.net/)
