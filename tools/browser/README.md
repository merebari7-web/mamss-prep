# Browser test harness

Real-browser tests for the static site in `docs/`. They exist because this app is
a 300 KB single-page bundle with 13 lazy modules — a headless pass is the only
practical way to know a change did not break the paper engine.

## One-time setup

```bash
cd tools/browser
npm init -y && npm i puppeteer@23
# Chrome needs system libraries on a bare Linux box:
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 fonts-liberation
```

## Serve the site

`serve.js` mimics GitHub Pages (gzip/brotli, `max-age=600`, correct MIME types).
Set `TLS_KEY`/`TLS_CERT` to serve over HTTPS — required if you want to exercise
the service worker the same way production does.

```bash
node serve.js ../../docs 8100                                   # http
TLS_KEY=key.pem TLS_CERT=cert.pem node serve.js ../../docs 8443 # https
```

## Run the tests

```bash
node smoke.js   https://127.0.0.1:8443/ UPGRADED   # sign up -> sit a paper -> review (11 steps)
node features.js https://127.0.0.1:8443/           # manifest, SW, offline, Data Saver, bank rescue
node synctest.js                                   # v44: export on one profile, import on another
node bench2.js  https://127.0.0.1:8443/ UPGRADED /tmp/upg.req.log 3   # true network bytes per visit
node audit.js   https://127.0.0.1:8443/ UPGRADED shot.png             # head/DOM/perf snapshot
```

`synctest.js` launches three separate browser profiles and proves a sync code
carries XP, merits, papers and badges from one "device" to another, that the
import merges (never overwrites the local profile), that re-importing the same
code does not duplicate papers, and that garbage input fails with a friendly
message instead of an exception.

`bench2.js` measures bytes at the server, not `transferSize` in the page —
once a service worker is involved the in-page numbers no longer reflect what
the radio actually downloaded.

Always run `smoke.js` against the current production build first and keep the
output: it is your before/after parity check.
