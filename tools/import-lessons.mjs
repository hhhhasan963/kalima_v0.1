#!/usr/bin/env node
// رفع ملفات الدروس (JSON) إلى Supabase من الحاسوب (بديل عن صفحة المعلم داخل التطبيق).
//
//   npm run validate:lessons          ← فحص الملفات فقط (بدون اتصال)
//   npm run import:lessons            ← فحص ثم رفع كل ملفات content/
//   node tools/import-lessons.mjs content/G9-WB-U3.json   ← ملف واحد
//
// يحتاج (ضعهما في .env.local، المفتاح سرّي ولا يُرفع لأي مكان):
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// اسم الملف G9-SB-U13.json ويجب أن يطابق grade و book و unit داخل الملف.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { checkFileName, validateLesson } from '../src/lib/lessonFile.js';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) targets.push('content');

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const URL_ = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function walk(p) {
  if (!existsSync(p)) return [];
  if (statSync(p).isFile()) return p.endsWith('.json') ? [p] : [];
  return readdirSync(p).flatMap((n) => walk(join(p, n))).sort();
}
const isStr = (x) => typeof x === 'string' && x.trim().length > 0;

async function call(path, body, extra = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw new Error(typeof data === 'object' && data ? data.message || JSON.stringify(data) : String(data));
  return data;
}

const files = targets.flatMap(walk);
if (!files.length) {
  console.error('لا توجد ملفات JSON في: ' + targets.join(', '));
  process.exit(1);
}

let bad = 0;
const jobs = [];
for (const f of files) {
  if (basename(f) === 'dictionary.json') {
    jobs.push({ f, dictionary: true });
    continue;
  }
  let o;
  try {
    o = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    console.error(`✗ ${f}\n    JSON غير صالح: ${e.message}`);
    bad++;
    continue;
  }
  const errs = [...validateLesson(o), ...checkFileName(basename(f), o)];
  if (errs.length) {
    console.error(`✗ ${f}\n` + errs.map((e) => '    - ' + e).join('\n'));
    bad++;
  } else jobs.push({ f, o });
}

if (bad) {
  console.error(`\nتوقّف: ${bad} ملف فيه أخطاء، ولم يُرفع شيء.`);
  process.exit(1);
}
console.log(`✓ ${jobs.length} ملف سليم`);
if (dry) process.exit(0);

if (!URL_ || !KEY) {
  console.error('\nحدّد SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (في .env.local أو كمتغيّرات بيئة).');
  process.exit(1);
}

let failed = 0;
for (const j of jobs) {
  try {
    if (j.dictionary) {
      const dict = JSON.parse(readFileSync(j.f, 'utf8'));
      const rows = Object.entries(dict).filter(([k, v]) => isStr(k) && isStr(v)).map(([word, meaning]) => ({ word, meaning }));
      await call('dictionary?on_conflict=word', rows, { Prefer: 'resolution=merge-duplicates,return=minimal' });
      console.log(`✓ القاموس: ${rows.length} كلمة`);
    } else console.log('✓ ' + (await call('rpc/import_lesson', { p: j.o, p_book: null })));
  } catch (e) {
    failed++;
    console.error(`✗ ${j.f}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
