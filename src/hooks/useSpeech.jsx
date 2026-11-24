import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from './useStore.jsx';
import { cancelSpeech, speakText } from '../lib/tts.js';

const SpeechContext = createContext(null);

export function SpeechProvider({ children }) {
  const { S } = useStore();
  const rateRef = useRef(0.85);
  rateRef.current = S.rate || (S.slow ? 0.65 : 0.85);

  const [playing, setPlaying] = useState(null); // مفتاح الزر الذي يتحدث الآن
  const [hl, setHl] = useState(-1); // رقم الجملة المميّزة
  const playingRef = useRef(null);
  const tokenRef = useRef(0);

  const mark = (k) => {
    playingRef.current = k;
    setPlaying(k);
  };

  const stop = useCallback(() => {
    tokenRef.current++;
    try {
      cancelSpeech();
    } catch {}
    mark(null);
    setHl(-1);
  }, []);

  const stopIf = useCallback(
    (key) => {
      if (playingRef.current === key) stop();
    },
    [stop]
  );

  const say = useCallback(
    (text, key, hlIdx) => {
      stop();
      const t = tokenRef.current;
      try {
        let done;
        if (key) {
          mark(key);
          if (hlIdx !== undefined) setHl(hlIdx);
          done = () => {
            if (tokenRef.current === t) {
              mark(null);
              setHl(-1);
            }
          };
        }
        speakText(text, rateRef.current, done, done);
      } catch {}
    },
    [stop]
  );

  const toggle = useCallback(
    (text, key, hlIdx) => {
      if (playingRef.current === key) stop();
      else say(text, key, hlIdx);
    },
    [say, stop]
  );

  // قراءة كل الجمل بالتتابع مع تمييز الجملة الحالية
  const togglePlayAll = useCallback(
    (key, list) => {
      if (playingRef.current === key) {
        stop();
        return;
      }
      stop();
      const t = tokenRef.current;
      mark(key);
      const step = (i) => {
        if (t !== tokenRef.current) return;
        if (i >= list.length) {
          stop();
          return;
        }
        setHl(i);
        try {
          speakText(
            list[i],
            rateRef.current,
            () => step(i + 1),
            () => {
              if (t === tokenRef.current) stop();
            }
          );
        } catch {
          stop();
        }
      };
      step(0);
    },
    [stop]
  );

  // تمرير الصفحة إلى الجملة المقروءة
  useEffect(() => {
    if (hl < 0) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('section.on .hl');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [hl]);

  const value = { playing, hl, say, toggle, togglePlayAll, stop, stopIf };
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export const useSpeech = () => useContext(SpeechContext);
