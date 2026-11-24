import { supabase } from './supabase.js';

// إعدادات خاصة بالجهاز لا تُرسل للخادم (عرض الشريط الجانبي)
export const DEVICE_ONLY = ['sbw', 'sbl'];

export const today = () => new Date().toISOString().slice(0, 10);

// حساب سلسلة الأيام المتتالية عند فتح التطبيق
export function rollStreak(S) {
  const td = today();
  if (S.d === td) return S;
  const yd = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return { ...S, st: S.d === yd ? (S.st || 0) + 1 : 1, d: td };
}

// ترحيل تقدّم النسخ القديمة: أرقام الدروس 1..3 صارت معرّفات (g9-sb-1)، ومسار الدرس صار lesson/<id>
export function migrateLegacy(S) {
  let out = S;
  if (S.bs && Object.keys(S.bs).some((k) => /^\d+$/.test(k))) {
    const bs = {};
    Object.entries(S.bs).forEach(([k, v]) => {
      const id = /^\d+$/.test(k) ? 'g9-sb-' + k : k;
      bs[id] = Math.max(bs[id] || 0, v || 0);
    });
    out = { ...out, bs };
  }
  if (typeof S.last === 'string' && /^lesson\d+$/.test(S.last)) {
    out = { ...out, last: 'lesson/g9-sb-' + S.last.slice(6) };
  }
  return out;
}

export function toServer(S) {
  const o = { ...S };
  DEVICE_ONLY.forEach((k) => delete o[k]);
  return o;
}

export function sanitizeRemote(row) {
  const S = row && row.state && typeof row.state === 'object' && !Array.isArray(row.state) ? row.state : {};
  const saved = row && Array.isArray(row.saved) ? row.saved.filter((x) => typeof x === 'string') : [];
  return { S: migrateLegacy({ xp: 0, st: 0, d: '', mute: false, ...S }), saved };
}

const PREFS = ['name', 'theme', 'fs', 'rate', 'pt', 'mute', 'slow', 'nb', 'ob', 'hap'];

// دمج تقدّم محلي (فيه تغييرات لم تُرفع) مع تقدّم الخادم، بدون خسارة أي إنجاز:
// النقاط والنتائج: الأكبر — الكلمات: اتحاد — الإعدادات: الخادم ثم المحلي
export function mergeProgress(local, remote) {
  const a = local.S;
  const b = remote.S;
  const out = { ...b };

  PREFS.forEach((k) => {
    out[k] = b[k] !== undefined ? b[k] : a[k];
    if (out[k] === undefined) delete out[k];
  });
  out.xp = Math.max(a.xp || 0, b.xp || 0);

  // السلسلة: الأحدث يفوز، وعند التساوي الأكبر
  if ((a.d || '') > (b.d || '')) {
    out.st = a.st || 0;
    out.d = a.d;
  } else if ((a.d || '') === (b.d || '')) {
    out.st = Math.max(a.st || 0, b.st || 0);
    out.d = a.d || b.d || '';
  } else {
    out.st = b.st || 0;
    out.d = b.d || '';
  }

  const bs = { ...(b.bs || {}) };
  Object.entries(a.bs || {}).forEach(([k, v]) => {
    bs[k] = Math.max(bs[k] || 0, v || 0);
  });
  if (Object.keys(bs).length) out.bs = bs;

  const saved = [...remote.saved];
  local.saved.forEach((w) => {
    if (!saved.includes(w)) saved.push(w);
  });

  const bx = {};
  const bxa = a.bx || {};
  const bxb = b.bx || {};
  saved.forEach((w) => {
    const x = bxa[w];
    const y = bxb[w];
    const pick = x && y ? (x.d >= y.d ? x : y) : x || y;
    if (pick) bx[w] = pick;
  });
  out.bx = bx;

  // آخر درس وتبويب: من هذا الجهاز (الأحدث نشاطاً)
  if (a.last) out.last = a.last;
  if (a.lt) out.lt = a.lt;
  if (a.grade !== undefined) out.grade = a.grade; // آخر صف اخترته على هذا الجهاز
  return { S: out, saved };
}

export async function fetchProgress(userId) {
  const { data, error } = await supabase
    .from('progress')
    .select('state,saved,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProgress(userId, S, saved) {
  const { error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, state: toServer(S), saved }, { onConflict: 'user_id' });
  if (error) throw error;
}
