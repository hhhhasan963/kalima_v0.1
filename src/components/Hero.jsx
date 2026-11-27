import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Ico } from './Icons.jsx';
import logo from '../assets/logo.svg';

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

// موضع عنصر داخل البطاقة (نسبةً لها) بسلسلة offsetParent
const rel = (el, top) => {
  let x = 0;
  let y = 0;
  while (el && el !== top) {
    x += el.offsetLeft;
    y += el.offsetTop;
    el = el.offsetParent;
  }
  return { x, y };
};

const BAR_LOGO = 44; // حجم الشعار في الشريط المصغّر

// بطاقة علوية «عائمة» (هامش 12px وزوايا مدوّرة) تتحوّل مع التمرير إلى شريط بعرض الشاشة وارتفاع 52px مثبّت أعلى الصفحة،
// والعنوان نفسه ينتقل من مكانه الكبير إلى الشريط (منقول من نسخة PWA).
export default function Hero({ tag: Tag = 'div', back = true, title, sig = '', children }) {
  const ref = useRef(null);
  const htText = useRef(null);
  const HH = useRef(0); // الارتفاع الكامل
  const HM = useRef({ t: 0, l: 0, r: 0 }); // هوامش البطاقة الأصلية من CSS
  const HS = useRef(null); // موضع العنوان الكبير
  const FT = useRef(0);
  const HL = useRef(null); // هندسة الشعار: من مكانه الكبير إلى خانته في الشريط
  const { goBack, dark, toggleTheme, v, nav } = useContext(UiContext);

  // q = مقدار «الطفو»: 12px عند الأعلى ثم 0 عند التصاقها بالحافة. top يضيف شريط الحالة (--sat)
  const geo = (h, p) => {
    const hd = h.tagName === 'HEADER';
    const q = 12 * (1 - p);
    h.style.top = `calc(var(--sat, 0px) + ${q}px)`;
    if (hd) {
      h.style.width = `calc(100% - ${2 * q}px)`;
      h.style.marginTop = q + 'px';
    } else {
      h.style.marginTop = HM.current.t + q + 'px';
      h.style.marginLeft = HM.current.l + q + 'px';
      h.style.marginRight = HM.current.r + q + 'px';
    }
    return hd ? q : HM.current.t + q;
  };

  const upd = useCallback(() => {
    const h = ref.current;
    if (!h || HH.current < 80 || !h.offsetParent) return;
    const y = Math.max(0, window.scrollY);
    const cur = Math.max(52, HH.current - y);
    const p = Math.min(1, y / (HH.current - 52));
    const mt = geo(h, p);
    const W = h.clientWidth;
    h.style.height = cur + 'px';
    h.style.marginBottom = FT.current - mt - cur + 'px';
    const tr = 24 * (1 - p);
    const br = 24 - 6 * p;
    h.style.borderRadius = `${tr}px ${tr}px ${br}px ${br}px`;
    h.style.boxShadow = p > 0.02 ? `0 8px 18px -10px rgba(0,0,0,${0.55 * p})` : 'none';
    h.style.setProperty('--ln', 1 - p);
    const f = Math.max(0, 1 - p * 2.2);
    h.querySelectorAll('.hbody .badge,.hbody p,.hbody .meta,.hbody .logo').forEach((x) => (x.style.opacity = f));
    // الشعار نفسه يتحرّك ويصغر من مكانه الكبير إلى خانته في الشريط (لا يختفي ويظهر في مكان آخر)
    const hl = h.querySelector('.hl');
    const L0 = HL.current;
    if (hl && L0) {
      const s = L0.s + (BAR_LOGO - L0.s) * p;
      hl.style.width = hl.style.height = s + 'px';
      hl.style.left = L0.x + (L0.tx - L0.x) * p + 'px';
      hl.style.top = L0.y + (L0.ty - L0.y) * p + 'px';
      hl.style.opacity = 1;
    }
    const ht = h.querySelector('.ht');
    const S0 = HS.current;
    if (ht && S0) {
      // العنوان ينزلق من مكانه إلى منتصف الشريط ويصغر خطه إلى 17px
      const w = S0.w + (W - 112 - S0.w) * p;
      const hh = S0.h + (52 - S0.h) * p;
      const cx = W / 2 + S0.cx * (1 - p);
      const tp = S0.t * (1 - p);
      ht.style.opacity = 1;
      ht.style.left = cx - w / 2 + 'px';
      ht.style.top = tp + 'px';
      ht.style.width = w + 'px';
      ht.style.height = hh + 'px';
      ht.style.fontSize = S0.fs + (17 - S0.fs) * p + 'px';
      const sp = ht.firstChild;
      if (sp && sp.style) sp.style.webkitLineClamp = p > 0.6 ? 2 : 8;
    }
  }, []); // eslint-disable-line

  const measure = useCallback(() => {
    const h = ref.current;
    if (!h || !h.offsetParent) return;
    const hd = h.tagName === 'HEADER';
    h.style.cssText = '';
    const cs = getComputedStyle(h);
    HM.current = { t: parseFloat(cs.marginTop) || 0, l: parseFloat(cs.marginLeft) || 0, r: parseFloat(cs.marginRight) || 0 };
    const t = h.querySelector('.hbody h1');
    if (t) t.style.visibility = 'visible';
    geo(h, 0);
    h.style.height = 'auto';
    h.style.marginBottom = '0px';
    HH.current = h.offsetHeight;
    h.dataset.hh = HH.current; // يقرأها App لتثبيت التمرير عند تبديل التبويب
    FT.current = (hd ? 12 : HM.current.t + 12) + HH.current + 16;
    const ht = h.querySelector('.ht');
    if (t && ht && htText.current) {
      const c = getComputedStyle(t);
      const o = rel(t, h);
      const W0 = h.clientWidth;
      const fs = parseFloat(c.fontSize);
      const lh = parseFloat(c.lineHeight);
      HS.current = { cx: o.x + t.offsetWidth / 2 - W0 / 2, t: o.y, w: t.offsetWidth, h: t.offsetHeight, fs };
      htText.current.textContent = t.textContent;
      ht.style.direction = c.direction;
      ht.style.fontFamily = c.fontFamily;
      ht.style.fontWeight = c.fontWeight;
      ht.style.color = c.color;
      ht.style.textShadow = c.textShadow;
      ht.style.lineHeight = isNaN(lh) ? '1.3' : (lh / fs).toFixed(3);
      t.style.visibility = 'hidden'; // العنوان الكبير يحلّ محله .ht المتحرّك
    }
    const lgEl = h.querySelector('.hbody .logo');
    const hl = h.querySelector('.hl');
    if (hl && lgEl) {
      const o = rel(lgEl, h);
      const hs = h.querySelector('.hs');
      const W1 = h.clientWidth;
      // الخانة الهدف: بداية الشريط (يمين في RTL)
      const tx = hs && hs.offsetWidth > 8 ? rel(hs, h).x + hs.offsetWidth / 2 - BAR_LOGO / 2 : W1 - 12 - BAR_LOGO;
      HL.current = { x: o.x, y: o.y, s: lgEl.offsetWidth, tx, ty: (52 - BAR_LOGO) / 2 };
      lgEl.style.visibility = 'hidden'; // الشعار الكبير يحلّ محلّه .hl المتحرّك
      hl.style.display = 'block';
    } else if (hl) {
      HL.current = null;
      hl.style.display = 'none';
    }
    upd();
  }, [upd]); // eslint-disable-line

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
          ) : null}
        </span>
        <span className="ht" aria-label={title}>
          <span ref={htText} />
        </span>
        <button className="chip thm" aria-label="الوضع المظلم" onClick={toggleTheme}>
          <Ico n={dark ? 'sun' : 'moon'} />
        </button>
      </div>
      <div className="hbody">{children}</div>
      {!back && (
        <span className="hl" aria-hidden="true">
          <img src={logo} alt="" />
        </span>
      )}
    </Tag>
  );
}
