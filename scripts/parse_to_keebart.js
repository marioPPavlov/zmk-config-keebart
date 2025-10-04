#!/usr/bin/env node

/*
  Insert two `&trans` in the middle (between 5th and 6th key) of row 0 and row 1
  for every layer inside the keymap object of a ZMK .keymap file.
  Also normalize the physical layout to `&default_layout` when it references `&foostan_corne_5col_layout`.

  Usage:
    node scripts/parse_to_keebart.js [path/to/keymap]

  Defaults to config/corne_choc_pro.keymap if no path is provided.
*/

const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join('config', 'corne_choc_pro.keymap');
const keymapPath = process.argv[2] || DEFAULT_PATH;

function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeFile(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function findKeymapSection(text) {
  const keymapIdx = text.indexOf('keymap');
  if (keymapIdx === -1) return null;

  // Find the first '{' following the 'keymap' keyword
  const openIdx = text.indexOf('{', keymapIdx);
  if (openIdx === -1) return null;

  // Match braces to find the closing '}' of keymap block
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return { startKeyword: keymapIdx, openBrace: openIdx, closeBrace: i };
      }
    }
  }
  return null;
}

function parseBindingsTokensFromLine(line) {
  // A column starts with '&' and continues until the next '&' or EOL
  const s = line.trim();
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '&') {
      let j = i + 1;
      while (j < s.length && s[j] !== '&') j++;
      const token = s.slice(i, j).trim().replace(/\s+/g, ' ');
      if (token) tokens.push(token);
      i = j;
    } else {
      i++;
    }
  }
  return tokens;
}

function rebuildLineWithTokens(originalLine, tokens) {
  const indentMatch = originalLine.match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : '';
  return indent + tokens.join('  ');
}

function insertTransInFirstTwoRows(bindingsBody) {
  // bindingsBody is everything between '<' and '>;' (can be multi-line)
  const lines = bindingsBody.split('\n');
  let modifiedRows = 0;

  const out = lines.map((line) => {
    if (modifiedRows < 2 && line.includes('&')) {
      // Consider this a row with bindings
      const tokens = parseBindingsTokensFromLine(line);

      // Determine insertion index based on counted columns: after the midpoint
      const insertIndex = Math.floor(tokens.length / 2);

      // Avoid duplicating if already present in the middle positions
      const already = tokens[insertIndex] === '&trans' && tokens[insertIndex + 1] === '&trans';
      if (!already) tokens.splice(insertIndex, 0, '&trans', '&trans');

      modifiedRows++;
      return rebuildLineWithTokens(line, tokens);
    }
    return line; // leave other lines as-is
  });

  return out.join('\n');
}

function processKeymap(text) {
  const keymap = findKeymapSection(text);
  if (!keymap) throw new Error('Could not locate keymap section.');

  const before = text.slice(0, keymap.openBrace + 1);
  const inside = text.slice(keymap.openBrace + 1, keymap.closeBrace);
  const after = text.slice(keymap.closeBrace);

  // Replace only bindings inside keymap layers
  const bindingsRe = /bindings\s*=\s*<([\s\S]*?)>\s*;/g;

  const newInside = inside.replace(bindingsRe, (full, body) => {
    const newBody = insertTransInFirstTwoRows(body);
    return `bindings = <${newBody}>;`;
  });

  return before + newInside + after;
}

function normalizePhysicalLayout(text) {
  // Replace any foostan layout reference to default_layout, preserving spacing and semicolon
  return text.replace(/(zmk,physical-layout\s*=\s*)&?foostan_corne_5col_layout(\s*;)/g, '$1&default_layout$2');
}

function main() {
  if (!fs.existsSync(keymapPath)) {
    console.error(`❌ File not found: ${keymapPath}`);
    process.exit(1);
  }

  const original = readFile(keymapPath);

  // First, normalize the physical layout reference
  const layoutUpdated = normalizePhysicalLayout(original);

  // Then, update keymap layers
  const updated = processKeymap(layoutUpdated);
  writeFile(keymapPath, updated);

  console.log(`✓ Normalized physical layout to &default_layout (if needed)`);
  console.log(`✓ Updated first two rows with &trans &trans in middle for all keymap layers in: ${keymapPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('❌ Error:', e.message || e);
    process.exit(1);
  }
}
