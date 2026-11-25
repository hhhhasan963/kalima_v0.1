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

const FILTERS = [
  ['all', 'الكل'],
  ['due', 'للمراجعة'],
  ['known', 'معروفة'],
];

export default function WordsView({ onReview, onStart }) {
  const { saved, dueList, clearWords } = useStore();
  const [filter, setFilter] = useState('all');
  const d = dueList.length;
  const counts = { all: saved.length, due: d, known: saved.length - d };
  const shown = saved.filter((k) => filter === 'all' || (filter === 'due') === dueList.includes(k));
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
        <div className="card words-empty">
          <div className="we-ic"><Ico n="cards" /></div>
          <p>ما حفظت أي كلمة بعد.<br />اضغط على كلمة في النص ثم اختر «احفظ الكلمة».</p>
          {onStart && <button className="cb" onClick={onStart}>ابدأ القراءة</button>}
        </div>
      ) : (
        <>
          <div className="card rvc">
            <div>
              <b>{d ? d + ' كلمة جاهزة للمراجعة' : 'راجعت كل كلماتك ✓'}</b>
              <span className="mu">التكرار المتباعد: الكلمة التي تعرفها تتأخر، والتي تنساها ترجع قريباً.</span>
            </div>
            {d > 0 && <button className="cb" id="rvb" onClick={onReview}>ابدأ المراجعة</button>}
          </div>
          <div className="wf-bar" role="tablist" aria-label="تصفية الكلمات">
            {FILTERS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={filter === id} className={'wf-btn' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>
                {label} <span className="wcount">{counts[id]}</span>
              </button>
            ))}
          </div>
          <p className="tip">اضغط على البطاقة لتقلبها. اضغط مطوّلاً على ✕ لحذف الكلمة.</p>
          {shown.length ? (
            <div className="fc">
              {shown.map((k) => (
                <FlipCard key={k} k={k} />
              ))}
            </div>
          ) : (
            <div className="card words-empty">
              <p>{filter === 'due' ? 'لا توجد كلمات للمراجعة الآن. أحسنت!' : 'لا توجد كلمات معروفة بعد. راجع كلماتك لتنتقل إلى هنا.'}</p>
            </div>
          )}
          <button className="btn" id="clr" onClick={clearWords}>مسح القائمة كلها</button>
        </>
      )}
    </div>
  );
}
