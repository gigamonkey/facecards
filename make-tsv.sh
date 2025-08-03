#!/usr/bin/env bash

set -euo pipefail

sqlite3 "$1" --header --tabs 'select teacherName, teacherEmail, studentNumber, personId, firstName, lastName, nickname, grade, gender, course, period from students order by teacherName, period, firstName'
