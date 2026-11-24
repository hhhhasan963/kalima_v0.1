import { useCallback, useEffect, useRef, useState } from 'react';

// المسارات: home · words · ach · me · teach · edit/<id> · book/<id> · lesson/<id>
const BASE = ['words', 'ach', 'me', 'teach'];
const isValid = (h) => BASE.includes(h) || /^(lesson|book|edit)\/[\w.-]+$/.test(h);
const read = () => location.hash.slice(1);
const cur = () => (isValid(read()) ? read() : 'home');

// سجل المتصفح بعمق (d): [exit:0] ← [home:1] ← [صفحة أو كتاب:2] ← [درس من كتاب:3]
// زر الرجوع من الدرس يعيدك للكتاب، ومن الكتاب للرئيسية، ومن الرئيسية يعرض «اضغط رجوع مرة أخرى للإغلاق».
let canH = true;
let inited = false;
let PEND = null;
const DP = () => {
  const s = history.state;
  return (s && s.d) || (cur() === 'home' ? 1 : 2);
};
function initHistory() {
  if (inited) return;
  inited = true;
  const h0 = read();
  try {
    history.replaceState({ k: 'exit', d: 0 }, '', '#');
    history.pushState({ k: 'home', d: 1 }, '', '#');
    if (isValid(h0)) history.pushState({ k: 'v', d: 2 }, '', '#' + h0);
  } catch {
    canH = false;
    location.hash = isValid(h0) ? h0 : '';
  }
}

// guardRef.current = { open, back }  ← نافذة التمرين/المراجعة المفتوحة تعترض زر الرجوع
// toastRef.current = (msg) => void
export function useRoute({ guardRef, toastRef }) {
  const [hash, setHash] = useState(read);
  const [nav, setNav] = useState(0);
  const v = isValid(hash) ? hash : 'home';
  const lastV = useRef('home');
  lastV.current = v;
  const lastD = useRef(1);
  const exitArm = useRef(false);
  const exT = useRef(0);

  const route = useCallback(() => {
    lastD.current = DP();
    setHash(read());
    setNav((n) => n + 1);
  }, []);

  useEffect(() => {
    initHistory();
    route();

    const onPop = (e) => {
      const g = guardRef.current;
      if (g && g.open) {
        const home = lastV.current === 'home';
        try {
          history.pushState({ k: home ? 'home' : 'v', d: lastD.current }, '', '#' + (home ? '' : lastV.current));
        } catch {}
        g.back();
        return;
      }
      if (PEND) {
        const p = PEND;
        PEND = null;
        try {
          history.pushState({ k: 'v', d: 2 }, '', '#' + p);
        } catch {}
        route();
        return;
      }
      const s = e.state;
      if (s && s.k === 'exit') {
        if (exitArm.current) {
          exitArm.current = false;
          try {
            window.close();
          } catch {}
          history.back();
          return;
        }
        exitArm.current = true;
        clearTimeout(exT.current);
        exT.current = setTimeout(() => (exitArm.current = false), 2000);
        toastRef.current?.('اضغط رجوع مرة أخرى للإغلاق');
        try {
          history.pushState({ k: 'home', d: 1 }, '', '#');
        } catch {}
        route();
        return;
      }
      route();
    };
    window.addEventListener('popstate', onPop);
    if (!canH) window.addEventListener('hashchange', route);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', route);
    };
  }, []); // eslint-disable-line

  // deep = فتح درس من داخل كتاب (يضيف مستوى للسجل)
  const go = useCallback(
    (target, opts) => {
      const deep = !!(opts && opts.deep);
      const c = cur();
      const d = DP();
      if (target === c) return route();
      if (!canH) {
        location.hash = target === 'home' ? '' : target;
        return route();
      }
      if (target === 'home') {
        if (d > 1) history.go(-(d - 1));
        else route();
        return;
      }
      try {
        if (deep && c !== 'home') {
          history.pushState({ k: 'v', d: d + 1 }, '', '#' + target);
        } else if (d > 2) {
          PEND = target; // نرجع لمستوى الرئيسية أولاً ثم نفتح الصفحة الجديدة
          history.go(-(d - 1));
          return;
        } else if (c === 'home') {
          history.pushState({ k: 'v', d: 2 }, '', '#' + target);
        } else {
          history.replaceState({ k: 'v', d: 2 }, '', '#' + target);
        }
      } catch {
        canH = false;
        location.hash = target;
      }
      route();
    },
    [route]
  );

  const back = useCallback(() => {
    if (canH && DP() > 1) history.back();
    else go('home');
  }, [go]);

  return { v, go, back, nav };
}
