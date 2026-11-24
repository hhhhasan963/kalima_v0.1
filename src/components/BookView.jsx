import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import Hero, { HeroText } from './Hero.jsx';
import { Ico } from './Icons.jsx';

// صفحة كتاب: قائمة وحداته ودروس المراجعة / اختبارات التقدّم
export default function BookView({ book, onOpen, onLocked, onSoon }) {
  const { S } = useStore();
  const { lessonsOf, gradeInfo } = useLessons();
  if (!book) return null;
  const ls = lessonsOf(book.id);
  const bs = S.bs || {};
  const done = ls.filter((l) => bs[l.id] > 0).length;

  return (
    <div id="bkv" className="vw">
      <Hero title={book.title} sig={book.id + ':' + done + ':' + ls.length}>
        <HeroText
          badge={gradeInfo ? gradeInfo.title : ''}
          title={book.title}
          sub={book.titleAr}
          meta={[ls.length + ' درساً', done + ' مكتمل']}
        />
      </Hero>
      <p className="sec">{book.listTitle}</p>
      {ls.length === 0 && <div className="card">لا توجد دروس في هذا الكتاب بعد.</div>}
      {ls.map((l, i) => {
        const special = l.kind !== 'unit';
        const b = bs[l.id] || 0;
        const locked = l.locked;
        return (
          <button
            key={l.id}
            className={'un on' + (locked ? ' lock' : '')}
            style={{ '--i': Math.min(i, 8) }}
            onClick={() => (locked ? (l.access === 'closed' ? onSoon() : onLocked()) : onOpen(l.id))}
          >
            <span className={'n' + (special ? ' rv' : '')}>{l.short}</span>
            <div className="t">
              <b>{l.t}</b>
              <span>
                {special ? l.label + ' · ' : ''}
                {l.a}
              </span>
              {!locked && (
                <div className="bar"><i style={{ width: Math.round((b / Math.max(1, l.Q.length)) * 100) + '%' }} /></div>
              )}
            </div>
            <span className="go">{locked ? <><Ico n="lock" /> {l.access === 'closed' ? 'قريباً' : 'مقفل'}</> : (b ? 'تابع' : 'ابدأ') + ' ›'}</span>
          </button>
        );
      })}
    </div>
  );
}
