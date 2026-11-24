import { useEffect, useRef } from 'react';

// السحب الأفقي بين التبويبات مع معاينة التبويب المجاور أثناء السحب
// (نفس خوارزمية النسخة الأصلية: تحريك مباشر للعناصر دون إعادة رسم React)
export function useTabSwipe(tabs, onChange) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let DG = null;
    let BUSY = false;
    const $ = (id) => document.getElementById(id);
    const clr = (el) => {
      el.classList.remove('peek');
      el.style.transform = '';
      el.style.opacity = '';
      el.style.transition = '';
    };

    const start = () => {
      const cs = document.querySelector('section.on');
      DG.cs = cs;
      DG.ci = tabs.indexOf(cs.id);
      DG.W = document.querySelector('main').clientWidth;
      DG.nb = null;
      DG.dx = 0;
      DG.sg = 1;
      document.querySelector('main').classList.add('na');
    };

    const move = (dx) => {
      const sg = dx > 0 ? 1 : -1;
      const ti = DG.ci + sg;
      const nb = tabs[ti] ? $(tabs[ti]) : null;
      const W = DG.W;
      if (DG.nb !== nb) {
        if (DG.nb) clr(DG.nb);
        DG.nb = nb;
        if (nb) nb.classList.add('peek');
      }
      DG.dx = dx;
      DG.sg = sg;
      const x = nb ? dx : dx * 0.3;
      DG.cs.style.transition = 'none';
      DG.cs.style.transform = 'translateX(' + x + 'px)';
      DG.cs.style.opacity = 1 - Math.min(0.55, (Math.abs(x) / W) * 0.7);
      if (nb) {
        nb.style.transition = 'none';
        nb.style.transform = 'translateX(' + (dx - sg * W) + 'px)';
        nb.style.opacity = 0.45 + Math.min(0.55, (Math.abs(dx) / W) * 0.7);
      }
    };

    const end = (cancelled) => {
      const { dx, W, sg, nb, cs } = DG;
      const dt = Date.now() - DG.t;
      const v = Math.abs(dx) / Math.max(dt, 1);
      const m = document.querySelector('main');
      const go = !cancelled && nb && (Math.abs(dx) > W * 0.28 || (v > 0.5 && Math.abs(dx) > 40));
      const tr = 'transform .26s cubic-bezier(.2,.8,.3,1),opacity .26s';
      BUSY = true;
      cs.style.transition = tr;
      if (nb) nb.style.transition = tr;
      if (go) {
        cs.style.transform = 'translateX(' + sg * W + 'px)';
        cs.style.opacity = 0;
        nb.style.transform = 'translateX(0)';
        nb.style.opacity = 1;
        setTimeout(() => {
          const id = nb.id;
          clr(cs);
          clr(nb);
          cb.current(id);
          setTimeout(() => {
            m.classList.remove('na');
            BUSY = false;
          }, 60);
        }, 270);
      } else {
        cs.style.transform = '';
        cs.style.opacity = '';
        if (nb) {
          nb.style.transform = 'translateX(' + -sg * W + 'px)';
          nb.style.opacity = 0;
        }
        setTimeout(() => {
          clr(cs);
          if (nb) clr(nb);
          m.classList.remove('na');
          BUSY = false;
        }, 270);
      }
    };

    const onStart = (e) => {
      if (BUSY || document.body.dataset.v !== 'lesson' || $('lp') || e.touches.length !== 1) {
        DG = null;
        return;
      }
      const t = e.touches[0];
      if (t.clientX > innerWidth - 24) {
        DG = null; // سحبة الحافة اليمنى = رجوع (useEdgeBack)
        return;
      }
      DG = { x: t.clientX, y: t.clientY, t: Date.now(), m: null };
    };
    const onMove = (e) => {
      if (!DG) return;
      const t = e.touches[0];
      const dx = t.clientX - DG.x;
      const dy = t.clientY - DG.y;
      if (DG.m === null) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          DG.m = 'h';
          start();
        } else if (Math.abs(dy) > 10) DG.m = 'v';
        else return;
      }
      if (DG.m === 'h') move(dx);
    };
    const onEnd = () => {
      if (DG && DG.m === 'h') end(false);
      DG = null;
    };
    const onCancel = () => {
      if (DG && DG.m === 'h') end(true);
      DG = null;
    };

    const o = { capture: true, passive: true };
    window.addEventListener('touchstart', onStart, o);
    window.addEventListener('touchmove', onMove, o);
    window.addEventListener('touchend', onEnd, true);
    window.addEventListener('touchcancel', onCancel, true);
    return () => {
      window.removeEventListener('touchstart', onStart, o);
      window.removeEventListener('touchmove', onMove, o);
      window.removeEventListener('touchend', onEnd, true);
      window.removeEventListener('touchcancel', onCancel, true);
    };
  }, [tabs]);
}
