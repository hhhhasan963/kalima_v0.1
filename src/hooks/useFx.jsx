import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from './useStore.jsx';
import { haptic } from '../lib/native.js';

const FxContext = createContext(null);
let AC;

// WebView على أندرويد لا يسمح بتشغيل Web Audio قبل لمسة من المستخدم: ننشئ السياق ونشغّل نغمة صامتة عند أول لمسة
export function unlockAudio() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const s = AC.createBufferSource();
    s.buffer = AC.createBuffer(1, 1, 22050);
    s.connect(AC.destination);
    s.start(0);
  } catch {}
}
export const audioState = () => (AC ? AC.state : 'لم يُنشأ بعد');

export function FxProvider({ children }) {
  const { S, patch } = useStore();
  const muteRef = useRef(S.mute);
  muteRef.current = S.mute;
  const hapRef = useRef(S.hap !== 0);
  hapRef.current = S.hap !== 0;
  const buzz = (k) => hapRef.current && haptic(k);

  useEffect(() => {
    const ev = ['pointerdown', 'touchend', 'keydown'];
    const f = () => {
      unlockAudio();
      ev.forEach((e) => window.removeEventListener(e, f, true));
    };
    ev.forEach((e) => window.addEventListener(e, f, true));
    return () => ev.forEach((e) => window.removeEventListener(e, f, true));
  }, []);
  const [items, setItems] = useState([]);
  const [pop, setPop] = useState(0);
  const idRef = useRef(0);

  const push = useCallback((item, ms) => {
    const id = ++idRef.current;
    setItems((a) => [...a, { ...item, id }]);
    setTimeout(() => setItems((a) => a.filter((x) => x.id !== id)), ms);
  }, []);

  const ctx = () => {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      return AC;
    } catch {
      return null;
    }
  };

  // نغمة واحدة بتدرّج ناعم (بداية ونهاية بلا طقطقة). at = تأخير بالثواني
  const note = useCallback((f, at, d, type, v) => {
    const c = ctx();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      const t = c.currentTime + at;
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v || 0.12, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + d + 0.03);
    } catch {}
  }, []);

  // نغمة بسيطة (تُستخدم لاختيار الجواب)
  const tone = useCallback(
    (f, d, type, force) => {
      if (muteRef.current && !force) return;
      note(f, 0, d, type, 0.12);
    },
    [note]
  );

  const winRef = useRef(false); // أثناء الاحتفال لا نعزف نغمة «صح» فوقه

  const good = useCallback(
    (force) => {
      if (winRef.current) return;
      buzz('ok');
      if (muteRef.current && !force) return;
      note(784, 0, 0.16, 'triangle', 0.12);
      note(1175, 0.09, 0.26, 'triangle', 0.1);
    },
    [note]
  );
  const bad = useCallback(() => {
    if (!muteRef.current) {
      note(233, 0, 0.2, 'triangle', 0.14);
      note(175, 0.13, 0.3, 'triangle', 0.14);
    }
    buzz('bad');
  }, [note]);
  // تكّة خفيفة عند التنقّل بالشريط السفلي
  const tick = useCallback(() => {
    if (!muteRef.current) note(540, 0, 0.05, 'sine', 0.05);
  }, [note]);

  const addXP = useCallback(
    (n) => {
      patch((s) => ({ xp: s.xp + n }));
      setPop((p) => p + 1);
      push({ kind: 'fly', text: '+' + n + ' XP' }, 900);
    },
    [patch, push]
  );
  const toast = useCallback((text, ms = 2000) => push({ kind: 'toast', text }, ms), [push]);
  const bigToast = useCallback((text) => push({ kind: 'big', text }, 2700), [push]);
  const burst = useCallback(() => {
    winRef.current = true;
    buzz('win');
    setTimeout(() => (winRef.current = false), 200);
    if (!muteRef.current) {
      [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.28, 'triangle', 0.11));
      note(1319, 0.4, 0.5, 'sine', 0.08);
    }
    const colors = ['#f2c94c', '#1f8a5b', '#e4572e', '#4aa3df'];
    const pieces = Array.from({ length: 46 }, (_, i) => ({
      '--x': Math.random() * 80 - 40 + 'vw',
      '--r': Math.random() * 720 - 360 + 'deg',
      '--d': Math.random() * 0.5 + 's',
      left: Math.random() * 100 + '%',
      background: colors[i % 4],
    }));
    push({ kind: 'cf', pieces }, 2600);
  }, [push, note]);

  const value = { tone, good, bad, tick, addXP, toast, bigToast, burst, pop };
  return (
    <FxContext.Provider value={value}>
      {children}
      {items.map((it) =>
        it.kind === 'fly' ? (
          <div key={it.id} className="fly">{it.text}</div>
        ) : it.kind === 'toast' ? (
          <div key={it.id} className="toast">{it.text}</div>
        ) : it.kind === 'big' ? (
          <div key={it.id} className="toast big">{it.text}</div>
        ) : (
          <div key={it.id} className="cf">
            {it.pieces.map((st, i) => (
              <i key={i} style={st} />
            ))}
          </div>
        )
      )}
    </FxContext.Provider>
  );
}

export const useFx = () => useContext(FxContext);
