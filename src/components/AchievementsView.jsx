import { useLessons } from '../hooks/useLessons.jsx';
import { useStore } from '../hooks/useStore.jsx';
import Hero, { HeroText } from './Hero.jsx';
import { Ico } from './Icons.jsx';

export default function AchievementsView() {
  const { S, saved } = useStore();
  const { lessons } = useLessons();
  const bs = S.bs || {};
  const any = Object.keys(bs).some((k) => bs[k] > 0);
  const full = lessons.some((l) => l.Q.length > 0 && bs[l.id] === l.Q.length);
  const A = [
    ['spark', 'أول خطوة', 'أنهِ أول تمرين', any],
    ['bulb', 'أول كلمة', 'احفظ كلمة', saved.length >= 1],
    ['book', '10 كلمات', 'احفظ 10 كلمات', saved.length >= 10],
    ['fire', '3 أيام', 'ادرس 3 أيام متتالية', S.st >= 3],
    ['star', '100 نقطة', 'اجمع 100 XP', S.xp >= 100],
    ['trophy', 'علامة كاملة', 'جاوب كل أسئلة درس صح', full],
  ];
  const n = A.filter((a) => a[3]).length;
  return (
    <div id="acv" className="vw">
      <Hero title="الإنجازات">
        <HeroText badge="جوائزك" title="الإنجازات" sub="اجمع الشارات كلما تقدّمت" />
      </Hero>
      <p className="tip">فتحت {n} من {A.length} إنجازات</p>
      <div className="gr">
        {A.map((a, i) => (
          <div key={i} className={'bd' + (a[3] ? ' on' : '')} style={{ '--i': i }}>
            <span><Ico n={a[0]} /></span>
            <b>{a[1]}</b>
            <small>{a[2]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
