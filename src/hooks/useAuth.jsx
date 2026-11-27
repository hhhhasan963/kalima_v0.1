import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStorageKey, startedAsRecovery, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);
const GUEST_KEY = 'kalima:guest';

// بلا إنترنت وبجلسة منتهية: نقرأ المستخدم المحفوظ حتى يعمل التطبيق من النسخة المحلية.
// عند عودة الاتصال يجدّد supabase-js الجلسة تلقائياً.
function storedUser() {
  try {
    const s = JSON.parse(localStorage.getItem(authStorageKey));
    return s && s.user && s.user.id ? s.user : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = جارٍ التحميل
  const [offlineUser, setOfflineUser] = useState(null);
  const [recovery, setRecovery] = useState(startedAsRecovery); // يفتح شاشة «كلمة مرور جديدة»
  const [guest, setGuest] = useState(() => {
    try {
      return localStorage.getItem(GUEST_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setGuestMode = useCallback((on) => {
    setGuest(on);
    try {
      if (on) localStorage.setItem(GUEST_KEY, '1');
      else localStorage.removeItem(GUEST_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (data.session) setSession(data.session);
        else {
          const u = error ? storedUser() : null;
          if (u) setOfflineUser(u);
          setSession(null);
        }
      })
      .catch(() => {
        if (!alive) return;
        const u = storedUser();
        if (u) setOfflineUser(u);
        setSession(null);
      });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (s) {
        setOfflineUser(null);
        setGuestMode(false); // سجّل دخوله: انتهى وضع الزائر
      }
      setSession(s);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [setGuestMode]);

  const signIn = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), []);
  const signUp = useCallback((email, password) => supabase.auth.signUp({ email, password }), []);
  // يرسل رابط استعادة كلمة المرور إلى البريد (لا يكشف إن كان البريد مسجّلاً أم لا)
  const requestReset = useCallback(
    (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }),
    []
  );
  const updatePassword = useCallback(async (password) => {
    const r = await supabase.auth.updateUser({ password });
    if (!r.error) setRecovery(false);
    return r;
  }, []);
  // يمسح الدروس المحفوظة بالجهاز عند الخروج حتى لا تبقى لمن لم يعد مسجّلاً
  const clearContentCache = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('kalima:v2:') || k.startsWith('kalima:teacher:'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  };
  const cancelRecovery = useCallback(async () => {
    setRecovery(false);
    await supabase.auth.signOut();
    clearContentCache();
  }, []);
  const signOut = useCallback(async () => {
    setOfflineUser(null);
    await supabase.auth.signOut();
    clearContentCache();
  }, []);

  const user = (session && session.user) || offlineUser || null;

  // هل هذا الحساب معلم؟ (الصلاحية الفعلية يفرضها الخادم؛ هذا فقط لإظهار صفحة الإدارة)
  const uid = user && user.id;
  // نتيجة التحقق مرتبطة بمعرّف الحساب نفسه، حتى لا تتسرب صلاحية حساب سابق ولا نُخرج المعلم قبل اكتمال التحقق
  const [tinfo, setTinfo] = useState({ uid: null, value: false });
  useEffect(() => {
    if (!supabase || !uid) return;
    const key = 'kalima:teacher:' + uid;
    try {
      if (localStorage.getItem(key) === '1') setTinfo({ uid, value: true });
    } catch {}
    let alive = true;
    supabase
      .from('teachers')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setTinfo((t) => (t.uid === uid ? t : { uid, value: false }));
          return;
        }
        setTinfo({ uid, value: !!data });
        try {
          if (data) localStorage.setItem(key, '1');
          else localStorage.removeItem(key);
        } catch {}
      });
    return () => {
      alive = false;
    };
  }, [uid]);
  const isTeacher = !!uid && tinfo.uid === uid && tinfo.value;
  const teacherReady = !uid || tinfo.uid === uid;
  const value = useMemo(
    () => ({
      configured: !!supabase,
      loading: session === undefined,
      user,
      isTeacher,
      teacherReady,
      guest: guest && !user,
      enterGuest: () => setGuestMode(true),
      leaveGuest: () => setGuestMode(false),
      offline: !session && !!offlineUser,
      recovery,
      requestReset,
      updatePassword,
      cancelRecovery,
      signIn,
      signUp,
      signOut,
    }),
    [session, user, isTeacher, teacherReady, guest, offlineUser, recovery, requestReset, updatePassword, cancelRecovery, signIn, signUp, signOut, setGuestMode]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
