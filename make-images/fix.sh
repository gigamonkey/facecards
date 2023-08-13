#!/bin/bash

# Convert JPEG to PNG and resize.

input="$1"
output="$2"

convert "$input" -resize 172x -gravity North -crop 172x228+0+0 +repage "$output"
