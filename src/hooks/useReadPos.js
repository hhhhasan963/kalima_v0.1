import { useEffect, useRef } from 'react';

// تذكّر مكان القراءة لكل درس: S.rp[lessonId] = { i: رقم أول جملة ظاهرة, o: بُعدها عن أسفل التبويبات, y: بكسل, t: وقت }
// نحفظ الجملة وليس البكسل فقط، لأن البكسل ينجرف عند تغيّر القياسات (الخط/الهيرو) بين مرة وأخرى.
const tabsBottom = () => {
  const nav = document.querySelector('nav[role=tablist]');
  return nav ? nav.getBoundingClientRect().bottom : 0;
};

export function useReadPos({ lessonId, tab, S, patch, toast }) {
  const Sref = useRef(S);
  Sref.current = S;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  // ---- الحفظ: بعد 500ms من آخر تمرير داخل تبويب النص ----
  useEffect(() => {
    if (!lessonId || tab !== 'read') return;
    let timer = 0;
    const save = () => {
      const nb = tabsBottom();
      const sn = [...document.querySelectorAll('#text .sn')].find((e) => e.getBoundingClientRect().bottom > nb + 8);
      if (!sn) return;
      const y = Math.round(window.scrollY);
      const max = document.documentElement.scrollHeight - innerHeight;
      const had = !!(Sref.current.rp && Sref.current.rp[lessonId]);
      if (y < 250 || y > max - 250) {
        // أول النص أو آخره: لا حاجة لتذكّر المكان
        if (had)
          patch((s) => {
            const rp = { ...(s.rp || {}) };
            delete rp[lessonId];
            return { rp };
          });
        return;
      }
      const e = { i: +sn.dataset.i, o: Math.round(sn.getBoundingClientRect().top - nb), y, t: Date.now() };
      patch((s) => ({ rp: { ...(s.rp || {}), [lessonId]: e } }));
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [lessonId, tab]); // eslint-disable-line

  // ---- الاستعادة: عند فتح الدرس ----
  useEffect(() => {
    if (!lessonId) return;
    const e = Sref.current.rp && Sref.current.rp[lessonId];
    if (!e) return;
    let dead = false;
    const timers = [];
    const cancel = () => {
      dead = true;
      timers.forEach(clearTimeout);
    };
    const opts = { once: true, passive: true };
    ['touchstart', 'wheel', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, cancel, opts));
    // الخط والهيرو يُقاسان بعد التحميل، فنصحّح الموضع عدة مرات بحسب الجملة نفسها
    [150, 500, 1100, 1800].forEach((ms, k) =>
      timers.push(
        setTimeout(() => {
          if (dead || tabRef.current !== 'read') return;
          if (!document.querySelector('section#read.on')) return;
          if (k === 0) {
            window.scrollTo(0, e.y);
            toast('تابعنا من حيث توقفت');
          }
          const el = document.querySelector(`#text .sn[data-i="${e.i}"]`);
          if (!el) return;
          const d = el.getBoundingClientRect().top - (tabsBottom() + e.o);
          if (Math.abs(d) > 6) window.scrollBy(0, d);
        }, ms)
      )
    );
    return () => {
      cancel();
      ['touchstart', 'wheel', 'pointerdown', 'keydown'].forEach((ev) => window.removeEventListener(ev, cancel));
    };
  }, [lessonId]); // eslint-disable-line
}
