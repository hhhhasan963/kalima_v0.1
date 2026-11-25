import { useEffect } from 'react';
import { useSpeech } from '../hooks/useSpeech.jsx';

// مشغّل عائم أثناء قراءة النص: إيقاف مؤقت/متابعة، إيقاف، وشريط تقدّم. Esc يوقف القراءة.
export default function ReadPlayer() {
  const sp = useSpeech();
  const r = sp.rp;

  useEffect(() => {
    if (!r) return;
    const f = (e) => e.key === 'Escape' && sp.stop();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [!!r]); // eslint-disable-line

  const n = r ? r.end - r.from + 1 : 0;
  const cur = r ? r.i - r.from + 1 : 0;
  return (
    <div id="rpl" className={r ? 'on' : ''} role="group" aria-label="مشغّل القراءة">
      <button id="rpP" aria-label={r && r.paused ? 'متابعة' : 'إيقاف مؤقت'} onClick={() => (r && r.paused ? sp.resume() : sp.pause())}>
        {r && r.paused ? (
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
        )}
      </button>
      <div className="rpi">
        <span>{cur}/{n}</span>
        <span className="rpb"><i style={{ width: (n ? (cur / n) * 100 : 0) + '%' }} /></span>
      </div>
      <button id="rpS" aria-label="إيقاف" onClick={sp.stop}>
        <svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
      </button>
    </div>
  );
}
