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

export default function ReadTab({ L, selId, onWord, onBackground }) {
  const { S, patch, saved } = useStore();
  const sp = useSpeech();
  const { mean } = useLessons();
  const SS = L.SS;
  const fs = S.fs || 21;

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
      <p className="tip">اضغط على أي كلمة لترى معناها. الكلمات الملوّنة بالأصفر هي المحفوظة عندك.</p>
      <p>
        <button
          className={'btn p' + (sp.playing === 'listen' ? ' on' : '')}
          id="listen"
          onClick={() => sp.togglePlayAll('listen', SS.map((s) => s[0]))}
        >
          {sp.playing === 'listen' ? <><Ico n="stop" /> إيقاف</> : <><Ico n="vol" /> استمع للنص كاملاً</>}
        </button>{' '}
        <button className="btn" id="fm" aria-label="تصغير الخط" onClick={() => patch({ fs: Math.max(17, fs - 2) })}>أ-</button>{' '}
        <button className="btn" id="fp" aria-label="تكبير الخط" onClick={() => patch({ fs: Math.min(29, fs + 2) })}>أ+</button>
      </p>
      <div id="text" onClick={onBackground}>
        {paras.map((para, pi) => (
          <p key={pi} className={'en' + para.cls}>
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
        ))}
      </div>
    </>
  );
}
