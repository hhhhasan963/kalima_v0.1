import { useEffect, useRef } from 'react';

// السحب من الحافة اليمنى نحو اليسار = رجوع (واجهة RTL).
// onBack() يُستدعى فقط؛ القرار (إغلاق نافذة التمرين أو الرجوع صفحة) عند المستدعي.
export function useEdgeBack(onBack) {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    let st = null;
    const start = (e) => {
      const t = e.touches[0];
      st = e.touches.length === 1 && t.clientX > innerWidth - 22 ? { x: t.clientX, y: t.clientY } : null;
    };
    const end = (e) => {
      if (!st) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - st.x;
      const dy = t.clientY - st.y;
      st = null;
      if (dx > -70 || Math.abs(dy) > 60) return;
      cb.current();
    };
    window.addEventListener('touchstart', start, { capture: true, passive: true });
    window.addEventListener('touchend', end, { capture: true, passive: true });
    window.addEventListener('touchcancel', () => (st = null), { capture: true, passive: true });
    return () => {
      window.removeEventListener('touchstart', start, { capture: true });
      window.removeEventListener('touchend', end, { capture: true });
    };
  }, []);
}
