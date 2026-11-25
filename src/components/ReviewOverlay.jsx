import { useRef, useState } from 'react';
import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import { useFx } from '../hooks/useFx.jsx';
import { useSpeech } from '../hooks/useSpeech.jsx';
import { shuffle } from '../lib/shuffle.js';
import { Ico } from './Icons.jsx';

const DAYS = [0, 1, 3, 7, 14]; // فواصل التكرار المتباعد بالأيام

export default function ReviewOverlay({ onClose, onFinish }) {
  const { dueList, patch } = useStore();
  const fx = useFx();
  const sp = useSpeech();
  const { mean, allSentences } = useLessons();
  const [list] = useState(() => shuffle(dueList));
  const n = list.length;
  const [i, setI] = useState(0);
  const [okN, setOkN] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [end, setEnd] = useState(false);
  const [drag, setDrag] = useState(null); // سحب البطاقة: { x, y, dx, on, out }

  const k = list[Math.min(i, n - 1)];
  const m = mean(k) || '';
  // بحدود الكلمة: لا تطابق «is» كلمة «praised»
  const re = new RegExp("(^|[^A-Za-z0-9'’-])" + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "($|[^A-Za-z0-9'’-])", 'i');
  const s = allSentences.find((x) => re.test(x[0]));
  const xp = n * 3;

  const grade = (r) => {
    sp.stop();
    patch((st) => {
      const bx = { ...(st.bx || {}) };
      let b = (bx[k] || { b: 0 }).b;
      b = r === 2 ? Math.min(4, b + 1) : r === 1 ? b : 0;
      bx[k] = { b, d: Date.now() + DAYS[b] * 864e5 };
      return { bx };
    });
    if (r === 2) setOkN((x) => x + 1);
    if (i + 1 >= n) {
      setEnd(true);
      fx.burst();
      fx.good();
    } else {
      setI(i + 1);
      setFlipped(false);
    }
  };

  // سحب البطاقة بعد قلبها: يميناً = لم أعرفها، يساراً = عرفتها.
  // المنطق في مرجع (ref) حتى لا تتأثر السحبات السريعة بتأخّر إعادة الرسم؛ والحالة (drag) للشكل فقط.
  const dg = useRef(null);
  const onTS = (e) => {
    if (!flipped || e.target.closest('button')) return;
    const t0 = e.touches[0];
    dg.current = { x: t0.clientX, y: t0.clientY, dx: 0, on: false, out: false };
  };
  const onTM = (e) => {
    const d = dg.current;
    if (!d || d.out) return;
    const t0 = e.touches[0];
    const dx = t0.clientX - d.x;
    const dy = t0.clientY - d.y;
    if (!d.on && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) d.on = true;
    if (!d.on) return;
    d.dx = dx;
    setDrag({ dx, on: true, out: false });
  };
  const onTE = () => {
    const d = dg.current;
    if (!d || d.out) return;
    if (d.on && Math.abs(d.dx) > 100) {
      d.out = true;
      const right = d.dx > 0;
      setDrag({ dx: right ? innerWidth * 1.2 : -innerWidth * 1.2, on: true, out: true });
      setTimeout(() => {
        dg.current = null;
        setDrag(null);
        grade(right ? 0 : 2);
      }, 170);
    } else {
      dg.current = null;
      setDrag(null);
    }
  };
  const dragStyle = drag && drag.on
    ? {
        transform: `translateX(${drag.dx}px) rotate(${drag.dx / 22}deg)`,
        opacity: drag.out ? 0 : 1 - Math.min(0.45, Math.abs(drag.dx) / 420),
        outline: Math.abs(drag.dx) > 70 && !drag.out ? '4px solid ' + (drag.dx > 0 ? '#d9482b' : '#1f8a5b') : undefined,
        borderRadius: 16,
        animation: 'none',
        transition: drag.out ? 'transform .18s, opacity .18s' : 'none',
      }
    : undefined;

  const exit = () => {
    sp.stop();
    onClose();
  };

  return (
    <div id="lp">
      <div className="lt">
        <button className="x" id="lx" aria-label="خروج" onClick={exit}><Ico n="x" /></button>
        <div className="bar"><i id="lbi" style={{ width: (end ? 100 : (i / n) * 100) + '%' }} /></div>
        <span id="lc">{Math.min(i + 1, n)}/{n}</span>
      </div>
      <div id="lbody">
        {end ? (
          <div className="end qin">
            <div className="trophy"><Ico n="cards" /></div>
            <h2>انتهت المراجعة!</h2>
            <div className="mc">
              <div style={{ '--c': '#d89b00' }}><small>XP</small><b>+{xp}</b></div>
              <div style={{ '--c': '#1f8a5b' }}><small>عرفتها</small><b>{okN}/{n}</b></div>
              <div style={{ '--c': '#1c8fd6' }}><small>الكلمات</small><b>{n}</b></div>
            </div>
          </div>
        ) : (
          <div key={i}>
            <p className="tip">تذكّر المعنى ثم اقلب البطاقة</p>
            <div
              className={'flip big qin' + (flipped ? ' on' : '')}
              id="rf"
              style={dragStyle}
              onTouchStart={onTS}
              onTouchMove={onTM}
              onTouchEnd={onTE}
              onTouchCancel={onTE}
              onClick={(e) => {
                if (!e.target.closest('#rsp')) setFlipped(true);
              }}
            >
              <div className="in">
                <div className="f">
                  <b className="wd">{k}</b>
                  <button
                    className="btn"
                    id="rsp"
                    onClick={(e) => {
                      e.stopPropagation();
                      sp.toggle(k, 'rv');
                    }}
                  >
                    {sp.playing === 'rv' ? <><Ico n="stop" /> إيقاف</> : <><Ico n="vol" /> نطق</>}
                  </button>
                </div>
                <div className="b">
                  <div>
                    <div className="mn">{m}</div>
                    {s && <p className="sx">{s[0]}<span>{s[1]}</span></p>}
                  </div>
                </div>
              </div>
            </div>
            {flipped && <p className="sw-hint">اسحب البطاقة يميناً: لم أعرفها · يساراً: عرفتها</p>}
          </div>
        )}
      </div>
      <div className="lf" id="lf">
        {end ? (
          <button className="cb" id="cl" onClick={() => onFinish(xp)}>استلم النقاط</button>
        ) : flipped ? (
          <div className="rt">
            <button className="cb rd" onClick={() => grade(0)}>لم أعرفها</button>
            <button className="cb am" onClick={() => grade(1)}>تقريباً</button>
            <button className="cb" onClick={() => grade(2)}>عرفتها</button>
          </div>
        ) : (
          <button className="cb" id="fl" onClick={() => setFlipped(true)}>اقلب البطاقة</button>
        )}
      </div>
    </div>
  );
}
