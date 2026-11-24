import { useStore } from '../hooks/useStore.jsx';
import { Ico } from './Icons.jsx';

export default function QuizTab({ L, onStart }) {
  const { S } = useStore();
  const n = L.Q.length;
  const best = (S.bs || {})[L.id];
  return (
    <div className="card home qin">
      <div className="hi"><Ico n="pen" /></div>
      <h3>تمرين الدرس</h3>
      <p className="mu">اختبر فهمك للنص</p>
      <div className="hs">
        <span>{n} أسئلة</span>
        <span>+{n * 10} XP</span>
        {best ? <span>أفضل نتيجة {best}/{n}</span> : null}
      </div>
      <button className="cb" id="go" onClick={onStart}>ابدأ التمرين</button>
    </div>
  );
}
