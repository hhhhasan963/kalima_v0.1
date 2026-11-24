import { useState } from 'react';
import { useStore } from '../hooks/useStore.jsx';
import { Ico } from './Icons.jsx';

// شاشات الترحيب للطالب الجديد: ترحيب ← الاسم ← جاهز
export default function Onboarding() {
  const { patch } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const finish = (withName) => patch({ ob: 1, ...(withName && name.trim() ? { name: name.trim() } : {}) });

  return (
    <div className="ob" role="dialog" aria-modal="true">
      <div className="ob-box" key={step}>
        {step === 0 && (
          <>
            <div className="logo">ك</div>
            <h1>أهلاً بك في «كلمة»</h1>
            <p>تعلّم الإنكليزية كلمة بكلمة: اقرأ، استمع، احفظ الكلمات، وجرّب نفسك.</p>
            <button className="cb" onClick={() => setStep(1)}>هيا نبدأ</button>
          </>
        )}
        {step === 1 && (
          <>
            <div className="ob-ic"><Ico n="user" /></div>
            <h1>ما اسمك؟</h1>
            <p>سنناديك به داخل التطبيق. يمكنك تغييره لاحقاً من الملف الشخصي.</p>
            <input
              className="ob-in"
              maxLength={20}
              autoFocus
              placeholder="اكتب اسمك"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
            />
            <button className="cb" onClick={() => setStep(2)}>{name.trim() ? 'التالي' : 'تخطّي'}</button>
          </>
        )}
        {step === 2 && (
          <>
            <div className="ob-ic"><Ico n="spark" /></div>
            <h1>{name.trim() ? 'جاهز يا ' + name.trim() + '!' : 'كل شيء جاهز!'}</h1>
            <p>اختر صفّك، وافتح أول درس. اضغط أي كلمة في النص لترى معناها وتحفظها.</p>
            <button className="cb" onClick={() => finish(true)}>ابدأ</button>
          </>
        )}
        <div className="ob-dots" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}
