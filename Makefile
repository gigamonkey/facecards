# Remove make's default rules.
.SUFFIXES:

SHELL := bash -O globstar

db.db: schema.sql students-2025-26.csv
	sqlite3 $@ < $<

students.tsv: db.db
	sqlite3 $< --header --tabs 'select studentNumber, personId, firstName, lastName, nickname, grade, gender, course, period from students' > $@

pretty:
	prettier -w *.js public/**/*.css

dev:
	npx nodemon --watch . -e js,mjs,json,njk,html,tsv index.js

.PHONY: pretty dev
