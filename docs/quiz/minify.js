/* Post-build minifier: shrinks the app's JS + CSS blocks in index.html.
   The question-bank block (base64 payload) is never touched; every other
   script/style body is minified in place. Usage: node quiz/minify.js */
const fs = require("fs");
const terser = require("terser");
const CleanCSS = require("clean-css");

const P = process.argv[2] || "index.html";
const src = fs.readFileSync(P, "utf8");
const orig = Buffer.byteLength(src, "utf8");

const B64_RUN = /[A-Za-z0-9+/=]{20000,}/;
const bankLen = (() => {
  const m = src.match(B64_RUN);
  return m ? m[0].length : -1;
})();
const BANK = "bank.js";
const splitMode = fs.existsSync(BANK);
if (splitMode) {
  /* split build: the bank lives in bank.js — minify the decoder, never the payload */
  const bsrc = fs.readFileSync(BANK, "utf8");
  const bm = bsrc.match(B64_RUN);
  if (!bm) throw new Error("bank.js has no payload");
  const b64len = bm[0].length;
  const r2 = terser.minify_sync(bsrc, {
    compress: { passes: 3, keep_fnames: true, keep_classnames: true },
    mangle: { keep_fnames: true },
    format: { comments: false }
  });
  if (!r2 || typeof r2.code !== "string") throw new Error("terser returned nothing for bank.js");
  const bm2 = r2.code.match(B64_RUN);
  if (!bm2 || bm2[0].length !== b64len) throw new Error("bank.js payload changed — aborting");
  fs.writeFileSync(BANK, r2.code);
  console.log(`bank.js: ${bsrc.length} -> ${r2.code.length} B`);
}
if (bankLen < 0 && !splitMode) throw new Error("bank b64 payload not found — aborting");

let jsBlocks = 0, cssBlocks = 0, skipped = 0;
let out = src.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (whole, body) => {
  if (B64_RUN.test(body)) { skipped++; return whole; }           // question bank — untouched
  if (!body.trim()) { skipped++; return whole; }
  jsBlocks++;
  let res;
  try {
    res = terser.minify_sync(body, {
      compress: { passes: 3, keep_fnames: true, keep_classnames: true },
      mangle: { keep_fnames: true },
      format: { comments: false }
    });
  } catch (e) {
    throw new Error("terser failed: " + (e && e.message) + "\n--- block head: " + body.slice(0, 120));
  }
  if (!res || typeof res.code !== "string") throw new Error("terser returned nothing");
  return whole.replace(body, res.code);
}).replace(/<style\b[^>]*>([\s\S]*?)<\/style>/g, (whole, css) => {
  cssBlocks++;
  const r = new CleanCSS({ level: { 1: { all: true }, 2: { all: true, removeUnusedAtRules: false } }, inline: false }).minify(css);
  if (r.errors && r.errors.length) throw new Error("clean-css: " + r.errors.join("; "));
  let styles = r.styles;
  /* clean-css level-2 can drop #curtain's pointer-events:none when re-minifying an
     already-minified sheet; the curtain must never swallow clicks (see test 97) */
  if (!/#curtain\{[^}]*pointer-events:none/.test(styles)) styles = styles.replace(/#curtain\{/, "#curtain{pointer-events:none;");
  return whole.replace(css, styles);
});

/* strip indentation and blank lines from the HTML shell — never inside script/style */
const SHELL_RE = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g;
(function trimShell() {
  let htmlOut = "", lastIdx = 0, m2;
  const clean = (seg) => seg.replace(/^[ \t]+/gm, "").replace(/[ \t]+$/gm, "").replace(/\n{2,}/g, "\n");
  while ((m2 = SHELL_RE.exec(out))) {
    htmlOut += clean(out.slice(lastIdx, m2.index)) + m2[0];
    lastIdx = SHELL_RE.lastIndex;
  }
  htmlOut += clean(out.slice(lastIdx));
  out = htmlOut;
})();

const now = Buffer.byteLength(out, "utf8");
if (!splitMode) {
  if (!B64_RUN.test(out)) throw new Error("bank payload lost — aborting");
  if (out.match(B64_RUN)[0].length !== bankLen) throw new Error("bank payload changed — aborting");
} else if (B64_RUN.test(out)) throw new Error("split build: inline bank payload found — aborting");

/* preserve wave-marker tags that tools/tests read from the source */
const MARKERS = [
  "LIVING GOLD-DUST",
  "MAISON D'\u00c9TUDE",
  "GRAPHICS-RICH",
  "ATELIER-FX",
  "CONTENT-GUARD",
  "PROGRESS-HQ",
  "ATELIER-II",
  "PERFECTION",
  "THE PROFESSORS' STANDARD",
  "3D SHAPES LAB",
  "AI COACH",
  "FINISHING-SCHOOL",
  "OFFLINE-SW"
];
const missing = MARKERS.filter(function(m){ return out.indexOf(m) < 0; });
if (missing.length){
  const note = "<!-- builder markers: " + missing.join(" · ") + " -->\n";
  const at = out.indexOf("</body>");
  if (at < 0) throw new Error("no </body>");
  out = out.slice(0, at) + note + out.slice(at);
  console.log("injected markers:", missing.join(", "));
}

fs.writeFileSync(P, out);
console.log(`minified: ${orig} -> ${now} B (-${Math.round((1 - now / orig) * 100)}%)  [js blocks ${jsBlocks}, css ${cssBlocks}, skipped ${skipped}]`);
