raw := $(wildcard raw/*.jpeg)
fixed := $(patsubst raw/%.jpeg,fixed/%.png,$(raw))

all: $(fixed)
	./add-initials.sh

fixed/%.png: raw/%.jpeg
	./fix.sh $< $@
