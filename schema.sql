drop table if exists students;
drop table if exists missing;

.mode csv
.import students-2025-26.csv students

create table missing (studentNumber text);

.import '| ./find-missing.sh' missing
