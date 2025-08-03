#!/usr/bin/env bash

set -euo pipefail

sqlite3 db.db --tabs 'select studentNumber from students order by studentNumber' | while read -r n; do
    if [[ ! -e "photos-2024-25/$n.jpg" ]]; then
        echo "$n";
    fi
done
