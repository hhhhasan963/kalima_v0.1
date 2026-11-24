import { useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore.jsx';
import { useFx } from '../hooks/useFx.jsx';
import { Icon } from './Icons.jsx';

const ITEMS = [
  ['home', 'الرئيسية'],
  ['words', 'كلماتي'],
  ['lesson', 'درسي'],
  ['ach', 'الإنجازات'],
  ['me', 'الملف الشخصي'],
];

// عرض الشريط الجانبي (على الحاسوب): من 76px (أيقونات فقط) إلى ربع الشاشة
const sbMax = () => Math.max(120, Math.floor(document.documentElement.clientWidth * 0.25));
function sbSet(w) {
  w = Math.max(76, Math.min(sbMax(), Math.round(w)));
  document.body.style.setProperty('--sbw', w + 'px');
  document.body.classList.toggle('sbm', w < 150);
  return w;
}
const sbCur = () => parseInt(document.body.style.getPropertyValue('--sbw')) || 260;

export default function BottomNav({ selected, onGo }) {
  const { S, patch, dueList } = useStore();
  const { tick } = useFx();
  const n = dueList.length;
  const dragging = useRef(false);

  // تطبيق العرض المحفوظ (أو الافتراضي) وإعادة تطبيقه عند تغيّر حجم النافذة
  useEffect(() => {
    const apply = () => sbSet(S.sbw !== undefined ? S.sbw : innerWidth < 1200 ? 76 : 260);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [S.sbw]);

  const toggle = (e) => {
    e.stopPropagation();
    const c = sbCur();
    if (c >= 150) patch({ sbl: c, sbw: sbSet(76) });
    else patch({ sbw: sbSet(S.sbl || 260) });
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.classList.remove('dg');
    patch({ sbw: sbSet(sbCur()) });
  };

  return (
    <div id="bn">
      {ITEMS.map(([k, label]) => {
        const badge = k === 'words';
        return (
          <button
            key={k}
            data-v={k}
            title={label}
            data-n={badge ? (n > 9 ? '9+' : n) : undefined}
            className={badge && n > 0 && !S.nb ? 'dot' : ''}
            aria-selected={selected === k}
            onClick={() => {
              tick();
              onGo(k);
            }}
          >
            <Icon name={k} />
            {label}
          </button>
        );
      })}
      <button id="sbt" aria-label="تصغير أو تكبير الشريط الجانبي" onClick={toggle}>
        <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <div
        id="sbr"
        title="اسحب لتغيير عرض الشريط"
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          document.body.classList.add('dg');
          dragging.current = true;
        }}
        onPointerMove={(e) => {
          if (dragging.current) sbSet(document.documentElement.clientWidth - e.clientX);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => patch({ sbw: sbSet(sbCur() >= 150 ? 76 : Math.min(260, sbMax())) })}
      />
    </div>
  );
}
