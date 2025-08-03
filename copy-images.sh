#!/usr/bin/env bash

set -euo pipefail

photos="$1"

mkdir -p public/images

sqlite3 db.db --tabs "select studentNumber from students" | while read -r n; do
    if [[ ! -e "public/images/$n.jpg" ]]; then
        if [[ -e "$photos/$n.jpg" ]]; then
            cp "$photos/$n.jpg" public/images/
        else
            >&2 echo "Missing $n.jpg"
        fi
    else
        >&2 echo "Already copied $n.jpg"
    fi
done
