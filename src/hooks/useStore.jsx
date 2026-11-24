import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  DEVICE_ONLY,
  fetchProgress,
  mergeProgress,
  migrateLegacy,
  rollStreak,
  sanitizeRemote,
  saveProgress,
} from '../lib/progressApi.js';

// مفاتيح النسخة القديمة (قبل تسجيل الدخول). عند أول دخول يُنقل هذا التقدم إلى الحساب.
const LEGACY_S = 'u1s';
const LEGACY_W = 'u1w';
const keysFor = (uid) =>
  uid ? { S: 'u1s:' + uid, W: 'u1w:' + uid, D: 'u1d:' + uid } : { S: LEGACY_S, W: LEGACY_W, D: null };

const DEFAULTS = { xp: 0, st: 0, d: '', mute: false };
const PUSH_DELAY = 2500; // نجمّع التغييرات ونرسلها دفعة واحدة (يوفر حدود الكتابة المجانية)

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

function loadLocal(uid) {
  const k = keysFor(uid);
  let S = { ...DEFAULTS, ...readJSON(k.S, {}) };
  let saved = readJSON(k.W, []);
  if (!Array.isArray(saved)) saved = [];
  let dirty = uid ? localStorage.getItem(k.D) === '1' : false;

  // نقل تقدم ما قبل تسجيل الدخول إلى هذا الحساب (مرة واحدة)
  if (uid) {
    const lS = readJSON(LEGACY_S, null);
    const lW = readJSON(LEGACY_W, null);
    if (lS || lW) {
      const legacy = { S: { ...DEFAULTS, ...(lS || {}) }, saved: Array.isArray(lW) ? lW : [] };
      const m = mergeProgress(legacy, { S, saved });
      S = m.S;
      saved = m.saved;
      dirty = true;
      writeJSON(k.S, S);
      writeJSON(k.W, saved);
      try {
        localStorage.setItem(k.D, '1');
        localStorage.removeItem(LEGACY_S);
        localStorage.removeItem(LEGACY_W);
      } catch {}
    }
  }

  const rolled = rollStreak(S);
  if (rolled !== S) {
    S = rolled;
    if (uid) dirty = true;
  }
  if (S.best && !S.bs) S = { ...S, bs: { 1: S.best } };
  S = migrateLegacy(S);
  return { S, saved, dirty };
}

const StoreContext = createContext(null);

// userId = null  → وضع محلي فقط (بدون حساب)
// userId = "..." → التقدم يُحفظ محلياً ويُزامَن مع Supabase
export function StoreProvider({ userId = null, children }) {
  const cloud = !!(userId && supabase);
  const k = keysFor(userId);

  const [init] = useState(() => loadLocal(userId));
  const [S, setS] = useState(init.S);
  const [saved, setSaved] = useState(init.saved);
  const [sync, setSync] = useState(cloud ? 'loading' : 'off');

  const latest = useRef({ S, saved });
  latest.current = { S, saved };
  const dirty = useRef(init.dirty);
  const seq = useRef(0);
  const pulled = useRef(false);
  const pushing = useRef(false);
  const timer = useRef(0);
  const pushRef = useRef(null);

  useEffect(() => writeJSON(k.S, S), [S]); // eslint-disable-line
  useEffect(() => writeJSON(k.W, saved), [saved]); // eslint-disable-line

  const schedule = useCallback((delay = PUSH_DELAY) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => pushRef.current && pushRef.current(), delay);
  }, []);

  const mark = useCallback(() => {
    if (!cloud) return;
    dirty.current = true;
    seq.current++;
    try {
      localStorage.setItem(k.D, '1');
    } catch {}
    schedule();
  }, [cloud, schedule]); // eslint-disable-line

  // جلب تقدم الخادم ودمجه
  const pull = useCallback(async () => {
    try {
      const row = await fetchProgress(userId);
      if (row) {
        const remote = sanitizeRemote(row);
        let next = dirty.current ? mergeProgress(latest.current, remote) : remote;
        const rolled = rollStreak(next.S);
        if (rolled !== next.S) {
          next = { ...next, S: rolled };
          dirty.current = true;
          try {
            localStorage.setItem(k.D, '1');
          } catch {}
        }
        // إعدادات الجهاز تبقى كما هي
        DEVICE_ONLY.forEach((key) => {
          if (latest.current.S[key] !== undefined) next.S[key] = latest.current.S[key];
        });
        latest.current = next;
        setS(next.S);
        setSaved(next.saved);
      } else if (!dirty.current) {
        // حساب جديد وبلا بيانات محلية: لا شيء يُرفع الآن
      }
      pulled.current = true;
      return true;
    } catch {
      setSync(navigator.onLine ? 'error' : 'offline');
      return false;
    }
  }, [userId]); // eslint-disable-line

  const push = useCallback(async () => {
    if (!cloud || pushing.current) return;
    if (pulled.current && !dirty.current) return;
    pushing.current = true;
    try {
      if (!pulled.current) {
        const ok = await pull();
        if (!ok) {
          schedule(30000);
          return;
        }
      }
      if (!dirty.current) {
        setSync('synced');
        return;
      }
      const startSeq = seq.current;
      setSync('saving');
      await saveProgress(userId, latest.current.S, latest.current.saved);
      if (seq.current === startSeq) {
        dirty.current = false;
        try {
          localStorage.removeItem(k.D);
        } catch {}
      } else {
        schedule(300); // تغيّر شيء أثناء الحفظ
      }
      setSync('synced');
    } catch {
      setSync(navigator.onLine ? 'error' : 'offline');
      schedule(30000);
    } finally {
      pushing.current = false;
    }
  }, [cloud, userId, pull, schedule]); // eslint-disable-line
  pushRef.current = push;

  // عند الدخول: اسحب ثم ارفع ما تغيّر. وارفع فوراً عند مغادرة التطبيق أو عودة الاتصال.
  useEffect(() => {
    if (!cloud) return;
    push();
    const flushNow = () => {
      clearTimeout(timer.current);
      pushRef.current && pushRef.current();
    };
    const onVis = () => document.visibilityState === 'hidden' && flushNow();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('online', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flushNow);
      window.removeEventListener('online', flushNow);
      clearTimeout(timer.current);
    };
  }, [cloud]); // eslint-disable-line

  const patch = useCallback(
    (p) => {
      setS((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));
      if (typeof p === 'function' || Object.keys(p).some((key) => !DEVICE_ONLY.includes(key))) mark();
    },
    [mark]
  );
  const addWord = useCallback(
    (w) => {
      setSaved((a) => (a.includes(w) ? a : [...a, w]));
      mark();
    },
    [mark]
  );
  const removeWord = useCallback(
    (w) => {
      setSaved((a) => a.filter((x) => x !== w));
      setS((s) => {
        if (!s.bx) return s;
        const bx = { ...s.bx };
        delete bx[w];
        return { ...s, bx };
      });
      mark();
    },
    [mark]
  );
  const clearWords = useCallback(() => {
    setSaved([]);
    setS((s) => ({ ...s, bx: {} }));
    mark();
  }, [mark]);
  const resetAll = useCallback(() => {
    setS((s) => ({ xp: 0, st: 1, d: rollStreak({}).d, mute: s.mute, slow: s.slow, ob: s.ob }));
    setSaved([]);
    mark();
  }, [mark]);

  // رفع فوري (قبل تسجيل الخروج)
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (pushRef.current) await pushRef.current();
  }, []);

  // الكلمات المستحقة للمراجعة (التكرار المتباعد)
  const dueList = useMemo(() => {
    const now = Date.now();
    return saved.filter((w) => {
      const b = (S.bx || {})[w];
      return !b || b.d <= now;
    });
  }, [saved, S.bx]);

  const value = { S, patch, saved, addWord, removeWord, clearWords, resetAll, dueList, sync, cloud, flush };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
