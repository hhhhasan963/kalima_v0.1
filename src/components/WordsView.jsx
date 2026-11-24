import { useEffect, useRef, useState } from 'react';
import Hero, { HeroText } from './Hero.jsx';
import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import { useFx } from '../hooks/useFx.jsx';
import { useSpeech } from '../hooks/useSpeech.jsx';
import { Ico } from './Icons.jsx';

// الحذف بالضغط المطوّل على ✕ (0.7 ثانية) مع دائرة حمراء تمتلئ
function FlipCard({ k }) {
  const { removeWord } = useStore();
  const { toast } = useFx();
  const sp = useSpeech();
  const { mean } = useLessons();
  const [on, setOn] = useState(false);
  const [hold, setHold] = useState(false);
  const timer = useRef(0);
  const fired = useRef(false);
  const st = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flip = () => {
    setOn((o) => !o);
    sp.say(k);
  };

  const down = (e) => {
    e.stopPropagation();
    fired.current = false;
    st.current = Date.now();
    setHold(true);
    timer.current = setTimeout(() => {
      fired.current = true;
      st.current = 0;
      setHold(false);
      removeWord(k);
      toast('تم حذف الكلمة');
    }, 700);
  };
  const end = () => {
    clearTimeout(timer.current);
    setHold(false);
    if (!fired.current && st.current && Date.now() - st.current < 700) toast('اضغط مطوّلاً على ✕ لحذف الكلمة');
    st.current = 0;
  };

  return (
    <div
      className={'flip' + (on ? ' on' : '')}
      tabIndex={0}
      onClick={flip}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), flip())}
    >
      <div className="in">
        <div className="f">{k}</div>
        <div className="b">{mean(k)}</div>
      </div>
      <button
        className={'dl' + (hold ? ' hold' : '')}
        data-k={k}
        aria-label="حذف (اضغط مطوّلاً)"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={down}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      >
        <Ico n="x" />
      </button>
    </div>
  );
}

export default function WordsView({ onReview }) {
  const { saved, dueList, clearWords } = useStore();
  const d = dueList.length;
  return (
    <div id="wv" className="vw">
      <Hero title="كلماتي" sig={saved.length + ':' + d}>
        <HeroText
          badge="بطاقاتك"
          title="كلماتي"
          sub="راجع الكلمات التي حفظتها"
          meta={[saved.length + ' محفوظة', d + ' للمراجعة']}
        />
      </Hero>
      {!saved.length ? (
        <div className="card">ما حفظت أي كلمة بعد. اضغط على كلمة في النص ثم اختر «احفظ الكلمة».</div>
      ) : (
        <>
          <div className="card rvc">
            <div>
              <b>{d ? d + ' كلمة جاهزة للمراجعة' : 'راجعت كل كلماتك ✓'}</b>
              <span className="mu">التكرار المتباعد: الكلمة التي تعرفها تتأخر، والتي تنساها ترجع قريباً.</span>
            </div>
            {d > 0 && <button className="cb" id="rvb" onClick={onReview}>ابدأ المراجعة</button>}
          </div>
          <p className="tip">اضغط على البطاقة لتقلبها. اضغط مطوّلاً على ✕ لحذف الكلمة.</p>
          <div className="fc">
            {saved.map((k) => (
              <FlipCard key={k} k={k} />
            ))}
          </div>
          <button className="btn" id="clr" onClick={clearWords}>مسح القائمة كلها</button>
        </>
      )}
    </div>
  );
}
