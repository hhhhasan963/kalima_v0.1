import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { useStore } from '../hooks/useStore.jsx';
import { useFx } from '../hooks/useFx.jsx';
import { shuffle } from '../lib/shuffle.js';
import { Ico } from './Icons.jsx';

// شاشة التمرين الكاملة (سؤال ← تحقق ← متابعة)
export default function QuizOverlay({ L, backTick, onClose, onFinish }) {
  const { patch } = useStore();
  const fx = useFx();
  const Q = L.Q;
  const n = Q.length;
  const [ord] = useState(() => shuffle(Q.map((_, i) => i)));
  const [t0] = useState(() => Date.now());
  const [i, setI] = useState(0);
  const [sc, setSc] = useState(0);
  const [sel, setSel] = useState(-1);
  const [phase, setPhase] = useState('pick'); // pick | done | end
  const [ok, setOk] = useState(false);
  const [combo, setCombo] = useState(0);
  const [exit, setExit] = useState(false);
  const [wrong, setWrong] = useState([]); // الأسئلة التي أخطأ فيها: { q, pick, ans, e }
  const [showMist, setShowMist] = useState(false);

  // زر الرجوع في الجهاز يفتح سؤال «تريد الخروج؟»
  const firstTick = useRef(backTick);
  useEffect(() => {
    if (backTick === firstTick.current) return;
    if (showMist) setShowMist(false); // الرجوع من صفحة الأخطاء ← الملخص
    else setExit(true);
  }, [backTick]); // eslint-disable-line

  const q = Q[ord[Math.min(i, n - 1)]];
  const opts = useMemo(
    () => (q.tf ? [{ t: 'True', i: 0 }, { t: 'False', i: 1 }] : shuffle(q.o.map((t, x) => ({ t, i: x })))),
    [i] // eslint-disable-line
  );

  const ansText = (qq, idx) => (qq.tf ? (idx === 0 ? 'True' : 'False') : qq.o[idx]);

  const check = () => {
    const good = sel === q.a;
    setOk(good);
    setPhase('done');
    if (good) {
      setSc((s) => s + 1);
      setCombo((c) => c + 1);
      fx.good();
    } else {
      setCombo(0);
      setWrong((w) => [...w, { q: q.q, pick: ansText(q, sel), ans: ansText(q, q.a), e: q.e }]);
      fx.bad();
    }
  };

  const pc = Math.round((sc / n) * 100);
  const xp = sc * 10 + (pc >= 80 ? 20 : 0);

  const next = () => {
    if (i + 1 >= n) {
      setPhase('end');
      patch((s) => {
        const bs = s.bs || {};
        return bs[L.id] >= sc ? {} : { bs: { ...bs, [L.id]: sc } };
      });
      if (pc >= 80) {
        fx.burst();
        fx.good();
      }
    } else {
      setI(i + 1);
      setSel(-1);
      setPhase('pick');
    }
  };

  const secs = Math.round((Date.now() - t0) / 1000);
  const time = Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2);
  const barW = phase === 'end' ? 100 : ((phase === 'done' ? i + 1 : i) / n) * 100;

  let footer;
  if (exit) {
    footer = (
      <div className="lf r" id="lf">
        <div className="fm"><b>تريد الخروج؟</b><p>سيضيع تقدمك بهذا التمرين.</p></div>
        <button className="cb" id="st" onClick={() => setExit(false)}>أكمل التمرين</button>
        <button className="gh" id="qt" onClick={onClose}>خروج</button>
      </div>
    );
  } else if (phase === 'pick') {
    footer = (
      <div className="lf" id="lf">
        <button className="cb" id="ck" disabled={sel < 0} onClick={check}>تحقق</button>
      </div>
    );
  } else if (phase === 'done') {
    footer = (
      <div className={'lf ' + (ok ? 'g' : 'r')} id="lf">
        <div className="fm">
          <b>
            {ok
              ? combo >= 3
                ? <>✓ <Ico n="fire" /> {combo} متتالية!</>
                : '✓ ' + ['ممتاز!', 'أحسنت!', 'رائع!'][i % 3]
              : '✗ لا بأس، هكذا نتعلّم'}
          </b>
          <p>{q.e}</p>
        </div>
        <button className={'cb' + (ok ? '' : ' rd')} id="nx" onClick={next}>
          {i + 1 >= n ? 'إنهاء' : 'متابعة'}
        </button>
      </div>
    );
  } else if (showMist) {
    footer = (
      <div className="lf" id="lf">
        <button className="cb" id="cl" onClick={() => setShowMist(false)}>رجوع للملخص</button>
      </div>
    );
  } else {
    footer = (
      <div className="lf" id="lf">
        <button className="cb" id="cl" onClick={() => onFinish(xp)}>استلم النقاط</button>
        {wrong.length > 0 && (
          <button className="gh" id="mist" onClick={() => setShowMist(true)}>راجع أخطاءك ({wrong.length})</button>
        )}
      </div>
    );
  }

  return (
    <div id="lp">
      <div className="lt">
        <button className="x" id="lx" aria-label="خروج" onClick={() => setExit(true)}><Ico n="x" /></button>
        <div className="bar"><i id="lbi" style={{ width: barW + '%' }} /></div>
        <span id="lc">{Math.min(i + 1, n)}/{n}</span>
      </div>
      <div id="lbody">
        {phase === 'end' && showMist ? (
          <div className="mist qin">
            <p className="tip">راجع الأسئلة التي أخطأت فيها ({wrong.length})</p>
            {wrong.map((w, k) => (
              <div className="card mi" key={k}>
                <p className="en">{w.q}</p>
                <p className="mi-no"><small>إجابتك</small><span dir="ltr">✗ {w.pick}</span></p>
                <p className="mi-ok"><small>الصحيحة</small><span dir="ltr">✓ {w.ans}</span></p>
                {w.e && <p className="mi-e">{w.e}</p>}
              </div>
            ))}
          </div>
        ) : phase === 'end' ? (
          <div className="end qin">
            <div className="trophy"><Ico n={pc >= 80 ? 'trophy' : pc >= 50 ? 'spark' : 'book'} /></div>
            <h2>{pc >= 80 ? 'ممتاز!' : pc >= 50 ? 'جيد!' : 'حاول مرة ثانية'}</h2>
            <div className="mc">
              <div style={{ '--c': '#d89b00' }}><small>XP</small><b>+{xp}</b></div>
              <div style={{ '--c': '#1f8a5b' }}><small>الدقة</small><b>{pc}%</b></div>
              <div style={{ '--c': '#1c8fd6' }}><small>الوقت</small><b>{time}</b></div>
            </div>
          </div>
        ) : (
          <Fragment key={i}>
            <p className="tip">{q.tf ? 'صح أم خطأ؟' : 'اختر الإجابة الصحيحة'}</p>
            <div className="card qin"><p className="en" style={{ margin: 0 }}>{q.q}</p></div>
            <div id="lo">
              {opts.map((o, x) => {
                let c = 'opt';
                if (phase === 'done') c += o.i === q.a ? ' ok' : o.i === sel ? ' no' : '';
                else if (o.i === sel) c += ' pk';
                return (
                  <button
                    key={x}
                    className={c}
                    style={{ '--i': x }}
                    onClick={() => {
                      if (phase !== 'pick') return;
                      setSel(o.i);
                      fx.tone(520, 0.06);
                    }}
                  >
                    {o.t}
                  </button>
                );
              })}
            </div>
          </Fragment>
        )}
      </div>
      {footer}
    </div>
  );
}
