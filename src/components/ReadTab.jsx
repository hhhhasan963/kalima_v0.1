import { useEffect, useState } from 'react';
import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import { useSpeech } from '../hooks/useSpeech.jsx';
import { Ico } from './Icons.jsx';

const WORD_RE = /([A-Za-z0-9][A-Za-z0-9'’-]*)/;

function Word({ m, id, selId, saved, onWord, mean }) {
  const isNum = /^\d+$/.test(m);
  const cls =
    'w' +
    (mean(m) && !isNum ? ' k' : '') +
    (saved.includes(m.toLowerCase()) ? ' sv' : '') +
    (selId === id ? ' sel' : '');
  return (
    <span
      className={cls}
      data-w={m}
      onClick={(e) => {
        e.stopPropagation();
        onWord(m, id, e.currentTarget.getBoundingClientRect());
      }}
    >
      {m}
    </span>
  );
}

// تلميح «كيف أستخدم النص؟»: يظهر مرة واحدة فقط ويختفي بعد 6 ثوانٍ
function useOnceHint(active) {
  const [seen, setSeen] = useState(() => {
    try {
      return !!localStorage.getItem('u_hint');
    } catch {
      return true;
    }
  });
  const [show, setShow] = useState(false);
  // ReadTab مُركّب دائماً (حتى في الرئيسية)، فنبدأ التلميح فقط عندما يفتح الطالب النص فعلاً
  useEffect(() => {
    if (!active || seen) return;
    setShow(true);
    setSeen(true);
    try {
      localStorage.setItem('u_hint', '1');
    } catch {}
    const id = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(id);
  }, [active, seen]);
  return show;
}

export default function ReadTab({ L, selId, onWord, onBackground, active }) {
  const { S, patch, saved } = useStore();
  const sp = useSpeech();
  const { mean } = useLessons();
  const SS = L.SS;
  const fs = S.fs || 21;
  const hint = useOnceHint(active);
  const [trOpen, setTrOpen] = useState({}); // الفقرات التي ترجمتها مفتوحة
  const texts = SS.map((s) => s[0]);
  const run = sp.rp;
  const listening = !!run && run.key === 'listen';

  // تجميع الجمل في فقرات
  const paras = [];
  SS.forEach((s, i) => {
    const last = paras[paras.length - 1];
    if (!last || last.p !== s[2]) {
      paras.push({ p: s[2], cls: s[3] === 'q' ? ' qt' : s[3] === 'h' ? ' hd' : '', items: [] });
    }
    paras[paras.length - 1].items.push([s, i]);
  });

  return (
    <>
      {hint && (
        <div className="read-hint" role="note">
          <Ico n="bulb" />
          <p>
            <b>كيف أستخدم النص؟</b>
            اضغط أي كلمة لترى معناها، واضغط «استمع» لقراءة النص أو أي فقرة.
          </p>
        </div>
      )}
      <p className="tip">اضغط على أي كلمة لترى معناها. الكلمات الملوّنة بالأصفر هي المحفوظة عندك.</p>
      <p>
        <button
          className={'btn p' + (listening && !run.paused ? ' on' : '')}
          id="listen"
          onClick={() => sp.togglePlayAll('listen', texts)}
        >
          {listening ? <><Ico n="stop" /> إيقاف</> : <><Ico n="vol" /> استمع للنص كاملاً</>}
        </button>{' '}
        <button className="btn" id="fm" aria-label="تصغير الخط" onClick={() => patch({ fs: Math.max(17, fs - 2) })}>أ-</button>{' '}
        <button className="btn" id="fp" aria-label="تكبير الخط" onClick={() => patch({ fs: Math.min(29, fs + 2) })}>أ+</button>
      </p>
      <div id="text" onClick={onBackground}>
        {paras.map((para, pi) => {
          const from = para.items[0][1];
          const end = para.items[para.items.length - 1][1];
          const key = 'p' + pi;
          // زر الفقرة يتحوّل إلى «إيقاف/متابعة» عندما تُقرأ فقرته (من زره أو أثناء قراءة النص كاملاً)
          const active = !!run && (run.key === key || (run.key === 'listen' && run.i >= from && run.i <= end));
          const paused = active && run.paused;
          const showRow = !para.cls.includes('hd');
          return (
          <div key={pi} className="para">
            {showRow && (
              <div className="prow">
                <button
                  className={'pbtn' + (active ? ' act' : '') + (paused ? ' paused' : '')}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (active) paused ? sp.resume() : sp.pause();
                    else sp.playRange(key, texts, from, end);
                  }}
                >
                  <span className="pi">{active ? (paused ? <Ico n="vol" /> : <Ico n="stop" />) : <Ico n="vol" />}</span>
                  {active ? (paused ? 'متابعة' : 'إيقاف') : 'استمع للفقرة'}
                </button>
                <button
                  className={'tbtn' + (trOpen[pi] ? ' on' : '')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrOpen((o) => ({ ...o, [pi]: !o[pi] }));
                  }}
                >
                  ترجمة
                </button>
              </div>
            )}
            {trOpen[pi] && <p className="ptr">{para.items.map(([s]) => s[1]).filter(Boolean).join(' ')}</p>}
          <p className={'en' + para.cls}>
            {para.items.map(([s, i]) => (
              <span key={i} className={'sn' + (sp.hl === i ? ' hl' : '')} data-i={i}>
                {s[0].split(WORD_RE).map((part, idx) =>
                  idx % 2 ? (
                    <Word key={idx} m={part} id={i + '-' + idx} selId={selId} saved={saved} onWord={onWord} mean={(w) => mean(w, L.W)} />
                  ) : (
                    part
                  )
                )}{' '}
              </span>
            ))}
          </p>
          </div>
          );
        })}
      </div>
    </>
  );
}
