# Remove make's default rules.
.SUFFIXES:

SHELL := bash -O globstar

all: db.db download-missing.sh students.tsv

db.db: schema.sql students-2025-26.csv
	sqlite3 $@ < $<

students.tsv: db.db
	./make-tsv.sh $< > $@

download-missing.sh: db.db
	./make-download.sh > $@ && chmod +x $@

pretty:
	prettier -w *.js public/**/*.css

dev:
	npx nodemon --watch . -e env,js,mjs,json,njk,html,tsv index.js

clean:
	rm -f db.db
	rm -f download-missing.sh

.PHONY: pretty dev
