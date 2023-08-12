# Remove make's default rules.
.SUFFIXES:

SHELL := bash -O globstar

pretty:
	prettier -w *.js public/**/*.css

dev:
	npx nodemon --watch . -e js,mjs,json,njk,html index.js

.PHONY: pretty dev
