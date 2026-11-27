import { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { audioState, useFx } from '../hooks/useFx.jsx';
import { isNative } from '../lib/native.js';
import { ttsDiagnose, ttsOpenInstall } from '../lib/tts.js';
import { useSpeech } from '../hooks/useSpeech.jsx';
import { Stats } from './Home.jsx';
import { APP_VERSION } from '../version.js';
import Hero, { HeroText } from './Hero.jsx';
import { Ico } from './Icons.jsx';

const SYNC_TEXT = {
  loading: 'جارٍ تحميل تقدّمك…',
  synced: '✓ تقدّمك محفوظ على حسابك',
  saving: 'جارٍ الحفظ…',
  offline: 'غير متصل — سيُحفظ تقدّمك عند عودة الاتصال',
  error: 'تعذّر الحفظ، سنعيد المحاولة تلقائياً',
  off: '',
};

export default function ProfileView({ onTeach }) {
  const { S, patch, resetAll, saved, sync, cloud, flush } = useStore();
  const { user, offline, signOut, guest, leaveGuest, isTeacher } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const fx = useFx();
  const sp = useSpeech();
  const [confirm, setConfirm] = useState(false);
  const [diag, setDiag] = useState(null);

  // تأكيد «مسح كل التقدم» يتراجع تلقائياً بعد 3 ثوانٍ
  useEffect(() => {
    if (!confirm) return;
    const id = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [confirm]);

  const lv = Math.floor(S.xp / 100) + 1;
  const pg = S.xp % 100;
  const pt = S.pt === undefined ? 5 : S.pt;
  const rate = S.rate || (S.slow ? 0.65 : 0.85);

  return (
    <div id="mv" className="vw">
      <Hero title="الملف الشخصي" sig={lv + ':' + S.xp + ':' + S.st + ':' + saved.length}>
        <HeroText
          badge="حسابك"
          title="الملف الشخصي"
          sub={'المستوى ' + lv}
          meta={[<><Ico n="star" /> {S.xp} XP</>, <><Ico n="fire" /> {S.st} يوم</>, <><Ico n="book" /> {saved.length} كلمة</>]}
        />
      </Hero>
      {guest && (
        <div className="card acct">
          <div>
            <b style={{ direction: 'rtl', textAlign: 'right' }}>أنت تتصفح كزائر</b>
            <small>تقدّمك محفوظ على هذا الجهاز فقط. أنشئ حساباً لفتح كل الدروس ومزامنة تقدّمك.</small>
          </div>
          <button className="btn p" onClick={leaveGuest}>إنشاء حساب / دخول</button>
        </div>
      )}
      {cloud && user && (
        <div className="card acct">
          <div>
            <b>{user.email}</b>
            <small>{SYNC_TEXT[offline ? 'offline' : sync]}</small>
          </div>
          <button
            className="btn"
            id="signout"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              await flush(); // نرفع آخر تغييراتك قبل الخروج
              await signOut();
            }}
          >
            {leaving ? 'لحظة…' : 'تسجيل الخروج'}
          </button>
        </div>
      )}
      {isTeacher && (
        <div className="card acct">
          <div>
            <b style={{ direction: 'rtl', textAlign: 'right' }}>👩‍🏫 حساب معلم</b>
            <small>يمكنك رفع دروس جديدة أو تعديل الموجودة من ملفات JSON.</small>
          </div>
          <button className="btn p" id="teachgo" onClick={onTeach}>إدارة الدروس</button>
        </div>
      )}
      <div className="card pf">
        <div className="av"><Ico n="user" /></div>
        <input
          id="nm"
          maxLength={20}
          placeholder="اكتب اسمك"
          value={S.name || ''}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <span className="lvl-badge">المستوى {lv}</span>
        <div className="bar"><i style={{ width: pg + '%' }} /></div>
        <div className="xp-row">
          <span><b>{pg}</b> / 100 XP</span>
          <span>{100 - pg} نقطة للمستوى التالي</span>
        </div>
      </div>
      <Stats />
      <p className="sec">الإعدادات</p>
      <div className="card">
        <label className="sw">
          <span>أصوات التأثيرات (صح وخطأ)</span>
          <input
            type="checkbox"
            id="s1"
            checked={!S.mute}
            onChange={(e) => {
              patch({ mute: !e.target.checked });
              if (e.target.checked) fx.good(true);
            }}
          />
        </label>
        <label className="sw">
          <span>الاهتزاز عند الإجابات</span>
          <input type="checkbox" id="s9" checked={S.hap !== 0} onChange={(e) => patch({ hap: e.target.checked ? 1 : 0 })} />
        </label>
        <label className="sw">
          <span>شارة المراجعة (الرقم الأحمر)</span>
          <input type="checkbox" id="s4" checked={!S.nb} onChange={(e) => patch({ nb: !e.target.checked })} />
        </label>
        <div className="sw col">
          <span>إغلاق نافذة الكلمة تلقائياً: <b>{pt ? pt + ' ث' : 'بدون'}</b></span>
          <input type="range" id="pr" min="0" max="15" step="1" value={pt} onChange={(e) => patch({ pt: +e.target.value })} />
        </div>
        <div className="sw col">
          <span>سرعة النطق: <b>×{+rate.toFixed(2)}</b></span>
          <input
            type="range"
            id="rr"
            min="0.25"
            max="1.5"
            step="0.05"
            value={rate}
            onChange={(e) => patch({ rate: +e.target.value })}
            onPointerUp={() => sp.say('Good morning, class.')}
            onKeyUp={() => sp.say('Good morning, class.')}
          />
        </div>
      </div>
      {isNative && (
        <div className="card diag">
          <h3>فحص الصوت</h3>
          <p className="tip">إذا لم تسمع نطقاً أو مؤثرات، اضغط الأزرار وأرسل لي النتيجة.</p>
          <div className="diag-btns">
            <button
              className="btn"
              onClick={async () => {
                setDiag([]);
                await ttsDiagnose((l) => setDiag((d) => [...(d || []), l]));
              }}
            >
              اختبار النطق
            </button>
            <button
              className="btn"
              onClick={() => {
                fx.good(true);
                setDiag(['حالة المؤثرات: ' + audioState()]);
              }}
            >
              اختبار المؤثرات
            </button>
            <button
              className="btn"
              onClick={async () => {
                setDiag(['جارٍ المحاولة…']);
                setDiag([await ttsOpenInstall()]);
              }}
            >
              بيانات صوت اللغة
            </button>
          </div>
          {diag && <pre className="diag-out">{diag.join('\n')}</pre>}
        </div>
      )}
      <button
        className="btn"
        id="rs"
        onClick={() => {
          if (confirm) {
            resetAll();
            setConfirm(false);
          } else setConfirm(true);
        }}
      >
        {confirm ? 'اضغط مرة ثانية للتأكيد' : 'مسح كل التقدم'}
      </button>
      <p className="ver">الإصدار {APP_VERSION}</p>
    </div>
  );
}
