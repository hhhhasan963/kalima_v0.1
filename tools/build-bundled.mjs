#!/usr/bin/env node
// يولّد src/data/lessons.generated.js من ملفات content/*.json (الدروس + dictionary.json)
// حتى تُضمَّن كل الدروس داخل التطبيق ويعمل بدون إنترنت من أول تشغيل.
//   npm run build:bundled      ← شغّله بعد أي تعديل على ملفات content/
// (الأمر dev/build يشغّله تلقائياً قبل البناء: انظر package.json)
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFileName, lessonIdOf, validateLesson } from '../src/lib/lessonFile.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'content');
const files = readdirSync(dir).filter((f) => /^G\d+-[A-Z]+-U[\d.]+\.json$/i.test(f));

const lessons = [];
let bad = 0;
for (const f of files) {
  const o = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const errs = [...validateLesson(o), ...checkFileName(f, o)];
  if (errs.length) {
    console.error('✗ ' + f + '\n  - ' + errs.join('\n  - '));
    bad++;
    continue;
  }
  lessons.push(o);
}
if (bad) process.exit(1);

// الترتيب: الكتاب ثم رقم الوحدة. دروس المراجعة (6.5 و12.5) تأخذ رمزاً قصيراً R1/R2 (كتاب الطالب) أو P1/P2 (اختبار تقدّم)
lessons.sort((a, b) => a.book.localeCompare(b.book) || a.unit - b.unit);
const rv = {};
const out = lessons.map((o) => {
  const whole = Number.isInteger(o.unit);
  let short = String(o.unit);
  if (!whole) {
    rv[o.book] = (rv[o.book] || 0) + 1;
    short = (o.book.toLowerCase() === 'wb' ? 'P' : 'R') + rv[o.book];
  }
  const access = o.access || (o.free ? 'open' : 'members');
  return {
    id: lessonIdOf(o),
    book: `g${o.grade}-${o.book.toLowerCase()}`,
    unit: o.unit,
    kind: whole ? 'unit' : o.book.toLowerCase() === 'wb' ? 'test' : 'review',
    label: o.label || 'Unit ' + o.unit,
    short,
    t: o.title,
    a: o.titleAr || '',
    SS: o.sentences,
    Q: o.questions,
    W: o.words || {},
    free: access === 'open',
    access,
    locked: false,
    rev: 0,
  };
});

// الدرس الأول (أصغر رقم وحدة) من كل كتاب فقط
const firstOf = {};
out.forEach((l) => {
  if (!(l.book in firstOf) || l.unit < firstOf[l.book].unit) firstOf[l.book] = l;
});
const bundled = Object.values(firstOf);

const dictFile = join(dir, 'dictionary.json');
const dict = existsSync(dictFile) ? JSON.parse(readFileSync(dictFile, 'utf8')) : {};

const js =
  '// ملف مولَّد تلقائياً من content/*.json بالأمر: npm run build:bundled — لا تعدّله يدوياً\n' +
  '// يُضمَّن الدرس الأول من كل كتاب فقط (نسخة احتياطية لأول تشغيل بلا إنترنت)، والبقية تأتي من Supabase\nexport const LESSONS = ' + JSON.stringify(bundled) + ';\n' +
  'export const DICT = ' + JSON.stringify(dict) + ';\n';
writeFileSync(join(root, 'src/data/lessons.generated.js'), js);
console.log(`✓ ${bundled.length} درساً مضمّناً من ${out.length} + ${Object.keys(dict).length} كلمة في القاموس ← src/data/lessons.generated.js (${(js.length / 1024).toFixed(0)} KB)`);
