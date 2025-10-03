#!/usr/bin/env bash

set -euo pipefail

identify -format "%f: %wx%h\n" public/images/*.jpg
