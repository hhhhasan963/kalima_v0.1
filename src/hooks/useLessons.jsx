import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BUNDLED, BUNDLED_CATALOG } from '../data/bundled.js';
import {
  purgeLegacyCache,
  readCatalogCache,
  readDictCache,
  readLessonsCache,
  syncContent,
  validateBundle,
} from '../lib/lessonsApi.js';
import { useStore } from './useStore.jsx';

const LessonsContext = createContext(null);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// معنى الكلمة: من كلمات الدرس الحالي أولاً (W)، ثم من القاموس العام
export function makeMean(dict) {
  const look = (w, W) => {
    const k = w.toLowerCase().replace(/’/g, "'").replace(/'s$/, '');
    const k2 = k.replace(/s$/, '');
    if (W) {
      if (has(W, k) && W[k]) return W[k];
      if (has(W, k2) && W[k2]) return W[k2];
    }
    if (has(dict, k)) return dict[k];
    if (has(dict, k2)) return dict[k2];
    return /^\d+$/.test(k) ? 'رقم ' + k : null;
  };
  return (w, W) => look(w, W) || (/['’]$/.test(w) ? look(w.replace(/['’]+$/, ''), W) : null);
}

// القاموس العام = القاموس الأساسي + كلمات كل الدروس (الأول يفوز)، لتفسير الكلمات المحفوظة خارج الدرس
function mergedDict(base, lessons) {
  const d = Object.create(null);
  Object.assign(d, base);
  lessons.forEach((l) => {
    Object.entries(l.W || {}).forEach(([k, v]) => {
      if (!(k in d)) d[k] = v;
    });
  });
  return d;
}

function bundledFor(audience, grade) {
  if (grade !== 'g9') return [];
  if (audience === 'user') return BUNDLED.lessons;
  return BUNDLED.lessons.map((l) => (l.free ? l : { ...l, SS: [], Q: [], W: {}, locked: true }));
}

function initial(audience, grade) {
  const dict = (readDictCache() || {}).dict || BUNDLED.dict;
  if (!grade) return { grade: null, lessons: [], dict, source: 'none' };
  const c = readLessonsCache(grade, audience);
  if (c) {
    const b = validateBundle({ lessons: c.lessons });
    if (b.lessons.some((l) => !l.locked)) return { grade, lessons: b.lessons, dict, source: 'cache' };
  }
  return { grade, lessons: bundledFor(audience, grade), dict, source: 'bundled' };
}

const initialCatalog = () => (readCatalogCache() || {}).data || BUNDLED_CATALOG;

purgeLegacyCache();

// مصدر المحتوى: الكتالوج (الصفوف/الكتب) + دروس الصف المختار.
// النسخة المحفوظة تُعرض فوراً، وتُحدَّث من Supabase في الخلفية إن تغيّر المحتوى، ولها نسخة مضمّنة احتياطية.
// audience: 'user' (مسجّل: كل الدروس) أو 'guest' (زائر: الدروس المفتوحة فقط)
export function LessonsProvider({ audience = 'user', children }) {
  const { S } = useStore();
  const [catalog, setCatalog] = useState(initialCatalog);

  // الصف المعتمد: يجب أن يكون موجوداً ومتاحاً (غير مقفل)
  const grade = useMemo(() => {
    const g = catalog.grades.find((x) => x.id === S.grade);
    return g && g.available ? g.id : null;
  }, [S.grade, catalog]);

  const [data, setData] = useState(() => initial(audience, grade));
  const [status, setStatus] = useState('loading'); // loading | ready

  const runSync = useCallback(
    async (alive = () => true) => {
      const r = await syncContent({
        grade,
        audience,
        catalogCache: readCatalogCache(),
        dictCache: readDictCache(),
        lessonsCache: grade ? readLessonsCache(grade, audience) : null,
      });
      if (!alive()) return r;
      if (r.catalog) setCatalog(r.catalog);
      if (r.lessons) {
        setData((d) => ({
          grade,
          lessons: r.lessons,
          dict: r.dict || (readDictCache() || {}).dict || d.dict,
          source: 'server',
        }));
      } else if (r.dict) setData((d) => ({ ...d, dict: r.dict }));
      return r;
    },
    [grade, audience]
  );

  useEffect(() => {
    let alive = true;
    setData(initial(audience, grade));
    setStatus('loading');
    runSync(() => alive).then(() => alive && setStatus('ready'));
    return () => {
      alive = false;
    };
  }, [grade, audience, runSync]);

  // مزامنة فورية (بعد أن يعدّل المعلم درساً): تُحمَّل الدروس المتغيّرة فقط
  const reload = useCallback(() => runSync(), [runSync]);

  const value = useMemo(() => {
    const lessons = data.grade === grade ? data.lessons : [];
    const dict = mergedDict(data.dict, lessons);
    const gradeInfo = catalog.grades.find((g) => g.id === grade) || null;
    const books = grade ? catalog.books.filter((b) => b.grade === grade) : [];
    return {
      catalog,
      grades: catalog.grades,
      grade,
      gradeInfo,
      books,
      lessons,
      lessonsOf: (bookId) => lessons.filter((l) => l.book === bookId),
      dict,
      mean: makeMean(dict),
      allSentences: lessons.flatMap((l) => l.SS),
      source: data.source,
      ready: status === 'ready' || data.source !== 'bundled',
      audience,
      reload,
    };
  }, [data, grade, catalog, status, audience, reload]);

  return <LessonsContext.Provider value={value}>{children}</LessonsContext.Provider>;
}

export const useLessons = () => useContext(LessonsContext);
