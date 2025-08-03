#!/usr/bin/env bash

set -euo pipefail

sqlite3 db.db --tabs "select printf('./download %d %d', personId, studentNumber) from students join missing using (studentNumber);"
