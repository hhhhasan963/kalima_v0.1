import { useState } from 'react';
import { useSpeech } from '../hooks/useSpeech.jsx';
import { Ico } from './Icons.jsx';

const MODES = [
  ['', 'الكل'],
  ['hid-ar', 'أخفِ العربي'],
  ['hid-en', 'أخفِ الإنكليزي'],
];

export default function CompareTab({ L }) {
  const sp = useSpeech();
  const SS = L.SS;
  const [mode, setMode] = useState('');
  const [revealed, setRevealed] = useState(() => new Set());

  const toggleCard = (i) =>
    setRevealed((r) => {
      const n = new Set(r);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  return (
    <>
      <p className="tip">كل جملة بالإنكليزية وتحتها ترجمتها. جرّب إخفاء إحدى اللغتين واضغط على الجملة لتكشفها.</p>
      <p>
        <button
          className={'btn p' + (sp.playing === 'listen2' ? ' on' : '')}
          id="listen2"
          onClick={() => sp.togglePlayAll('listen2', SS.map((s) => s[0]))}
        >
          {sp.playing === 'listen2' ? <><Ico n="stop" /> إيقاف</> : <><Ico n="vol" /> استمع للنص كاملاً</>}
        </button>
      </p>
      <div className="md" id="md">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            className={mode === m ? 'on' : ''}
            onClick={() => {
              setMode(m);
              setRevealed(new Set());
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="cmpList" className={mode ? 'm-' + mode : ''}>
        {SS.map((s, i) => {
          const key = 'say-' + i;
          return (
            <div
              key={i}
              data-i={i}
              className={
                'card' +
                (i && s[2] !== SS[i - 1][2] ? ' np' : '') +
                (s[3] === 'h' ? ' hc' : '') +
                (revealed.has(i) ? ' rv' : '') +
                (sp.hl === i ? ' hl' : '')
              }
              onClick={() => toggleCard(i)}
            >
              <p className="en">{s[0]}</p>
              <p className="ar">{s[1]}</p>
              <button
                className={'btn' + (sp.playing === key ? ' on' : '')}
                onClick={(e) => {
                  e.stopPropagation();
                  sp.toggle(s[0], key, i);
                }}
              >
                {sp.playing === key ? <><Ico n="stop" /> إيقاف</> : <><Ico n="vol" /> استمع</>}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
