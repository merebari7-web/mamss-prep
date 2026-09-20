#!/usr/bin/env python3
"""Re-extract headless-Chrome shared libs into /tmp/libx (workspace snapshots do
not persist /tmp, so this is re-run when the sandbox resets). Idempotent."""
import urllib.request, gzip, re, os, subprocess, json

WANT = {"libasound2t64", "libatk1.0-0t64", "libatk-bridge2.0-0t64", "libatspi2.0-0t64",
        "libcups2t64", "libnspr4", "libnss3", "libxdamage1", "libxkbcommon0",
        "libavahi-client3", "libavahi-common3", "libdbus-1-3"}
DIST = "https://deb.debian.org/debian/dists/trixie/main/binary-amd64/Packages.gz"
BASE = "https://deb.debian.org/debian/"
J = "/tmp/debs.json"

if not os.path.exists(J):
    req = urllib.request.Request(DIST, headers={"User-Agent": "curl/8"})
    data = gzip.decompress(urllib.request.urlopen(req, timeout=180).read()).decode()
    got = {}
    for blk in data.split("\n\n"):
        m = re.search(r"^Package: (.+)$", blk, re.M)
        if m and m.group(1) in WANT:
            fn = re.search(r"^Filename: (.+)$", blk, re.M)
            if fn:
                got[m.group(1)] = fn.group(1)
    json.dump(got, open(J, "w"))

os.makedirs("/tmp/libx", exist_ok=True)
debs = json.load(open(J))
for name, rel in debs.items():
    local = "/tmp/" + os.path.basename(rel)
    if not os.path.exists(local):
        r = urllib.request.Request(BASE + rel, headers={"User-Agent": "curl/8"})
        open(local, "wb").write(urllib.request.urlopen(r, timeout=180).read())
    subprocess.run(["dpkg-deb", "-x", local, "/tmp/libx"], check=True)
print("libx ready:", len(debs), "packages extracted")
