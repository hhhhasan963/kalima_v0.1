import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { StoreProvider, useStore } from './hooks/useStore.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { LessonsProvider, useLessons } from './hooks/useLessons.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import ResetPasswordScreen from './components/ResetPasswordScreen.jsx';
import LockPrompt from './components/LockPrompt.jsx';
import SoonPrompt from './components/SoonPrompt.jsx';
import { FxProvider, useFx } from './hooks/useFx.jsx';
import { SpeechProvider, useSpeech } from './hooks/useSpeech.jsx';
import { useRoute } from './hooks/useRoute.js';
import { useTabSwipe } from './hooks/useTabSwipe.js';
import { useEdgeBack } from './hooks/useEdgeBack.js';
import { useReadPos } from './hooks/useReadPos.js';
import ReadPlayer from './components/ReadPlayer.jsx';
import Onboarding from './components/Onboarding.jsx';
import { listenBack } from './lib/native.js';
import BottomNav from './components/BottomNav.jsx';
import Home from './components/Home.jsx';
import BookView from './components/BookView.jsx';
import Hero, { HeroText, UiContext, shortT } from './components/Hero.jsx';
import ReadTab from './components/ReadTab.jsx';
import CompareTab from './components/CompareTab.jsx';
import QuizTab from './components/QuizTab.jsx';
import WordSheet from './components/WordSheet.jsx';
import QuizOverlay from './components/QuizOverlay.jsx';
import ReviewOverlay from './components/ReviewOverlay.jsx';
import WordsView from './components/WordsView.jsx';
import AchievementsView from './components/AchievementsView.jsx';
import ProfileView from './components/ProfileView.jsx';
import TeacherView from './components/TeacherView.jsx';
import LessonEditor from './components/LessonEditor.jsx';
import { Icon, Ico } from './components/Icons.jsx';

const TABS = [
  ['read', 'النص'],
  ['cmp', 'الترجمة'],
  ['quiz', 'الأسئلة'],
];
const TAB_IDS = TABS.map((t) => t[0]);
const EMPTY_L = { id: '', book: '', unit: 0, kind: 'unit', label: '', short: '', t: '', a: '', SS: [], Q: [], W: {}, locked: false };

function ProgressBar() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      setW(h > 0 ? Math.min(100, (scrollY / h) * 100) : 0);
    };
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return <div id="pgb" style={{ width: w + '%' }} />;
}

function Shell() {
  const { S, patch, dueList, saved, sync } = useStore();
  const { lessons, books, grade, ready } = useLessons();
  const { leaveGuest, isTeacher, teacherReady } = useAuth();
  const [lockOpen, setLockOpen] = useState(false);
  const [soonOpen, setSoonOpen] = useState(false);
  const { addXP, bigToast, toast } = useFx();
  const sp = useSpeech();
  const guardRef = useRef({ open: false, back: () => {} });
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { v, go, back, nav } = useRoute({ guardRef, toastRef });

  // v = home | words | ach | me | teach | edit/<id> | book/<id> | lesson/<id>
  const m = /^(lesson|book|edit)\/(.+)$/.exec(v);
  const lessonId = m && m[1] === 'lesson' ? m[2] : null;
  const bookRouteId = m && m[1] === 'book' ? m[2] : null;
  const editId = m && m[1] === 'edit' ? m[2] : null;
  const isLesson = !!lessonId;
  const isBook = !!bookRouteId;

  const [lastL, setLastL] = useState(null);
  const [lastB, setLastB] = useState(null);
  const firstOpen = lessons.find((l) => !l.locked) || null;
  const lid = lessonId ?? lastL ?? (firstOpen ? firstOpen.id : null);
  const L = lessons.find((l) => l.id === lid && !l.locked) || firstOpen || EMPTY_L;
  const lessonBook = books.find((b) => b.id === L.book) || null;
  const bid = bookRouteId ?? lastB ?? (lessonBook ? lessonBook.id : null);
  const book = books.find((b) => b.id === bid) || books[0] || null;

  // صفحة المعلم لغير المعلمين ← الرئيسية
  useEffect(() => {
    if ((v === 'teach' || editId) && teacherReady && !isTeacher) go('home');
  }, [v, editId, isTeacher, teacherReady]); // eslint-disable-line

  // رابط لدرس/كتاب غير موجود ← الرئيسية. ورابط لدرس مقفل (للزائر) ← الرئيسية مع رسالة التسجيل
  useEffect(() => {
    if (!ready) return;
    if (lessonId) {
      const l = lessons.find((x) => x.id === lessonId);
      if (!l) go('home');
      else if (l.locked) {
        go('home');
        if (l.access === 'closed') setSoonOpen(true);
        else setLockOpen(true);
      }
    } else if (bookRouteId && !books.some((b) => b.id === bookRouteId)) go('home');
  }, [lessonId, bookRouteId, lessons, books, ready]); // eslint-disable-line

  const [tab, setTab] = useState('read');
  const keepTab = useRef(false); // عند «تابع من حيث توقفت» لا نرجع للتبويب الأول
  const [overlay, setOverlay] = useState(null); // null | 'quiz' | 'rv'
  const [sheet, setSheet] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [backTick, setBackTick] = useState(0);

  // الانتقال بين الدروس
  useEffect(() => {
    if (lessonId) {
      if (lessonId !== lastL) {
        setLastL(lessonId);
        if (!keepTab.current) setTab('read');
      }
      keepTab.current = false;
      patch({ last: v });
    }
    if (bookRouteId) setLastB(bookRouteId);
  }, [v]); // eslint-disable-line

  // عند كل تنقّل: أوقف النطق وأغلق النوافذ وارجع للأعلى
  useEffect(() => {
    sp.stop();
    setOverlay(null);
    setSheetOpen(false);
    window.scrollTo(0, 0);
  }, [v, nav]); // eslint-disable-line

  // الصفوف على body التي يعتمد عليها التنسيق (home / data-v)
  useEffect(() => {
    document.body.classList.toggle('home', !isLesson);
    const code = isBook ? (books.find((b) => b.id === bookRouteId) || {}).code || 'sb' : null;
    document.body.dataset.v = isLesson ? 'lesson' : editId ? 'edit' : code || v;
  }, [isLesson, isBook, editId, v, books]); // eslint-disable-line

  useEffect(() => {
    document.body.style.overflow = overlay ? 'hidden' : '';
  }, [overlay]);

  // الوضع المظلم
  const prefersDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = S.theme === 'dark' || (S.theme !== 'light' && prefersDark());
  useEffect(() => {
    const r = document.documentElement;
    if (S.theme === 'dark' || S.theme === 'light') r.setAttribute('data-theme', S.theme);
    else r.removeAttribute('data-theme');
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = dark ? '#0d2420' : '#1f4d45';
  }, [S.theme, dark]);

  // حجم الخط
  useEffect(() => {
    document.documentElement.style.setProperty('--fs', (S.fs || 21) + 'px');
  }, [S.fs]);

  // إغلاق النافذة: إن كانت القراءة أُوقفت مؤقتاً تلقائياً بسبب نقر كلمة نستأنفها (بعد 250ms)
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sp.stopIf('sheet');
    setTimeout(sp.resumeAuto, 250);
  }, [sp.stopIf, sp.resumeAuto]); // eslint-disable-line

  const openWord = (w, id, rect) => {
    setSheet((s) => ({ w, id, rect, nonce: (s?.nonce || 0) + 1 }));
    setSheetOpen(true);
    sp.softPause(); // نقر كلمة أثناء القراءة ← إيقاف مؤقت (يُستأنف عند إغلاق النافذة)
    sp.say(w, 'sheet');
  };

  // ثبات الهيرو عند التنقل بين التبويبات: حجم الهيرو دالة في scrollY، والقسم الأقصر يجعل المتصفح يقصّ scrollY إلى 0 فيقفز الهيرو.
  // لذلك نحفظ المكان قبل التبديل، ونضمن ارتفاعاً كافياً للصفحة، ثم نثبّت التمرير (تحت الهيرو المصغّر إن كان مصغّراً).
  const tabFix = useRef(null);
  const changeTab = (t) => {
    sp.stop();
    closeSheet();
    if (t !== tab) {
      const hero = document.querySelector('header.hero2');
      tabFix.current = { y: window.scrollY, hh: hero ? +hero.dataset.hh || 0 : 0 };
    }
    setTab(t);
    patch({ lt: t }); // آخر تبويب فتحته (لزر «تابع من حيث توقفت»)
  };
  useLayoutEffect(() => {
    const f = tabFix.current;
    if (!f) return;
    tabFix.current = null;
    const collapsed = Math.max(0, f.hh - 52);
    const target = f.hh && f.y > collapsed ? collapsed : f.y;
    const mn = document.querySelector('main');
    if (mn) {
      mn.style.minHeight = '0px';
      const rest = document.documentElement.scrollHeight - mn.offsetHeight;
      mn.style.minHeight = Math.max(0, target + innerHeight - rest) + 'px';
    }
    window.scrollTo(0, target);
    // إن بقي فرق بسيط (بكسلات) لأن ارتفاع الصفحة يتأثر بحالة الهيرو، نزيد الحد الأدنى بمقدار الفرق ونعيد التمرير
    const miss = target - window.scrollY;
    if (mn && miss > 0.5) {
      mn.style.minHeight = (parseFloat(mn.style.minHeight) || 0) + miss + 1 + 'px';
      window.scrollTo(0, target);
    }
  }, [tab]);
  // مغادرة الدرس: نزيل الحد الأدنى للارتفاع
  useEffect(() => {
    if (isLesson) return;
    const mn = document.querySelector('main');
    if (mn) mn.style.minHeight = '';
  }, [isLesson]);

  // تذكّر مكان القراءة لكل درس
  useReadPos({ lessonId, tab, S, patch, toast });

  // يفتح آخر درس وعلى نفس التبويب
  const resume = () => {
    if (!grade || !firstOpen) {
      go('home');
      return;
    }
    const target =
      S.last && lessons.some((l) => 'lesson/' + l.id === S.last && !l.locked) ? S.last : 'lesson/' + firstOpen.id;
    keepTab.current = target !== v;
    go(target);
    if (S.lt) setTab(S.lt);
  };

  // السحب الأفقي بين التبويبات مع المعاينة
  useTabSwipe(TAB_IDS, (id) => flushSync(() => changeTab(id)));

  // زر الرجوع أثناء التمرين يسأل «تريد الخروج؟»، وأثناء المراجعة يغلقها
  guardRef.current = {
    open: !!overlay,
    back: () => {
      if (overlay === 'quiz') setBackTick((t) => t + 1);
      else {
        sp.stop();
        setOverlay(null);
      }
    },
  };

  const openQuiz = () => {
    sp.stop();
    setOverlay('quiz');
  };
  const openReview = () => {
    if (!dueList.length) return;
    sp.stop();
    setOverlay('rv');
  };

  const finishQuiz = (xp) => {
    setOverlay(null);
    if (xp) addXP(xp);
    bigToast(xp ? <><Ico n="spark" /> تمت إضافة <bdi>+{xp} XP</bdi> · مجموعك <bdi>{S.xp + xp}</bdi></> : 'حاول مرة ثانية لتجمع نقاطاً');
    go('home');
  };
  const finishReview = (xp) => {
    setOverlay(null);
    addXP(xp);
    bigToast(<><Ico n="spark" /> تمت إضافة <bdi>+{xp} XP</bdi> · مجموعك <bdi>{S.xp + xp}</bdi></>);
    go('words');
  };

  const paraCount = new Set(L.SS.map((s) => s[2])).size;

  // حارس المغادرة: صفحة التعديل تسأل قبل ترك تعديلات غير محفوظة
  const leaveGuard = useRef(null);
  const canLeave = () => !leaveGuard.current || leaveGuard.current();
  const safeGo = (target, opts) => {
    if (canLeave()) go(target, opts);
  };

  const ui = {
    goBack: () => {
      if (canLeave()) back();
    },
    go: safeGo,
    leaveGuard,
    dark,
    toggleTheme: () => patch({ theme: dark ? 'light' : 'dark' }),
    v,
    nav,
  };

  // فشل النطق على الجوال: نعرض السبب مرة واحدة (غالباً محرّك Text-to-Speech أو بيانات اللغة الإنكليزية غير مثبّتة)
  const ttsErrShown = useRef(false);
  useEffect(() => {
    const f = (e) => {
      if (ttsErrShown.current) return;
      ttsErrShown.current = true;
      toastRef.current('تعذّر النطق: ' + String(e.detail || '').slice(0, 90) + ' — افتح الملف الشخصي ← فحص الصوت.', 7000);
      console.warn('TTS error:', e.detail);
    };
    window.addEventListener('kalima-tts-error', f);
    return () => window.removeEventListener('kalima-tts-error', f);
  }, []);

  // السحب من الحافة اليمنى = رجوع (داخل التمرين/المراجعة يمرّ عبر حارس الرجوع نفسه)
  const handleBack = () => {
    const g = guardRef.current;
    if (g && g.open) {
      g.back();
      return true;
    }
    if (v !== 'home') {
      ui.goBack();
      return true;
    }
    return false;
  };
  useEdgeBack(handleBack);

  // زر الرجوع في أندرويد (Capacitor): يتحكم به التطبيق بدل خروج المتصفح
  const backRef = useRef(handleBack);
  backRef.current = handleBack;
  useEffect(() => {
    let off = () => {};
    let dead = false;
    listenBack(
      () => backRef.current(),
      () => toastRef.current('اضغط رجوع مرة أخرى للإغلاق')
    ).then((f) => (dead ? f() : (off = f)));
    return () => {
      dead = true;
      off();
    };
  }, []);

  // طالب جديد تماماً (لا اسم ولا تقدّم) ← شاشات الترحيب. ننتظر انتهاء جلب تقدّم الحساب حتى لا تظهر لمن عنده تقدّم على جهاز آخر.
  const needsOb =
    !S.ob && !S.name && !S.xp && !saved.length && !Object.keys(S.bs || {}).length && sync !== 'loading';

  return (
    <UiContext.Provider value={ui}>
      <div id="app">
        <Home onBook={(id) => go('book/' + id)} onReview={openReview} onResume={resume} />
        <BookView
          book={book}
          onOpen={(id) => go('lesson/' + id, { deep: true })}
          onLocked={() => setLockOpen(true)}
          onSoon={() => setSoonOpen(true)}
        />
        <WordsView onReview={openReview} onStart={resume} />
        <AchievementsView />
        <ProfileView onTeach={() => go('teach')} />
        {isTeacher && <TeacherView />}
        {isTeacher && editId && <LessonEditor key={editId} id={editId} />}

        <Hero tag="header" title={shortT(L.t, L.label)} sig={L.id}>
          <HeroText
            badge={`${L.label} · ${lessonBook ? lessonBook.titleAr : ''}`}
            title={L.t}
            sub={L.a}
            meta={[`${paraCount} فقرات`, `${L.Q.length} أسئلة`, 'نطق صوتي']}
          />
        </Hero>

        <nav role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" data-t={id} aria-selected={tab === id} onClick={() => changeTab(id)}>
              <Icon name={id} />
              {label}
            </button>
          ))}
        </nav>

        <main>
          <section id="read" className={tab === 'read' ? 'on' : ''}>
            <ReadTab
              key={L.id}
              L={L}
              selId={sheetOpen ? sheet?.id : null}
              onWord={openWord}
              onBackground={closeSheet}
              active={isLesson && tab === 'read'}
            />
          </section>
          <section id="cmp" className={tab === 'cmp' ? 'on' : ''}>
            <CompareTab key={L.id} L={L} />
          </section>
          <section id="quiz" className={tab === 'quiz' ? 'on' : ''}>
            <QuizTab L={L} onStart={openQuiz} />
          </section>
        </main>
      </div>

      <WordSheet sheet={sheet} open={sheetOpen} onClose={closeSheet} words={L.W} />
      <ReadPlayer />
      <ProgressBar />

      <BottomNav
        selected={isLesson ? 'lesson' : isBook ? 'home' : v}
        onGo={(k) => {
          if (!canLeave()) return;
          if (k === 'lesson') resume();
          else go(k);
        }}
      />

      {overlay === 'quiz' && (
        <QuizOverlay key={L.id} L={L} backTick={backTick} onClose={() => setOverlay(null)} onFinish={finishQuiz} />
      )}
      {soonOpen && <SoonPrompt onClose={() => setSoonOpen(false)} />}
      {lockOpen && (
        <LockPrompt
          onClose={() => setLockOpen(false)}
          onSignup={() => {
            setLockOpen(false);
            leaveGuest();
          }}
        />
      )}
      {overlay === 'rv' && <ReviewOverlay onClose={() => setOverlay(null)} onFinish={finishReview} />}
      {needsOb && <Onboarding />}
    </UiContext.Provider>
  );
}

// تسجيل الدخول أولاً، ثم التطبيق. كل مستخدم له نسخة منفصلة من التقدم.
function Gate() {
  const { configured, loading, user, guest, recovery } = useAuth();
  if (loading) return <div className="splash">جارٍ التحميل…</div>;
  if (configured && recovery) return <ResetPasswordScreen />; // بعد رابط «نسيت كلمة المرور»
  if (configured && !user && !guest) return <AuthScreen />;
  // الزائر: الدروس المفتوحة فقط، وتقدّمه على الجهاز بدون مزامنة
  const audience = configured && !user ? 'guest' : 'user';
  return (
    <StoreProvider key={user ? user.id : 'local'} userId={user ? user.id : null}>
      <LessonsProvider key={audience} audience={audience}>
        <FxProvider>
          <SpeechProvider>
            <Shell />
          </SpeechProvider>
        </FxProvider>
      </LessonsProvider>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
