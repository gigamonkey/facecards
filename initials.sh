#!/bin/bash

# Add initials to one image (for students with generic image)

input="$1"
initials="$2"

tmp=$(mktemp)

magick "$input" -font 'Gill-Sans-Bold' -fill black -pointsize 32 -gravity South -annotate +0+40 "$initials" "$tmp"
magick "$tmp" -background white -flatten "$input"
