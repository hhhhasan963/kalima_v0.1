// صيغة ملف الدرس (schema 2) والتحقق منها. تُستخدم في صفحة المعلم داخل التطبيق وفي أداة الرفع tools/import-lessons.mjs.
//
// اسم الملف:  G{الصف}-{الكتاب}-U{الوحدة}.json   مثل: G9-SB-U13.json  أو  G9-WB-U6.5.json
// ويجب أن يطابق grade و book و unit داخل الملف.

export const SUPPORTED_SCHEMA = 2;
export const SUPPORTED_SUBJECTS = ['english'];
export const FILE_NAME_HELP = 'اسم الملف بالصيغة G9-SB-U13.json (الصف-الكتاب-الوحدة)';
const FILE_NAME_RE = /^G(\d{1,2})-([A-Z]{2,4})-U(\d{1,2}(?:\.5)?)\.json$/i;

const isStr = (x) => typeof x === 'string' && x.trim().length > 0;

export function parseFileName(name) {
  const m = FILE_NAME_RE.exec(name || '');
  return m ? { grade: parseInt(m[1], 10), book: m[2].toLowerCase(), unit: parseFloat(m[3]) } : null;
}

// معرّف الدرس في القاعدة (نفس قاعدة الدالة import_lesson)
export function lessonIdOf(o) {
  const u = Number.isInteger(o.unit) ? String(o.unit) : String(o.unit).replace('.', '_');
  return `g${o.grade}-${String(o.book).toLowerCase()}-${u}`;
}

// اسم الملف الصحيح لدرس (للتحميل)
export const fileNameFor = (o) => `G${o.grade}-${String(o.book).toUpperCase()}-U${Number(o.unit)}.json`;

// يطابق اسم الملف مع محتواه
export function checkFileName(name, o) {
  const n = parseFileName(name);
  if (!n) return [`اسم الملف «${name}» غير صحيح. ${FILE_NAME_HELP}`];
  const errs = [];
  if (o && o.grade !== undefined && n.grade !== o.grade) errs.push(`اسم الملف يقول الصف ${n.grade} لكن الملف يقول grade = ${o.grade}`);
  if (o && o.book !== undefined && String(o.book).toLowerCase() !== n.book) errs.push(`اسم الملف يقول الكتاب ${n.book.toUpperCase()} لكن الملف يقول book = ${o.book}`);
  if (o && typeof o.unit === 'number' && n.unit !== o.unit) errs.push(`اسم الملف يقول الوحدة ${n.unit} لكن الملف يقول unit = ${o.unit}`);
  return errs;
}

// يرجع قائمة أخطاء (فارغة = سليم). نفس شروط قاعدة البيانات لتظهر الأخطاء قبل الرفع وبرسالة واضحة.
export function validateLesson(o) {
  const errs = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) return ['الملف ليس كائن JSON'];
  if (o.schema !== undefined && o.schema !== SUPPORTED_SCHEMA) errs.push(`schema = ${o.schema} غير مدعوم (المدعوم: ${SUPPORTED_SCHEMA})`);
  if (o.subject !== undefined && !SUPPORTED_SUBJECTS.includes(String(o.subject).toLowerCase())) errs.push(`subject = «${o.subject}» غير مدعوم (المدعوم: ${SUPPORTED_SUBJECTS.join(', ')})`);
  if (o.stream !== undefined && o.stream !== null && !isStr(o.stream)) errs.push('stream يجب أن يكون null أو نصاً');
  if (!Number.isInteger(o.grade)) errs.push('grade مطلوب ويجب أن يكون رقماً صحيحاً (مثل 9)');
  if (!isStr(o.book) || !/^[a-z]{2,4}$/i.test(o.book)) errs.push('book مطلوب (مثل "sb" أو "wb")');
  if (typeof o.unit !== 'number' || !isFinite(o.unit)) errs.push('unit مطلوب ويجب أن يكون رقماً (مثل 4 أو 6.5)');
  else if (o.unit <= 0 || o.unit * 2 !== Math.round(o.unit * 2)) errs.push('unit: الأرقام المسموحة 4 أو 6.5 (نصف وحدة فقط)');
  if (o.label !== undefined && o.label !== null && !isStr(o.label)) errs.push('label يجب أن يكون نصاً');
  if (o.access !== undefined && !['open', 'members', 'closed'].includes(o.access)) errs.push('access يجب أن تكون open أو members أو closed');
  if (!isStr(o.title)) errs.push('title مطلوب');
  if (!Array.isArray(o.sentences) || !o.sentences.length) errs.push('sentences مطلوبة (قائمة غير فارغة)');
  else
    o.sentences.forEach((s, i) => {
      const ok =
        Array.isArray(s) && s.length >= 3 && isStr(s[0]) && typeof s[1] === 'string' && Number.isInteger(s[2]) &&
        (s.length === 3 || s[3] === 'q' || s[3] === 'h');
      if (!ok) errs.push(`الجملة ${i + 1}: الصيغة [إنكليزي، عربي، رقم الفقرة، "q" أو "h" اختياري]`);
    });
  if (!Array.isArray(o.questions)) errs.push('questions يجب أن تكون قائمة');
  else
    o.questions.forEach((q, i) => {
      const w = `السؤال ${i + 1}`;
      if (!q || !isStr(q.q) || !Number.isInteger(q.a)) return errs.push(`${w}: q و a (رقم الإجابة) مطلوبان`);
      if (q.tf) {
        if (q.a !== 0 && q.a !== 1) errs.push(`${w} (صح/خطأ): a يجب أن تكون 0 (صح) أو 1 (خطأ)`);
      } else if (!Array.isArray(q.o) || q.o.length < 2 || !q.o.every(isStr)) errs.push(`${w}: o يجب أن تكون قائمة خيارين على الأقل`);
      else if (q.a < 0 || q.a >= q.o.length) errs.push(`${w}: رقم الإجابة ${q.a} غير موجود بين ${q.o.length} خيارات`);
    });
  if (o.words !== undefined && (!o.words || typeof o.words !== 'object' || Array.isArray(o.words) || Object.values(o.words).some((v) => typeof v !== 'string')))
    errs.push('words يجب أن تكون كائناً {كلمة: معنى}');
  return errs;
}

export const summarize = (o) => ({
  sentences: o.sentences.length,
  questions: o.questions.length,
  words: o.words ? Object.keys(o.words).length : 0,
});
