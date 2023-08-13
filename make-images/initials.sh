#!/bin/bash

# Add initials to one image (for students with generic image)

input="$1"
initials="$2"

convert "$input" -font 'Gill-Sans-Bold' -pointsize 32 -gravity South -annotate +0+40 "$initials" "$input"
