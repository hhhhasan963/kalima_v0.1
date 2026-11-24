#!/usr/bin/env node
// يزيد رقم الإصدار: V1.00 ← V1.01 ← V1.02 ... (و V1.99 ← V2.00)
// ويحدّث src/version.js و package.json (V1.05 ↔ 1.0.5)
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/version.js';
const src = readFileSync(file, 'utf8');
const m = /V(\d+)\.(\d{2})/.exec(src);
if (!m) throw new Error('لم أجد رقم الإصدار في ' + file);
let major = +m[1];
let minor = +m[2] + 1;
if (minor > 99) {
  major++;
  minor = 0;
}
const next = `V${major}.${String(minor).padStart(2, '0')}`;
writeFileSync(file, src.replace(m[0], next));

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
pkg.version = `${major}.0.${minor}`;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`${m[0]} → ${next}  (أضف سطراً في CHANGELOG.md)`);
