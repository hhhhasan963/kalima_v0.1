import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFx } from '../hooks/useFx.jsx';
import Hero from './Hero.jsx';
import { ICON_PATHS, Ico } from './Icons.jsx';
import logo from '../assets/logo.svg';

export const APP = 'كلمة';
const TAB_NAMES = { read: 'النص', cmp: 'الترجمة', quiz: 'التمرين' };
const BOOK_ICON = { sb: ICON_PATHS.lesson, wb: ICON_PATHS.words };

export function Stats() {
  const { S, saved } = useStore();
  return (
    <div className="st3">
      <div><b><Ico n="fire" /> {S.st}</b><small>أيام متتالية</small></div>
      <div><b><Ico n="star" /> {S.xp}</b><small>نقطة XP</small></div>
      <div><b><Ico n="book" /> {saved.length}</b><small>كلمة محفوظة</small></div>
    </div>
  );
}

function HomeHero() {
  return (
    <Hero back={false} title={APP}>
      <div className="hh">
        <div className="logo">
          <img src={logo} alt="كلمة" />
        </div>
        <div>
          <h1>{APP}</h1>
          <p>تعلّم الإنكليزية كلمة بكلمة</p>
        </div>
      </div>
    </Hero>
  );
}

// بطاقة تحية بحسب الوقت، باسم المستخدم، مع رسالة عن تقدّمه
function Greeting() {
  const { S } = useStore();
  const h = new Date().getHours();
  const hi = h < 5 ? 'مساء النور' : h < 12 ? 'صباح الخير' : h < 17 ? 'مرحباً' : h < 21 ? 'مساء الخير' : 'مساء النور';
  const msg = S.st > 1 ? S.st + ' أيام متتالية، استمر!' : S.xp > 0 ? 'لديك ' + S.xp + ' نقطة، أكمل التقدّم.' : 'يلا نبدأ أول درس.';
  return (
    <div className="greet">
      <div className="gl">
        <h2>{hi}{S.name ? ' يا ' + S.name : ''}</h2>
        <p>{msg}</p>
      </div>
      <span className="ga"><Ico n={S.st > 1 ? 'fire' : 'spark'} /></span>
    </div>
  );
}

function GuestBar() {
  const { guest, leaveGuest } = useAuth();
  if (!guest) return null;
  return (
    <div className="card guestbar">
      <div>
        <b><Ico n="user" /> أنت تتصفح كزائر</b>
        <span className="mu">الدرس الأول مفتوح لك. أنشئ حساباً مجانياً لفتح بقية الدروس وحفظ تقدّمك.</span>
      </div>
      <button className="btn p" onClick={leaveGuest}>إنشاء حساب</button>
    </div>
  );
}

// أول مرة: اختيار الصف
function GradePicker() {
  const { grades } = useLessons();
  const { patch } = useStore();
  const { toast } = useFx();
  return (
    <>
      <p className="sec">اختر صفّك</p>
      {grades.map((g, i) => (
        <button
          key={g.id}
          className={'un on' + (g.available ? '' : ' lock')}
          style={{ '--i': i }}
          onClick={() => (g.available ? patch({ grade: g.id }) : toast('هذا الصف سيتوفر قريباً'))}
        >
          <span className="n">{g.id.slice(1)}</span>
          <div className="t">
            <b style={{ direction: 'rtl' }}>{g.title}</b>
            <span>اللغة الإنكليزية</span>
          </div>
          <span className="go">{g.available ? 'اختيار ›' : <><Ico n="lock" /> قريباً</>}</span>
        </button>
      ))}
    </>
  );
}

export default function Home({ onBook, onReview, onResume }) {
  const { S, patch, dueList } = useStore();
  const { grade, gradeInfo, books, lessons, lessonsOf } = useLessons();
  const n = dueList.length;
  const bs = S.bs || {};
  const rl = S.last && lessons.find((l) => 'lesson/' + l.id === S.last && !l.locked);
  const rbook = rl && books.find((b) => b.id === rl.book);

  // لم يُختر صف بعد
  if (!grade) {
    return (
      <div id="home">
        <HomeHero />
        <GuestBar />
        <GradePicker />
      </div>
    );
  }

  return (
    <div id="home">
      <HomeHero />
      <Greeting />
      <Stats />
      <GuestBar />
      {rl && (
        <button className="un on" id="rsm" style={{ '--i': 0 }} onClick={onResume}>
          <span className="n">▶</span>
          <div className="t">
            <b style={{ direction: 'rtl' }}>تابع من حيث توقفت</b>
            <span>
              {rbook && rbook.code === 'wb' ? 'Workbook · ' : ''}
              {rl.label} · {rl.t} — {TAB_NAMES[S.lt] || 'النص'}
            </span>
          </div>
          <span className="go">تابع ›</span>
        </button>
      )}
      {n > 0 && (
        <button className="un on" id="rvh" style={{ '--i': 0 }} onClick={onReview}>
          <span className="n"><Ico n="cards" /></span>
          <div className="t">
            <b style={{ direction: 'rtl' }}>مراجعة الكلمات</b>
            <span>{n} كلمة جاهزة اليوم</span>
          </div>
          <span className="go">راجع ›</span>
        </button>
      )}
      <p className="sec">{gradeInfo ? gradeInfo.title : ''} · الإنكليزية</p>
      {books.map((b, i) => {
        const ls = lessonsOf(b.id);
        const done = ls.filter((l) => bs[l.id] > 0).length;
        return (
          <button key={b.id} className="bk on" style={{ '--i': i }} onClick={() => onBook(b.id)}>
            <span className="ic">
              <svg viewBox="0 0 24 24">{BOOK_ICON[b.code] || BOOK_ICON.sb}</svg>
            </span>
            <div className="t">
              <b>{b.title}</b>
              <span>{b.subtitle}</span>
              <div className="prog-wrap">
                <div className="bar"><i style={{ width: (ls.length ? Math.round((done / ls.length) * 100) : 0) + '%' }} /></div>
                <span className="prog-pct">{ls.length ? Math.round((done / ls.length) * 100) : 0}%</span>
              </div>
            </div>
            <span className="go">{done}/{ls.length} ›</span>
          </button>
        );
      })}
      <button className="btn" id="chg" onClick={() => patch({ grade: null })}>
        تغيير الصف
      </button>
    </div>
  );
}
