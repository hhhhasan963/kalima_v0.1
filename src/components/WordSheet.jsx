import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import { useFx } from '../hooks/useFx.jsx';
import { useSpeech } from '../hooks/useSpeech.jsx';
import { Ico } from './Icons.jsx';

// نافذة صغيرة تظهر بجانب الكلمة المضغوطة
export default function WordSheet({ sheet, open, onClose, words }) {
  const { S, saved, addWord } = useStore();
  const { addXP } = useFx();
  const sp = useSpeech();
  const { mean } = useLessons();
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: 10, top: 64 });
  const [dy, setDy] = useState(0); // سحب النافذة للأسفل
  const ty = useRef(null);
  const dyRef = useRef(0);

  useLayoutEffect(() => {
    if (!sheet || !open || !ref.current) return;
    const s = ref.current;
    const sw = s.offsetWidth;
    const sh = s.offsetHeight;
    const r = sheet.rect;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - sw / 2), innerWidth - sw - 8);
    const below = r.bottom + 10 + sh < innerHeight - 76;
    const y = below ? r.bottom + 10 : Math.max(64, r.top - sh - 10);
    setPos({ left: x, top: y });
  }, [sheet, open]);

  const pt = S.pt === undefined ? 5 : S.pt;

  // إغلاق تلقائي
  useEffect(() => {
    if (!open || !pt) return;
    const id = setTimeout(onClose, pt * 1000);
    return () => clearTimeout(id);
  }, [open, sheet?.nonce, pt, onClose]);

  // إغلاق عند التمرير
  useEffect(() => {
    if (!open) return;
    const f = () => onClose();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [open, onClose]);

  const onTS = (e) => {
    ty.current = e.target.closest('button') ? null : e.touches[0].clientY;
  };
  const onTM = (e) => {
    if (ty.current === null) return;
    const d = e.touches[0].clientY - ty.current;
    dyRef.current = d > 0 ? d : 0;
    setDy(dyRef.current);
  };
  const onTE = () => {
    if (ty.current === null) return;
    ty.current = null;
    const d = dyRef.current;
    dyRef.current = 0;
    setDy(0);
    if (d > 70) onClose();
  };

  const w = sheet?.w;
  const m = w ? mean(w, words) : null;
  const isSaved = w ? saved.includes(w.toLowerCase()) : false;

  return (
    <div
      id="sheet"
      ref={ref}
      role="dialog"
      aria-live="polite"
      className={open ? 'on' : ''}
      style={{ left: pos.left, top: pos.top, ...(dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : null) }}
      onTouchStart={onTS}
      onTouchMove={onTM}
      onTouchEnd={onTE}
      onTouchCancel={onTE}
    >
      {sheet && (
        <>
          <b>{w}</b> &nbsp; <span>{m || 'كلمة شائعة أو اسم، ما لها ترجمة مخصّصة'}</span>
          <div className="row">
            <button className="btn p" id="sp" onClick={() => sp.toggle(w, 'sheet')}>
              {sp.playing === 'sheet' ? <><Ico n="stop" /> إيقاف</> : <><Ico n="vol" /> نطق</>}
            </button>
            {m && (
              <button
                className="btn"
                id="sv"
                onClick={() => {
                  if (isSaved) return;
                  addWord(w.toLowerCase());
                  addXP(5);
                }}
              >
                {isSaved ? <><Ico n="ok" /> محفوظة</> : <><Ico n="star0" /> احفظ الكلمة</>}
              </button>
            )}
            <button className="btn" id="cl" onClick={onClose}>إغلاق</button>
          </div>
          <button
            key={sheet.nonce}
            className="xc"
            id="xc"
            aria-label="إغلاق"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <svg viewBox="0 0 28 28">
              <circle className="tr" cx="14" cy="14" r="12" />
              <circle
                className="pg"
                cx="14"
                cy="14"
                r="12"
                style={pt ? { animation: `ringdown ${pt}s linear forwards` } : { display: 'none' }}
              />
            </svg>
            <Ico n="x" />
          </button>
        </>
      )}
    </div>
  );
}
