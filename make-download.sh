#!/usr/bin/env bash

set -euo pipefail

echo "#!/usr/bin/env bash"
echo ""

sqlite3 db.db --tabs "select printf('./download %d %d', personId, studentNumber) from students join missing using (studentNumber);"
