-- Student data exported from IC using "students for facecards" query.
drop table if exists students;
.mode csv
.import students-2025-26.csv students

-- Find students for whom we have no photo in our photos directory.
drop table if exists missing;
create table missing (studentNumber text);
.import '| ./find-missing.sh' missing
