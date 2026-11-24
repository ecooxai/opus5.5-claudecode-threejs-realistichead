#!/usr/bin/env bash
# Assemble ./dist: app sources + the three.js library files it imports.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist/vendor/three/build dist/vendor/three/examples/jsm/controls dist/vendor/three/examples/jsm/environments
cp src/*.html src/*.js src/*.css dist/
cp node_modules/three/build/three.{webgpu,core,tsl}.js dist/vendor/three/build/
cp node_modules/three/examples/jsm/controls/OrbitControls.js dist/vendor/three/examples/jsm/controls/
cp node_modules/three/examples/jsm/environments/RoomEnvironment.js dist/vendor/three/examples/jsm/environments/
echo built
