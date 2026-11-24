// تحويل الدرس بين «ملف JSON» و«نموذج التحرير» الذي يراه المعلم، مع رسائل أخطاء بلغة بسيطة.
import { validateLesson } from './lessonFile.js';

export const KIND_LABELS = { '': 'نص عادي', h: 'عنوان', q: 'اقتباس' };
export const emptySentence = () => ({ en: '', ar: '', kind: '', newPara: false });
export const emptyMc = () => ({ type: 'mc', q: '', options: ['', '', '', ''], correct: -1, e: '' });
export const emptyTf = () => ({ type: 'tf', q: '', options: ['', ''], correct: -1, e: '' });

// الجملة تبدأ فقرة جديدة إذا: هي الأولى، أو اختار المعلم ذلك، أو هي عنوان، أو التي قبلها عنوان
export const startsNewParagraph = (sentences, i) =>
  i === 0 || !!sentences[i].newPara || sentences[i].kind === 'h' || (i > 0 && sentences[i - 1].kind === 'h');

export function fileToForm(o) {
  let prev = null;
  return {
    base: { schema: 2, subject: o.subject || 'english', grade: o.grade, stream: o.stream ?? null, book: o.book, unit: Number(o.unit) },
    label: o.label || '',
    title: o.title || '',
    titleAr: o.titleAr || '',
    sentences: (o.sentences || []).map((s) => {
      const row = { en: s[0], ar: s[1], kind: s[3] || '', newPara: s[2] !== prev };
      prev = s[2];
      return row;
    }),
    questions: (o.questions || []).map((q) =>
      q.tf
        ? { type: 'tf', q: q.q, options: ['', ''], correct: q.a, e: q.e || '' }
        : { type: 'mc', q: q.q, options: [...q.o], correct: q.a, e: q.e || '' }
    ),
    words: Object.entries(o.words || {}).map(([w, m]) => ({ w, m })),
  };
}

export function formToFile(f) {
  let para = -1;
  const sentences = f.sentences.map((s, i) => {
    if (startsNewParagraph(f.sentences, i)) para++;
    const row = [s.en.trim(), s.ar.trim(), para];
    if (s.kind) row.push(s.kind);
    return row;
  });
  const questions = f.questions.map((q) =>
    q.type === 'tf'
      ? { q: q.q.trim(), tf: 1, a: q.correct, e: q.e.trim() }
      : { q: q.q.trim(), o: q.options.map((x) => x.trim()), a: q.correct, e: q.e.trim() }
  );
  const words = {};
  f.words.forEach(({ w, m }) => {
    const k = w.trim().toLowerCase();
    if (k && m.trim()) words[k] = m.trim();
  });
  const out = { ...f.base, label: f.label.trim() || undefined, title: f.title.trim(), titleAr: f.titleAr.trim(), sentences, questions, words };
  if (!out.label) delete out.label;
  return out;
}

// أخطاء بلغة المعلم، مصنّفة حسب التبويب. مصفوفة فارغة = جاهز للحفظ.
export function formErrors(f) {
  const errs = [];
  const add = (tab, msg) => errs.push({ tab, msg });
  if (!f.title.trim()) add('info', 'اكتب عنوان الدرس بالإنكليزية.');
  if (!f.sentences.length) add('text', 'أضف جملة واحدة على الأقل.');
  f.sentences.forEach((s, i) => {
    if (!s.en.trim()) add('text', `الجملة ${i + 1}: اكتب النص الإنكليزي.`);
    if (!s.ar.trim()) add('text', `الجملة ${i + 1}: اكتب الترجمة العربية.`);
  });
  f.questions.forEach((q, i) => {
    const w = `السؤال ${i + 1}`;
    if (!q.q.trim()) add('questions', `${w}: اكتب نص السؤال.`);
    if (q.type === 'tf') {
      if (q.correct !== 0 && q.correct !== 1) add('questions', `${w}: حدّد هل العبارة صح أم خطأ.`);
    } else {
      q.options.forEach((o, k) => {
        if (!o.trim()) add('questions', `${w}: الخيار ${k + 1} فارغ (املأه أو احذفه).`);
      });
      if (q.correct < 0 || q.correct >= q.options.length) add('questions', `${w}: حدّد الإجابة الصحيحة.`);
    }
  });
  const seen = new Set();
  f.words.forEach(({ w, m }) => {
    const k = w.trim().toLowerCase();
    if (!k && !m.trim()) return;
    if (!k) add('words', `هناك معنى بدون كلمة: «${m.trim().slice(0, 20)}».`);
    else if (!m.trim()) add('words', `الكلمة «${k}» بدون معنى.`);
    else if (seen.has(k)) add('words', `الكلمة «${k}» مكررة.`);
    seen.add(k);
  });
  if (!errs.length) {
    // حماية إضافية: نفس مدقّق الملفات المستخدم في الرفع
    validateLesson(formToFile(f)).forEach((e) => add('info', e));
  }
  return errs;
}
