#!/usr/bin/env node
/**
 * fill-template.js
 * Reads client-data.json, replaces all [TOKEN] placeholders in every .html
 * file in this directory, and writes output to ./dist/.
 *
 * Usage:
 *   node fill-template.js
 *   node fill-template.js --check   (only report unfilled tokens, no output)
 */

const fs   = require('fs');
const path = require('path');

const CHECK_ONLY = process.argv.includes('--check');
const TOKEN_RE   = /\[([A-Z][A-Z 0-9_]*)\]/g;

// ── Load client data ──────────────────────────────────────────────────────
if (!fs.existsSync('client-data.json')) {
  console.error('ERROR: client-data.json not found. Create it before running.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync('client-data.json', 'utf8'));

// ── Collect HTML files ────────────────────────────────────────────────────
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html')).sort();

if (!CHECK_ONLY) {
  if (!fs.existsSync('dist')) fs.mkdirSync('dist');
  const imgSrc = path.join('.', 'images');
  const imgDst = path.join('dist', 'images');
  if (fs.existsSync(imgSrc)) {
    const copyDir = (src, dst) => {
      if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
      }
    };
    copyDir(imgSrc, imgDst);
  }
}

// ── Process each file ─────────────────────────────────────────────────────
const unfilled = new Set();

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace known tokens from client-data.json (including empty values → strip)
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `[${key}]`;
    content = content.split(placeholder).join(value ?? '');
  }

  // Collect any remaining unfilled tokens, then strip them
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(content)) !== null) {
    unfilled.add(m[1]);
  }
  content = content.replace(TOKEN_RE, '');

  if (!CHECK_ONLY) {
    fs.writeFileSync(path.join('dist', file), content, 'utf8');
    console.log(`  ✓  ${file}`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────
if (unfilled.size > 0) {
  console.log('\n⚠️  Unfilled tokens (' + unfilled.size + '):');
  for (const t of [...unfilled].sort()) {
    console.log(`     [${t}]`);
  }
  if (CHECK_ONLY) process.exit(1);
} else {
  console.log('\n✅  All tokens filled. Output in ./dist/');
}
