#!/bin/bash

# Convert JPEG to PNG and resize.

input="$1"
output=$(mktemp)

magick "$input" -resize 172x -gravity North -crop 172x228+0+0 +repage "$output"
mv "$output" "$input"
