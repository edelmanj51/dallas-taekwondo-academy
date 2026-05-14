#!/usr/bin/env node
/**
 * fill-template.js
 * Reads client-data.json, replaces all [TOKEN] placeholders in every .html
 * file in _src/, and writes the filled output to the repo root.
 *
 * Cloudflare Pages serves from the root directory — no build step required.
 *
 * Usage:
 *   node fill-template.js          (fill and write to root)
 *   node fill-template.js --check  (report unfilled tokens, no output)
 */

const fs   = require('fs');
const path = require('path');

const CHECK_ONLY = process.argv.includes('--check');
const TOKEN_RE   = /\[([A-Z][A-Z 0-9_]*)\]/g;
const SRC_DIR    = '_src';

// ── Load client data ──────────────────────────────────────────────────────
if (!fs.existsSync('client-data.json')) {
  console.error('ERROR: client-data.json not found.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync('client-data.json', 'utf8'));

// ── Collect HTML source files ─────────────────────────────────────────────
const htmlFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.html')).sort();

// ── Process each file ─────────────────────────────────────────────────────
const unfilled = new Set();

for (const file of htmlFiles) {
  let content = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');

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
    fs.writeFileSync(file, content, 'utf8');
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
  console.log('\n✅  All tokens filled. Root HTML updated — push to deploy.');
}
