#!/usr/bin/env bash

set -euo pipefail

fly secrets import --stage < fly.env
