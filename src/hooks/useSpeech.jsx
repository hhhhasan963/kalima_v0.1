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
  // جلسة قراءة متتابعة (النص كاملاً أو فقرة): { key, from, end, i, paused }
  const [rp, setRpState] = useState(null);
  const playingRef = useRef(null);
  const tokenRef = useRef(0);
  const rpRef = useRef(null);
  const runRef = useRef({ list: [], key: '', from: 0, end: 0 });
  const idxRef = useRef(0);
  const autoRef = useRef(false); // أُوقفت القراءة مؤقتاً تلقائياً بسبب نقر كلمة

  const mark = (k) => {
    playingRef.current = k;
    setPlaying(k);
  };
  const setRp = (v) => {
    rpRef.current = v;
    setRpState(v);
  };

  const stop = useCallback(() => {
    tokenRef.current++;
    try {
      cancelSpeech();
    } catch {}
    autoRef.current = false;
    mark(null);
    setHl(-1);
    setRp(null);
  }, []); // eslint-disable-line

  const stopIf = useCallback(
    (key) => {
      if (playingRef.current !== key) return;
      if (rpRef.current) {
        // جلسة قراءة قائمة (موقوفة مؤقتاً): نسكت نطق الكلمة فقط
        tokenRef.current++;
        try {
          cancelSpeech();
        } catch {}
        mark(null);
      } else stop();
    },
    [stop]
  );

  // نطق نص واحد. نطق كلمة النافذة (key = 'sheet') لا يُنهي جلسة القراءة الموقوفة.
  const say = useCallback(
    (text, key, hlIdx) => {
      const keep = key === 'sheet' && !!rpRef.current;
      if (keep) {
        tokenRef.current++;
        try {
          cancelSpeech();
        } catch {}
      } else stop();
      const t = tokenRef.current;
      try {
        let done;
        if (key) {
          mark(key);
          if (hlIdx !== undefined) setHl(hlIdx);
          done = () => {
            if (tokenRef.current === t) {
              mark(null);
              if (!keep) setHl(-1);
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
      if (playingRef.current === key) stopIf(key);
      else say(text, key, hlIdx);
    },
    [say, stopIf]
  );

  // قراءة الجمل from..end بالتتابع مع تمييز الجملة الحالية. startAt لاستئناف الجملة نفسها بعد الإيقاف المؤقت.
  const startRun = useCallback(
    (key, list, from, end, startAt = from) => {
      tokenRef.current++;
      try {
        cancelSpeech();
      } catch {}
      autoRef.current = false;
      const t = tokenRef.current;
      runRef.current = { list, key, from, end };
      mark(key);
      const step = (i) => {
        if (t !== tokenRef.current) return;
        if (i > end) {
          stop();
          return;
        }
        idxRef.current = i;
        setHl(i);
        setRp({ key, from, end, i, paused: false });
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
      step(startAt);
    },
    [stop] // eslint-disable-line
  );

  const togglePlayAll = useCallback(
    (key, list) => {
      if (rpRef.current && rpRef.current.key === key) stop();
      else startRun(key, list, 0, list.length - 1);
    },
    [startRun, stop]
  );

  const playRange = useCallback(
    (key, list, from, end) => {
      if (rpRef.current && rpRef.current.key === key) stop();
      else startRun(key, list, from, end);
    },
    [startRun, stop]
  );

  // إيقاف مؤقت: لا نستخدم speechSynthesis.pause() (غير موثوق على أندرويد)؛ نلغي النطق ونعيد الجملة من أولها عند المتابعة
  const pause = useCallback(() => {
    const r = rpRef.current;
    if (!r || r.paused) return;
    tokenRef.current++;
    try {
      cancelSpeech();
    } catch {}
    setRp({ ...r, paused: true });
  }, []); // eslint-disable-line

  const resume = useCallback(() => {
    const r = rpRef.current;
    if (!r || !r.paused) return;
    const { list, key, from, end } = runRef.current;
    startRun(key, list, from, end, idxRef.current);
  }, [startRun]);

  // نقر كلمة أثناء القراءة: إيقاف مؤقت تلقائي (يُستأنف عند إغلاق النافذة). إن كان الإيقاف يدوياً فلا استئناف تلقائي.
  const softPause = useCallback(() => {
    const r = rpRef.current;
    if (!r || r.paused) return false;
    autoRef.current = true;
    pause();
    return true;
  }, [pause]);

  const resumeAuto = useCallback(() => {
    if (!autoRef.current) return;
    autoRef.current = false;
    if (rpRef.current && rpRef.current.paused) resume();
  }, [resume]);

  // تمرير ذكي: لا تتحرك الصفحة إلا إذا خرجت الجملة من المنطقة المريحة (تحت التبويبات وفوق المشغّل)
  useEffect(() => {
    if (hl < 0) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('section.on .hl');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nav = document.querySelector('nav[role=tablist]');
      const top = (nav ? nav.getBoundingClientRect().bottom : 60) + 10;
      const pl = document.getElementById('rpl');
      const bottom = (pl && pl.classList.contains('on') ? pl.getBoundingClientRect().top : innerHeight - 80) - 10;
      if (r.top < top || r.bottom > bottom) window.scrollBy({ top: r.top - top - 30, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [hl]);

  const value = { playing, hl, rp, say, toggle, togglePlayAll, playRange, pause, resume, softPause, resumeAuto, stop, stopIf };
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export const useSpeech = () => useContext(SpeechContext);
