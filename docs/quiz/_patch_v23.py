#!/usr/bin/env python3
# v23.0 "Mater Notes removed" — service-worker cache-key bump so every client
# evicts the old library cache (launcher, module and PDFs are gone).
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SW = os.path.join(HERE, "..", "sw.js")
sw = open(SW, encoding="utf-8").read()
if '"-v23"' in sw:
    print("sw already -v23 — skipped"); raise SystemExit
assert sw.count('"-v22"') == 1, "sw -v22 literal ambiguous/missing"
sw = sw.replace('"-v22"', '"-v23"', 1)
m = "/* v22 — Second Term in Mater Notes"
assert sw.count(m) == 1, "v22 comment marker missing"
sw = sw.replace(m, "/* v23 — Mater Notes library removed from the site (launcher, module and PDF archive deleted); cache bumped so clients purge the old entries */; " + m, 1)
open(SW, "w", encoding="utf-8").write(sw)
print("ok sw -v23")
