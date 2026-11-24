import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Ico } from './Icons.jsx';

// يوفّر لبطاقات العنوان: زر الرجوع والوضع المظلم والمسار الحالي
export const UiContext = createContext({ goBack() {}, go() {}, leaveGuard: null, dark: false, toggleTheme() {}, v: 'home', nav: 0 });

// اسم الدرس الطويل يظهر كـ "Unit N" عندما تتصغّر البطاقة
export const shortT = (t, label) => (t.length > 20 ? label : t);

export function HeroText({ badge, title, sub, meta }) {
  return (
    <>
      {badge && <span className="badge">{badge}</span>}
      <h1>{title}</h1>
      <p>{sub}</p>
      {meta && (
        <div className="meta">
          {meta.map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
      )}
    </>
  );
}

// بطاقة علوية تتصغّر مع التمرير حتى ارتفاع 52px وتثبت بأعلى الشاشة
export default function Hero({ tag: Tag = 'div', back = true, title, sig = '', children }) {
  const ref = useRef(null);
  const HH = useRef(0);
  const { goBack, dark, toggleTheme, v, nav } = useContext(UiContext);

  const upd = useCallback(() => {
    const h = ref.current;
    if (!h || HH.current < 80 || !h.offsetParent) return;
    const y = Math.max(0, window.scrollY);
    const cur = Math.max(52, HH.current - y);
    const p = Math.min(1, y / (HH.current - 52));
    const o = Math.max(0, (p - 0.5) / 0.5);
    const lg = h.querySelector('.lg');
    h.style.height = cur + 'px';
    h.style.marginBottom = HH.current - cur + 16 + 'px';
    h.querySelector('.hbody').style.opacity = Math.max(0, 1 - p * 1.7);
    h.querySelector('.ht').style.opacity = o;
    if (lg) lg.style.opacity = o;
    h.style.borderRadius = `0 0 ${24 * (1 - p)}px ${24 * (1 - p)}px`;
    h.style.setProperty('--ln', 1 - p);
  }, []);

  const measure = useCallback(() => {
    const h = ref.current;
    if (!h || !h.offsetParent) return;
    h.style.height = 'auto';
    h.style.marginBottom = '';
    HH.current = h.offsetHeight;
    upd();
  }, [upd]);

  // إعادة القياس عند تغيّر الصفحة أو المحتوى
  useEffect(() => {
    const t1 = setTimeout(measure, 0);
    const t2 = setTimeout(measure, 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [v, nav, sig, measure]);

  useEffect(() => {
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', upd);
      window.removeEventListener('resize', measure);
    };
  }, [upd, measure]);

  return (
    <Tag ref={ref} className="hero2">
      <div className="hbar">
        <span className="hs">
          {back ? (
            <button className="chip" aria-label="رجوع" onClick={goBack}>
              <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <span className="lg">ك</span>
          )}
        </span>
        <span className="ht">{title}</span>
        <button className="chip thm" aria-label="الوضع المظلم" onClick={toggleTheme}>
          <Ico n={dark ? 'sun' : 'moon'} />
        </button>
      </div>
      <div className="hbody">{children}</div>
    </Tag>
  );
}
