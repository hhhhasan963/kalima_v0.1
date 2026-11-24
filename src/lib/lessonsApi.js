import { supabase } from './supabase.js';

// ذاكرة المتصفح (V1.01): كل درس يُحفظ مع رقم تعديله (rev). نسخة الزائر والمسجّل منفصلتان
// حتى لا يرى الزائر دروساً كانت محفوظة لمستخدم مسجّل.
const CAT_KEY = 'kalima:v2:catalog';
const DICT_KEY = 'kalima:v2:dict';
const lessonsKey = (g, audience) => 'kalima:v2:lessons:' + g + ':' + audience;
const isStr = (x) => typeof x === 'string' && x.length > 0;

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function writeJSON(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

// يحذف نسخ الإصدار V1.00 المحفوظة (صيغة قديمة) لتوفير المساحة
export function purgeLegacyCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k === 'kalima:catalog' || k.startsWith('kalima:lessons:'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function readCatalogCache() {
  const c = readJSON(CAT_KEY);
  return c && c.data && Array.isArray(c.data.grades) && c.data.grades.length ? c : null;
}
export function readDictCache() {
  const c = readJSON(DICT_KEY);
  return c && c.dict && typeof c.dict === 'object' ? c : null;
}
export function readLessonsCache(grade, audience = 'user') {
  const c = readJSON(lessonsKey(grade, audience));
  return c && Array.isArray(c.lessons) && c.lessons.length ? c : null;
}

export function validateCatalog(raw) {
  const grades = (raw && Array.isArray(raw.grades) ? raw.grades : []).filter(
    (g) => g && isStr(g.id) && isStr(g.title)
  ).map((g) => ({ ...g, available: !!g.available, order: Number.isFinite(g.order) ? g.order : 0 }));
  const books = (raw && Array.isArray(raw.books) ? raw.books : []).filter(
    (b) => b && isStr(b.id) && isStr(b.grade) && isStr(b.code) && isStr(b.title)
  ).map((b) => ({ ...b, titleAr: b.titleAr || b.title, subtitle: b.subtitle || '', listTitle: b.listTitle || '', order: Number.isFinite(b.order) ? b.order : 0 }));
  grades.sort((a, b) => a.order - b.order);
  books.sort((a, b) => a.order - b.order);
  return grades.length ? { grades, books } : null;
}

// فحص دروس الصف القادمة من القاعدة: يحذف العناصر الفاسدة ويبلّغ عنها في الكونسول
// بدل أن يتعطل التطبيق كله بسبب سؤال واحد خاطئ.
export function validateBundle(raw) {
  const problems = [];
  const lessons = [];
  const list = raw && Array.isArray(raw.lessons) ? raw.lessons : [];

  for (const l of list) {
    const where = 'الدرس ' + (l && l.id !== undefined ? l.id : '?');
    if (!l || !isStr(l.id) || !isStr(l.book) || !Number.isFinite(l.unit) || !isStr(l.t)) {
      problems.push(where + ': بيانات الدرس ناقصة');
      continue;
    }
    const base = {
      ...l,
      kind: l.kind || 'unit',
      label: isStr(l.label) ? l.label : 'Unit ' + l.unit,
      short: isStr(l.short) ? l.short : String(l.unit),
      W: l.W && typeof l.W === 'object' ? l.W : {},
      access: ['open', 'members', 'closed'].includes(l.access) ? l.access : 'members',
    };
    // درس مقفل للزائر: نحتفظ بعنوانه فقط ليظهر مقفلاً في القائمة
    if (l.locked) {
      lessons.push({ ...base, SS: [], Q: [], W: {}, locked: true });
      continue;
    }
    const SS = (Array.isArray(l.SS) ? l.SS : []).filter((s, i) => {
      const ok = Array.isArray(s) && isStr(s[0]) && typeof s[1] === 'string' && Number.isInteger(s[2]);
      if (!ok) problems.push(`${where}، الجملة ${i + 1}: غير صالحة`);
      return ok;
    });
    if (!SS.length) {
      problems.push(where + ': لا توجد جمل');
      continue;
    }
    const Q = (Array.isArray(l.Q) ? l.Q : []).filter((q, i) => {
      let ok = !!q && isStr(q.q) && Number.isInteger(q.a);
      if (ok && q.tf) ok = q.a === 0 || q.a === 1;
      else if (ok) ok = Array.isArray(q.o) && q.o.length >= 2 && q.o.every(isStr) && q.a >= 0 && q.a < q.o.length;
      if (!ok) problems.push(`${where}، السؤال ${i + 1}: رقم الإجابة أو الخيارات غير صالحة`);
      return ok;
    });
    lessons.push({ ...base, SS, Q, locked: false });
  }
  problems.forEach((p) => console.warn('[kalima] ' + p));

  const dict = raw && raw.dict && typeof raw.dict === 'object' ? raw.dict : {};
  return { lessons, dict, problems };
}

// التحديث التفاضلي: نسأل القاعدة عن «قائمة خفيفة» (رقم تعديل كل درس) ونقارنها بما عندنا،
// ثم نحمّل الدروس التي تغيّرت أو لم تكن عندنا فقط (بدل كل دروس الصف).
// الكتالوج (الصفوف والكتب) والقاموس العام لهما رقم تعديل خاص بكل منهما.
export async function syncContent({ grade, audience, catalogCache, dictCache, lessonsCache }) {
  if (!supabase) return { ok: false };
  try {
    const m = await supabase.rpc('get_manifest', { p_grade: grade || null });
    if (m.error) throw m.error;
    const man = m.data || {};
    const out = { ok: true, downloaded: 0 };

    if (!catalogCache || String(catalogCache.rev) !== String(man.catalogRev)) {
      const r = await supabase.rpc('get_catalog');
      if (r.error) throw r.error;
      const cat = validateCatalog(r.data);
      if (cat) {
        writeJSON(CAT_KEY, { rev: man.catalogRev, data: cat });
        out.catalog = cat;
      }
    }

    if (grade) {
      if (!dictCache || String(dictCache.rev) !== String(man.dictRev)) {
        const r = await supabase.rpc('get_dictionary');
        if (r.error) throw r.error;
        if (r.data && typeof r.data === 'object') {
          writeJSON(DICT_KEY, { rev: man.dictRev, dict: r.data });
          out.dict = r.data;
        }
      }

      const items = Array.isArray(man.lessons) ? man.lessons : [];
      const have = new Map(((lessonsCache && lessonsCache.lessons) || []).map((l) => [l.id, l]));
      const need = items
        .filter((x) => {
          const c = have.get(x.id);
          return !c || c.rev !== x.rev || !!c.locked !== !!x.locked;
        })
        .map((x) => x.id);

      const fresh = new Map();
      if (need.length) {
        const r = await supabase.rpc('get_lessons_by_ids', { p_ids: need });
        if (r.error) throw r.error;
        validateBundle({ lessons: r.data }).lessons.forEach((l) => fresh.set(l.id, l));
        out.downloaded = fresh.size;
      }
      const lessons = items.map((x) => fresh.get(x.id) || have.get(x.id)).filter(Boolean);
      if (!lessons.some((l) => !l.locked)) throw new Error('empty lessons list');
      writeJSON(lessonsKey(grade, audience), { grade, audience, at: Date.now(), lessons });
      out.lessons = lessons;
    }
    return out;
  } catch (e) {
    console.warn('[kalima] تعذّر تحديث المحتوى من الخادم، سنستخدم النسخة المحفوظة', e);
    return { ok: false };
  }
}
